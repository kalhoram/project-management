"""Saved filter CRUD — workspace/project scoped saved views."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, PermissionDeniedError
from app.models.activity import SavedFilter
from app.models.project import Project
from app.models.workspace import WorkspaceMember
from app.schemas.saved_filter import SavedFilterCreate, SavedFilterOut, SavedFilterUpdate


async def _ensure_workspace_access(db: AsyncSession, user_id: UUID, workspace_id: UUID) -> WorkspaceMember:
    stmt = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_id,
        WorkspaceMember.is_active.is_(True),
    )
    membership = (await db.execute(stmt)).scalar_one_or_none()
    if membership is None:
        raise NotFoundError("فضای کاری یافت نشد یا شما عضو آن نیستید.")
    return membership


async def _ensure_project_in_workspace(db: AsyncSession, project_id: UUID, workspace_id: UUID | None) -> Project:
    project = await db.get(Project, project_id)
    if project is None:
        raise NotFoundError("پروژه یافت نشد.")
    if workspace_id is not None and project.workspace_id != workspace_id:
        raise NotFoundError("پروژه در این فضای کاری یافت نشد.")
    return project


def _to_out(record: SavedFilter) -> SavedFilterOut:
    return SavedFilterOut(
        id=record.id,
        name=record.name,
        scope=record.scope,
        workspace_id=record.workspace_id,
        project_id=record.project_id,
        owner_id=record.owner_id,
        conditions=record.conditions or [],
        visibility=record.visibility,
        last_used_at=record.last_used_at,
        is_default=record.is_default,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


async def list_saved_filters(
    db: AsyncSession,
    user_id: UUID,
    *,
    workspace_id: UUID | None = None,
    project_id: UUID | None = None,
    scope: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[SavedFilterOut], int]:
    if workspace_id is not None:
        await _ensure_workspace_access(db, user_id, workspace_id)

    stmt = select(SavedFilter).where(
        (SavedFilter.owner_id == user_id) | (SavedFilter.visibility == "shared")
    )
    if workspace_id is not None:
        stmt = stmt.where(
            (SavedFilter.workspace_id == workspace_id) | (SavedFilter.scope == "global")
        )
    if project_id is not None:
        stmt = stmt.where(SavedFilter.project_id == project_id)
    if scope is not None:
        stmt = stmt.where(SavedFilter.scope == scope)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = int((await db.execute(count_stmt)).scalar_one())

    offset = max(0, (page - 1) * page_size)
    rows = (
        await db.execute(stmt.order_by(SavedFilter.updated_at.desc()).offset(offset).limit(page_size))
    ).scalars().all()
    return [_to_out(r) for r in rows], total


async def get_saved_filter(db: AsyncSession, user_id: UUID, filter_id: UUID) -> SavedFilterOut:
    record = await db.get(SavedFilter, filter_id)
    if record is None:
        raise NotFoundError("فیلتر ذخیره‌شده یافت نشد.")
    if record.visibility != "shared" and record.owner_id != user_id:
        raise PermissionDeniedError("شما اجازه مشاهده این فیلتر را ندارید.")
    if record.workspace_id is not None:
        await _ensure_workspace_access(db, user_id, record.workspace_id)
    return _to_out(record)


async def create_saved_filter(db: AsyncSession, user_id: UUID, data: SavedFilterCreate) -> SavedFilterOut:
    if data.scope in {"workspace", "project"} and data.workspace_id is None:
        raise NotFoundError("شناسه فضای کاری برای این فیلتر الزامی است.")
    if data.scope == "project" and data.project_id is None:
        raise NotFoundError("شناسه پروژه برای فیلتر سطح پروژه الزامی است.")

    if data.workspace_id is not None:
        await _ensure_workspace_access(db, user_id, data.workspace_id)
    if data.project_id is not None:
        await _ensure_project_in_workspace(db, data.project_id, data.workspace_id)

    if data.is_default and data.workspace_id is not None:
        stmt = select(SavedFilter).where(
            SavedFilter.owner_id == user_id,
            SavedFilter.workspace_id == data.workspace_id,
            SavedFilter.is_default.is_(True),
        )
        for existing in (await db.execute(stmt)).scalars().all():
            existing.is_default = False

    record = SavedFilter(
        name=data.name.strip(),
        scope=data.scope,
        workspace_id=data.workspace_id,
        project_id=data.project_id,
        owner_id=user_id,
        conditions=data.conditions,
        visibility=data.visibility,
        is_default=data.is_default,
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return _to_out(record)


async def update_saved_filter(
    db: AsyncSession, user_id: UUID, filter_id: UUID, data: SavedFilterUpdate
) -> SavedFilterOut:
    record = await db.get(SavedFilter, filter_id)
    if record is None:
        raise NotFoundError("فیلتر ذخیره‌شده یافت نشد.")
    if record.owner_id != user_id:
        raise PermissionDeniedError("فقط مالک فیلتر می‌تواند آن را ویرایش کند.")

    updates = data.model_dump(exclude_unset=True)
    if updates.get("is_default") and record.workspace_id is not None:
        stmt = select(SavedFilter).where(
            SavedFilter.owner_id == user_id,
            SavedFilter.workspace_id == record.workspace_id,
            SavedFilter.is_default.is_(True),
            SavedFilter.id != filter_id,
        )
        for existing in (await db.execute(stmt)).scalars().all():
            existing.is_default = False

    for field, value in updates.items():
        setattr(record, field, value)
    record.last_used_at = datetime.now(UTC)
    await db.flush()
    await db.refresh(record)
    return _to_out(record)


async def delete_saved_filter(db: AsyncSession, user_id: UUID, filter_id: UUID) -> None:
    record = await db.get(SavedFilter, filter_id)
    if record is None:
        raise NotFoundError("فیلتر ذخیره‌شده یافت نشد.")
    if record.owner_id != user_id:
        raise PermissionDeniedError("فقط مالک فیلتر می‌تواند آن را حذف کند.")
    await db.delete(record)
