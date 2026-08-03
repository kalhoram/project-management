"""System-admin business logic: cross-tenant dashboards, users, workspaces,
plans, payments, logs, report series and platform settings.

Every function here is meant to be gated behind `require_system_admin`
(`app.dependencies.auth`) at the route layer -- it deliberately ignores
workspace membership and reads across all tenants.

Feature flags persist to `FeatureFlag` rows (keyed by `key`) and maintenance
mode persists to `MaintenanceState`; `support_email`/`max_upload_mb` have no
backing column today so they're read from `Settings` (env) and echoed back on
patch without being durably stored -- documented via the docstring on
`update_settings`.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import NotFoundError
from app.models.billing import Plan, Subscription
from app.models.project import Project
from app.models.system import FeatureFlag, MaintenanceState, SystemLog
from app.models.task import Task
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.schemas.admin import (
    AdminDashboard,
    AdminReports,
    AdminSettingsFull,
    AdminSettingsFullUpdate,
    AdminUserDetail,
    AdminWorkspaceDetail,
    FeatureFlagsOut,
    ReportSeriesPoint,
    SystemLogOut,
)
from app.schemas.billing import PaymentOut, PlanCreate, PlanUpdate
from app.schemas.project import ProjectOut
from app.schemas.user import UserOut
from app.schemas.workspace import WorkspaceOut
from app.services import billing_service
from app.services.project_service import _to_project_out

_FLAG_DEFAULTS: dict[str, bool] = {
    "ai_assist": False,
    "advanced_reports": True,
    "sso": False,
    "beta_kanban": True,
    "export_pdf": True,
}

_PERSIAN_MONTHS = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
]


async def get_dashboard(db: AsyncSession) -> AdminDashboard:
    now = datetime.now(UTC)
    thirty_days_ago = now - timedelta(days=30)

    total_workspaces = (await db.execute(select(func.count(Workspace.id)))).scalar_one()
    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
    total_projects = (await db.execute(select(func.count(Project.id)))).scalar_one()
    total_tasks = (await db.execute(select(func.count(Task.id)))).scalar_one()
    active_subscriptions = (
        await db.execute(select(func.count(Subscription.id)).where(Subscription.status == "active"))
    ).scalar_one()
    mrr_stmt = select(func.coalesce(func.sum(Plan.price_monthly), 0)).select_from(Subscription).join(
        Plan, Plan.id == Subscription.plan_id
    ).where(Subscription.status == "active")
    mrr = float((await db.execute(mrr_stmt)).scalar_one())
    new_users = (
        await db.execute(select(func.count(User.id)).where(User.created_at >= thirty_days_ago))
    ).scalar_one()
    new_workspaces = (
        await db.execute(select(func.count(Workspace.id)).where(Workspace.created_at >= thirty_days_ago))
    ).scalar_one()

    from app.models.file import Attachment

    storage_bytes = (
        await db.execute(select(func.coalesce(func.sum(Attachment.size_bytes), 0)).where(Attachment.deleted_at.is_(None)))
    ).scalar_one()

    return AdminDashboard(
        total_workspaces=total_workspaces,
        total_users=total_users,
        total_projects=total_projects,
        total_tasks=total_tasks,
        active_subscriptions=active_subscriptions,
        mrr=mrr,
        new_users_last_30_days=new_users,
        new_workspaces_last_30_days=new_workspaces,
        storage_used_gb=round(storage_bytes / 1_000_000_000, 3),
    )


async def list_users(db: AsyncSession, *, q: str | None = None, limit: int = 200) -> list[UserOut]:
    stmt = select(User).order_by(User.created_at.desc()).limit(limit)
    if q:
        pattern = f"%{q}%"
        stmt = select(User).where((User.name.ilike(pattern)) | (User.email.ilike(pattern))).limit(limit)
    users = (await db.execute(stmt)).scalars().all()
    return [UserOut.model_validate(u) for u in users]


async def get_user_detail(db: AsyncSession, user_id: UUID) -> AdminUserDetail:
    user = await db.get(User, user_id)
    if user is None:
        raise NotFoundError("کاربر یافت نشد.")

    ws_stmt = (
        select(Workspace)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == user_id)
    )
    workspaces = (await db.execute(ws_stmt)).scalars().all()

    projects_stmt = select(Project).where(Project.owner_id == user_id)
    projects = (await db.execute(projects_stmt)).scalars().all()

    return AdminUserDetail(
        user=UserOut.model_validate(user),
        workspaces=[WorkspaceOut.model_validate(w) for w in workspaces],
        projects=[await _to_project_out(db, p) for p in projects],
    )


async def list_workspaces(db: AsyncSession, *, limit: int = 200) -> list[WorkspaceOut]:
    stmt = select(Workspace).order_by(Workspace.created_at.desc()).limit(limit)
    workspaces = (await db.execute(stmt)).scalars().all()
    return [WorkspaceOut.model_validate(w) for w in workspaces]


async def get_workspace_detail(db: AsyncSession, workspace_id: UUID) -> AdminWorkspaceDetail:
    workspace = await db.get(Workspace, workspace_id)
    if workspace is None:
        raise NotFoundError("فضای کاری یافت نشد.")

    projects_stmt = select(Project).where(Project.workspace_id == workspace_id)
    projects = (await db.execute(projects_stmt)).scalars().all()

    members_stmt = (
        select(User)
        .join(WorkspaceMember, WorkspaceMember.user_id == User.id)
        .where(WorkspaceMember.workspace_id == workspace_id)
    )
    members = (await db.execute(members_stmt)).scalars().all()

    return AdminWorkspaceDetail(
        workspace=WorkspaceOut.model_validate(workspace),
        projects=[await _to_project_out(db, p) for p in projects],
        members=[UserOut.model_validate(m) for m in members],
    )


async def list_all_projects(db: AsyncSession, *, limit: int = 500) -> list[ProjectOut]:
    stmt = select(Project).order_by(Project.created_at.desc()).limit(limit)
    projects = (await db.execute(stmt)).scalars().all()
    return [await _to_project_out(db, p) for p in projects]


async def list_plans(db: AsyncSession):
    return await billing_service.list_plans(db, include_inactive=True)


async def create_plan(db: AsyncSession, data: PlanCreate):
    return await billing_service.create_plan(db, data)


async def update_plan(db: AsyncSession, plan_id: UUID, data: PlanUpdate):
    return await billing_service.update_plan(db, plan_id, data)


async def delete_plan(db: AsyncSession, plan_id: UUID) -> None:
    await billing_service.delete_plan(db, plan_id)


async def list_payments(db: AsyncSession) -> list[PaymentOut]:
    return await billing_service.list_payments(db)


async def list_logs(
    db: AsyncSession, *, severity: str | None = None, limit: int = 200
) -> list[SystemLogOut]:
    stmt = select(SystemLog)
    if severity:
        stmt = stmt.where(SystemLog.severity == severity)
    stmt = stmt.order_by(SystemLog.created_at.desc()).limit(limit)
    logs = (await db.execute(stmt)).scalars().all()
    return [SystemLogOut.model_validate(log) for log in logs]


async def get_reports(db: AsyncSession, *, months: int = 6) -> AdminReports:
    now = datetime.now(UTC)
    active_users: list[ReportSeriesPoint] = []
    workspace_growth: list[ReportSeriesPoint] = []

    for i in range(months - 1, -1, -1):
        month_end = (now.replace(day=1) - timedelta(days=1) * (30 * i)) if i else now
        start = datetime(month_end.year, month_end.month, 1, tzinfo=UTC)
        if month_end.month == 12:
            end = datetime(month_end.year + 1, 1, 1, tzinfo=UTC)
        else:
            end = datetime(month_end.year, month_end.month + 1, 1, tzinfo=UTC)

        label = _PERSIAN_MONTHS[start.month - 1]

        active_count = (
            await db.execute(
                select(func.count(func.distinct(User.id))).where(
                    User.last_active_at.is_not(None), User.last_active_at >= start, User.last_active_at < end
                )
            )
        ).scalar_one()
        active_users.append(ReportSeriesPoint(label=label, count=active_count))

        workspace_count = (
            await db.execute(select(func.count(Workspace.id)).where(Workspace.created_at < end))
        ).scalar_one()
        workspace_growth.append(ReportSeriesPoint(label=label, count=workspace_count))

    errors: list[ReportSeriesPoint] = []
    weekday_labels = ["دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه", "یکشنبه"]
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = (
            await db.execute(
                select(func.count(SystemLog.id)).where(
                    SystemLog.severity.in_(["error", "critical"]),
                    SystemLog.created_at >= day_start,
                    SystemLog.created_at < day_end,
                )
            )
        ).scalar_one()
        errors.append(ReportSeriesPoint(label=weekday_labels[day_start.weekday()], count=count))

    return AdminReports(active_users=active_users, workspace_growth=workspace_growth, errors=errors)


async def _get_feature_flags(db: AsyncSession) -> FeatureFlagsOut:
    stmt = select(FeatureFlag).where(FeatureFlag.key.in_(list(_FLAG_DEFAULTS)))
    rows = {f.key: f.is_enabled for f in (await db.execute(stmt)).scalars().all()}
    values = {key: rows.get(key, default) for key, default in _FLAG_DEFAULTS.items()}
    return FeatureFlagsOut(**values)


async def _get_maintenance_state(db: AsyncSession) -> MaintenanceState | None:
    stmt = select(MaintenanceState).order_by(MaintenanceState.created_at.desc()).limit(1)
    return (await db.execute(stmt)).scalars().first()


async def get_platform_settings(db: AsyncSession) -> AdminSettingsFull:
    settings = get_settings()
    maintenance = await _get_maintenance_state(db)
    return AdminSettingsFull(
        maintenance_mode=maintenance.is_active if maintenance else settings.maintenance_mode,
        feature_flags=await _get_feature_flags(db),
        support_email=settings.smtp_from,
        max_upload_mb=settings.max_upload_mb,
    )


async def update_platform_settings(
    db: AsyncSession, actor_id: UUID | None, data: AdminSettingsFullUpdate
) -> AdminSettingsFull:
    """Persists feature flags + maintenance mode; `support_email`/`max_upload_mb`
    have no DB column yet, so they're accepted and echoed back for the
    frontend to display but require an env change to actually take effect.
    """
    if data.feature_flags is not None:
        for key, enabled in data.feature_flags.items():
            if key not in _FLAG_DEFAULTS:
                continue
            stmt = select(FeatureFlag).where(FeatureFlag.key == key)
            flag = (await db.execute(stmt)).scalar_one_or_none()
            if flag is None:
                flag = FeatureFlag(key=key, name=key.replace("_", " ").title(), is_enabled=enabled)
                db.add(flag)
            else:
                flag.is_enabled = enabled

    if data.maintenance_mode is not None:
        maintenance = await _get_maintenance_state(db)
        if maintenance is None:
            maintenance = MaintenanceState(is_active=data.maintenance_mode, created_by_id=actor_id)
            db.add(maintenance)
        else:
            maintenance.is_active = data.maintenance_mode
        if data.maintenance_message is not None:
            maintenance.message = data.maintenance_message

    await db.flush()

    result = await get_platform_settings(db)
    if data.support_email is not None:
        result = result.model_copy(update={"support_email": data.support_email})
    if data.max_upload_mb is not None:
        result = result.model_copy(update={"max_upload_mb": data.max_upload_mb})
    return result
