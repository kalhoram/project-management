"""Workspace, team, role, member and onboarding business logic.

Aligned with the real ORM models:

- Workspace (app.models.workspace): id, name, slug, logo_url, description,
  industry, company_size, timezone, default_visibility, plan_id (nullable FK),
  owner_id, status, member_count, project_count, created_at.
- WorkspaceMember: id, workspace_id, user_id, role, invited_by_id, joined_at
  (nullable), is_active.
- WorkspaceInvite: id, workspace_id, email, role, status, invited_by_id,
  token_hash, expires_at, accepted_at, accepted_by_id.
- Team / TeamMember: Team has no direct member list; TeamMember(team_id,
  user_id, role) is the association table.
- Role / Permission / RolePermission (app.models.rbac): `Role.permissions`
  is NOT a column -- permission keys are resolved through the RolePermission
  join against the global `Permission` catalog.
- Project / ProjectMember / KanbanColumn (app.models.project): a project's
  members live in `ProjectMember`, not a JSON column on `Project`.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from slugify import slugify
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError, PermissionDeniedError
from app.core.security import generate_opaque_token, hash_token
from app.models.project import KanbanColumn, Project, ProjectMember
from app.models.rbac import Permission, Role, RolePermission
from app.models.user import User
from app.models.workspace import Team, TeamMember, Workspace, WorkspaceInvite, WorkspaceMember
from app.schemas.workspace import (
    AcceptInviteRequest,
    InviteOut,
    MemberInvite,
    MemberOut,
    OnboardingComplete,
    PermissionOut,
    RoleCreate,
    RoleOut,
    RoleUpdate,
    TeamCreate,
    TeamOut,
    TeamUpdate,
    WorkspaceCreate,
    WorkspaceOut,
    WorkspaceUpdate,
)

_INVITE_TTL_DAYS = 7

_DEFAULT_COLUMNS = [
    ("انجام‌نشده", "todo", "#94a3b8"),
    ("در حال انجام", "in_progress", "#3b82f6"),
    ("بررسی", "in_review", "#f59e0b"),
    ("انجام‌شده", "done", "#22c55e"),
]


async def _generate_unique_slug(db: AsyncSession, name: str) -> str:
    base = slugify(name) or "workspace"
    candidate = base
    suffix = 2
    while True:
        stmt = select(Workspace.id).where(Workspace.slug == candidate)
        if (await db.execute(stmt)).scalar_one_or_none() is None:
            return candidate
        candidate = f"{base}-{suffix}"
        suffix += 1


async def _team_member_ids(db: AsyncSession, team_id: UUID) -> list[UUID]:
    stmt = select(TeamMember.user_id).where(TeamMember.team_id == team_id)
    return list((await db.execute(stmt)).scalars().all())


async def list_workspaces(db: AsyncSession, user_id: UUID) -> list[WorkspaceOut]:
    stmt = (
        select(Workspace)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == user_id, WorkspaceMember.is_active.is_(True))
        .order_by(Workspace.created_at.desc())
    )
    workspaces = (await db.execute(stmt)).scalars().all()
    return [WorkspaceOut.model_validate(w) for w in workspaces]


async def get_workspace(db: AsyncSession, workspace_id: UUID) -> WorkspaceOut:
    workspace = await db.get(Workspace, workspace_id)
    if workspace is None:
        raise NotFoundError("فضای کاری یافت نشد.")
    return WorkspaceOut.model_validate(workspace)


async def create_workspace(db: AsyncSession, owner: User, data: WorkspaceCreate) -> WorkspaceOut:
    slug = data.slug.strip().lower() if data.slug else await _generate_unique_slug(db, data.name)
    if data.slug:
        stmt = select(Workspace.id).where(Workspace.slug == slug)
        if (await db.execute(stmt)).scalar_one_or_none() is not None:
            raise ConflictError("این آدرس فضای کاری قبلاً استفاده شده است.")

    workspace = Workspace(
        name=data.name.strip(),
        slug=slug,
        description=data.description,
        industry=data.industry,
        company_size=data.company_size,
        timezone=data.timezone or "Asia/Tehran",
        default_visibility=data.default_visibility,
        owner_id=owner.id,
        member_count=1,
        project_count=0,
        status="trial",
    )
    db.add(workspace)
    await db.flush()

    db.add(
        WorkspaceMember(
            workspace_id=workspace.id,
            user_id=owner.id,
            role="owner",
            joined_at=datetime.now(UTC),
            is_active=True,
        )
    )
    await db.flush()
    return WorkspaceOut.model_validate(workspace)


async def update_workspace(db: AsyncSession, workspace_id: UUID, data: WorkspaceUpdate) -> WorkspaceOut:
    workspace = await db.get(Workspace, workspace_id)
    if workspace is None:
        raise NotFoundError("فضای کاری یافت نشد.")

    updates = data.model_dump(exclude_unset=True)
    if "slug" in updates and updates["slug"] and updates["slug"] != workspace.slug:
        stmt = select(Workspace.id).where(Workspace.slug == updates["slug"])
        if (await db.execute(stmt)).scalar_one_or_none() is not None:
            raise ConflictError("این آدرس فضای کاری قبلاً استفاده شده است.")

    for field, value in updates.items():
        setattr(workspace, field, value)
    await db.flush()
    return WorkspaceOut.model_validate(workspace)


async def list_members(db: AsyncSession, workspace_id: UUID) -> list[MemberOut]:
    stmt = (
        select(WorkspaceMember, User)
        .join(User, User.id == WorkspaceMember.user_id)
        .where(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.is_active.is_(True))
        .order_by(WorkspaceMember.joined_at.asc())
    )
    rows = (await db.execute(stmt)).all()

    results: list[MemberOut] = []
    for member, user in rows:
        team_stmt = select(TeamMember.team_id).where(TeamMember.user_id == user.id)
        team_ids = list((await db.execute(team_stmt)).scalars().all())
        results.append(
            MemberOut(
                user=user,
                workspace_id=workspace_id,
                role=member.role,
                team_ids=team_ids,
                joined_at=member.joined_at or member.created_at,
            )
        )
    return results


async def update_member_role(db: AsyncSession, workspace_id: UUID, user_id: UUID, role: str) -> MemberOut:
    stmt = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user_id
    )
    member = (await db.execute(stmt)).scalar_one_or_none()
    if member is None:
        raise NotFoundError("عضو موردنظر در این فضای کاری یافت نشد.")
    if member.role == "owner" and role != "owner":
        raise PermissionDeniedError("نقش مالک فضای کاری قابل تغییر نیست.")

    member.role = role
    await db.flush()

    user = await db.get(User, user_id)
    team_ids = await _team_member_ids(db, user_id) if user else []
    return MemberOut(
        user=user,
        workspace_id=workspace_id,
        role=member.role,
        team_ids=team_ids,
        joined_at=member.joined_at or member.created_at,
    )


async def remove_member(db: AsyncSession, workspace_id: UUID, user_id: UUID) -> None:
    stmt = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user_id
    )
    member = (await db.execute(stmt)).scalar_one_or_none()
    if member is None:
        raise NotFoundError("عضو موردنظر در این فضای کاری یافت نشد.")
    if member.role == "owner":
        raise PermissionDeniedError("مالک فضای کاری قابل حذف نیست.")

    await db.delete(member)
    workspace = await db.get(Workspace, workspace_id)
    if workspace is not None and workspace.member_count:
        workspace.member_count = max(0, workspace.member_count - 1)


async def list_teams(db: AsyncSession, workspace_id: UUID) -> list[TeamOut]:
    stmt = select(Team).where(Team.workspace_id == workspace_id).order_by(Team.name.asc())
    teams = (await db.execute(stmt)).scalars().all()
    result = []
    for team in teams:
        member_ids = await _team_member_ids(db, team.id)
        result.append(TeamOut.model_validate(team).model_copy(update={"member_ids": member_ids}))
    return result


async def create_team(db: AsyncSession, workspace_id: UUID, data: TeamCreate) -> TeamOut:
    team = Team(
        workspace_id=workspace_id,
        name=data.name,
        description=data.description,
        department=data.department,
        lead_id=data.lead_id,
        color=data.color,
    )
    db.add(team)
    await db.flush()
    for user_id in data.member_ids:
        db.add(TeamMember(team_id=team.id, user_id=user_id))
    await db.flush()
    return TeamOut.model_validate(team).model_copy(update={"member_ids": list(data.member_ids)})


async def update_team(db: AsyncSession, workspace_id: UUID, team_id: UUID, data: TeamUpdate) -> TeamOut:
    team = await db.get(Team, team_id)
    if team is None or team.workspace_id != workspace_id:
        raise NotFoundError("تیم موردنظر یافت نشد.")

    updates = data.model_dump(exclude_unset=True, exclude={"member_ids"})
    for field, value in updates.items():
        setattr(team, field, value)

    if data.member_ids is not None:
        existing_stmt = select(TeamMember).where(TeamMember.team_id == team_id)
        for row in (await db.execute(existing_stmt)).scalars().all():
            await db.delete(row)
        await db.flush()
        for user_id in data.member_ids:
            db.add(TeamMember(team_id=team_id, user_id=user_id))

    await db.flush()
    member_ids = await _team_member_ids(db, team_id)
    return TeamOut.model_validate(team).model_copy(update={"member_ids": member_ids})


async def delete_team(db: AsyncSession, workspace_id: UUID, team_id: UUID) -> None:
    team = await db.get(Team, team_id)
    if team is None or team.workspace_id != workspace_id:
        raise NotFoundError("تیم موردنظر یافت نشد.")
    await db.delete(team)


async def list_permission_catalog(db: AsyncSession) -> list[PermissionOut]:
    stmt = select(Permission).order_by(Permission.category.asc(), Permission.label.asc())
    permissions = (await db.execute(stmt)).scalars().all()
    return [PermissionOut(id=str(p.id), key=p.key, label=p.label, description=p.description, category=p.category) for p in permissions]


async def _role_permission_keys(db: AsyncSession, role_id: UUID) -> list[str]:
    stmt = (
        select(Permission.key)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .where(RolePermission.role_id == role_id)
    )
    return list((await db.execute(stmt)).scalars().all())


async def _to_role_out(db: AsyncSession, role: Role) -> RoleOut:
    permissions = await _role_permission_keys(db, role.id)
    return RoleOut.model_validate(role).model_copy(update={"permissions": permissions})


async def list_roles(db: AsyncSession, workspace_id: UUID) -> list[RoleOut]:
    stmt = select(Role).where(Role.workspace_id == workspace_id).order_by(Role.is_system.desc(), Role.name.asc())
    roles = (await db.execute(stmt)).scalars().all()
    return [await _to_role_out(db, r) for r in roles]


async def _resolve_permissions(db: AsyncSession, keys: list[str]) -> list[Permission]:
    if not keys:
        return []
    stmt = select(Permission).where(Permission.key.in_(keys))
    permissions = (await db.execute(stmt)).scalars().all()
    found_keys = {p.key for p in permissions}
    invalid = [k for k in keys if k not in found_keys]
    if invalid:
        raise ConflictError(f"کلید(های) دسترسی نامعتبر: {', '.join(invalid)}")
    return list(permissions)


async def create_role(db: AsyncSession, workspace_id: UUID, data: RoleCreate) -> RoleOut:
    permissions = await _resolve_permissions(db, data.permissions)

    role = Role(
        workspace_id=workspace_id,
        name=data.name,
        description=data.description,
        is_system=False,
        member_count=0,
    )
    db.add(role)
    await db.flush()

    for permission in permissions:
        db.add(RolePermission(role_id=role.id, permission_id=permission.id))
    await db.flush()
    return await _to_role_out(db, role)


async def update_role(db: AsyncSession, workspace_id: UUID, role_id: UUID, data: RoleUpdate) -> RoleOut:
    role = await db.get(Role, role_id)
    if role is None or role.workspace_id != workspace_id:
        raise NotFoundError("نقش موردنظر یافت نشد.")
    if role.is_system:
        raise PermissionDeniedError("نقش‌های سیستمی قابل ویرایش نیستند.")

    updates = data.model_dump(exclude_unset=True, exclude={"permissions"})
    for field, value in updates.items():
        setattr(role, field, value)

    if data.permissions is not None:
        permissions = await _resolve_permissions(db, data.permissions)
        existing_stmt = select(RolePermission).where(RolePermission.role_id == role_id)
        for row in (await db.execute(existing_stmt)).scalars().all():
            await db.delete(row)
        await db.flush()
        for permission in permissions:
            db.add(RolePermission(role_id=role_id, permission_id=permission.id))

    await db.flush()
    return await _to_role_out(db, role)


async def delete_role(db: AsyncSession, workspace_id: UUID, role_id: UUID) -> None:
    role = await db.get(Role, role_id)
    if role is None or role.workspace_id != workspace_id:
        raise NotFoundError("نقش موردنظر یافت نشد.")
    if role.is_system:
        raise PermissionDeniedError("نقش‌های سیستمی قابل حذف نیستند.")
    await db.delete(role)


async def list_invites(db: AsyncSession, workspace_id: UUID) -> list[InviteOut]:
    stmt = (
        select(WorkspaceInvite)
        .where(WorkspaceInvite.workspace_id == workspace_id, WorkspaceInvite.status == "pending")
        .order_by(WorkspaceInvite.created_at.desc())
    )
    invites = (await db.execute(stmt)).scalars().all()
    return [InviteOut.model_validate(i) for i in invites]


async def invite_member(
    db: AsyncSession, workspace_id: UUID, invited_by_id: UUID, data: MemberInvite
) -> InviteOut:
    """Create a pending `WorkspaceInvite`; the actual membership is created on acceptance.

    Note: `data.team_ids` cannot be persisted on the invite (no such column on
    `WorkspaceInvite`) -- assign the accepted member to teams afterwards via
    the team endpoints.
    """
    email = data.email.strip().lower()

    existing_member_stmt = (
        select(WorkspaceMember)
        .join(User, User.id == WorkspaceMember.user_id)
        .where(WorkspaceMember.workspace_id == workspace_id, User.email == email)
    )
    if (await db.execute(existing_member_stmt)).scalar_one_or_none() is not None:
        raise ConflictError("این کاربر پیش‌تر عضو این فضای کاری است.")

    existing_invite_stmt = select(WorkspaceInvite).where(
        WorkspaceInvite.workspace_id == workspace_id,
        WorkspaceInvite.email == email,
        WorkspaceInvite.status == "pending",
    )
    if (await db.execute(existing_invite_stmt)).scalar_one_or_none() is not None:
        raise ConflictError("این کاربر پیش‌تر دعوت شده است.")

    token = generate_opaque_token()
    invite = WorkspaceInvite(
        workspace_id=workspace_id,
        email=email,
        role=data.role,
        status="pending",
        invited_by_id=invited_by_id,
        token_hash=hash_token(token),
        expires_at=datetime.now(UTC) + timedelta(days=_INVITE_TTL_DAYS),
    )
    db.add(invite)
    await db.flush()
    return InviteOut.model_validate(invite)


async def revoke_invite(db: AsyncSession, workspace_id: UUID, invite_id: UUID) -> None:
    invite = await db.get(WorkspaceInvite, invite_id)
    if invite is None or invite.workspace_id != workspace_id:
        raise NotFoundError("دعوت‌نامه یافت نشد.")
    invite.status = "revoked"


async def accept_invite(db: AsyncSession, accepting_user: User, data: AcceptInviteRequest) -> WorkspaceOut:
    token_hash = hash_token(data.token)
    stmt = select(WorkspaceInvite).where(WorkspaceInvite.token_hash == token_hash)
    invite = (await db.execute(stmt)).scalar_one_or_none()
    now = datetime.now(UTC)
    if invite is None or invite.status != "pending" or invite.expires_at < now:
        raise ConflictError("دعوت‌نامه نامعتبر یا منقضی شده است.", code="INVITE_INVALID")
    if invite.email != accepting_user.email.strip().lower():
        raise PermissionDeniedError("این دعوت‌نامه برای حساب کاربری شما نیست.")

    existing_stmt = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == invite.workspace_id, WorkspaceMember.user_id == accepting_user.id
    )
    member = (await db.execute(existing_stmt)).scalar_one_or_none()
    if member is None:
        db.add(
            WorkspaceMember(
                workspace_id=invite.workspace_id,
                user_id=accepting_user.id,
                role=invite.role,
                invited_by_id=invite.invited_by_id,
                joined_at=now,
                is_active=True,
            )
        )
        workspace = await db.get(Workspace, invite.workspace_id)
        if workspace is not None:
            workspace.member_count = (workspace.member_count or 0) + 1

    invite.status = "accepted"
    invite.accepted_at = now
    invite.accepted_by_id = accepting_user.id
    await db.flush()
    return await get_workspace(db, invite.workspace_id)


async def complete_onboarding(db: AsyncSession, owner: User, data: OnboardingComplete) -> WorkspaceOut:
    workspace_out = await create_workspace(
        db,
        owner,
        WorkspaceCreate(
            name=data.workspace_name,
            slug=data.slug,
            industry=data.industry,
            company_size=data.company_size,
            timezone=data.timezone,
        ),
    )

    for invite in data.invites:
        try:
            await invite_member(
                db, workspace_out.id, owner.id, MemberInvite(email=invite.email, role=invite.role)
            )
        except ConflictError:
            continue

    project = Project(
        workspace_id=workspace_out.id,
        name=data.project_name or "پروژه نمونه",
        key="DEMO",
        status="active",
        visibility="team",
        owner_id=owner.id,
        progress=0,
        task_count=0,
        completed_task_count=0,
        template_id=data.template_id,
    )
    db.add(project)
    await db.flush()

    db.add(ProjectMember(project_id=project.id, user_id=owner.id, role="owner"))

    for index, (name, status, color) in enumerate(_DEFAULT_COLUMNS):
        db.add(
            KanbanColumn(
                project_id=project.id,
                name=name,
                status=status,
                sort_order=index,
                color=color,
            )
        )

    workspace = await db.get(Workspace, workspace_out.id)
    if workspace is not None:
        workspace.project_count = (workspace.project_count or 0) + 1

    await db.flush()
    return await get_workspace(db, workspace_out.id)
