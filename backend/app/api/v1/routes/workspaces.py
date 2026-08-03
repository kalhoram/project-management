"""Workspace, membership, invites, teams, roles and permission-catalog endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.workspace import get_workspace_membership, require_permission
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.permissions.rbac import (
    PERM_MEMBERS_INVITE,
    PERM_MEMBERS_MANAGE,
    PERM_WORKSPACE_MANAGE,
)
from app.schemas.common import MessageResponse
from app.schemas.workspace import (
    AcceptInviteRequest,
    InviteOut,
    MemberInvite,
    MemberOut,
    MemberRoleUpdate,
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
from app.services import workspace_service

router = APIRouter(tags=["workspaces"])


@router.get("/permissions", response_model=list[PermissionOut])
async def list_permissions(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[PermissionOut]:
    return await workspace_service.list_permission_catalog(db)


@router.post("/workspaces/invites/accept", response_model=WorkspaceOut)
async def accept_invite(
    data: AcceptInviteRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> WorkspaceOut:
    return await workspace_service.accept_invite(db, current_user, data)


@router.get("/workspaces", response_model=list[WorkspaceOut])
async def list_workspaces(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[WorkspaceOut]:
    return await workspace_service.list_workspaces(db, current_user.id)


@router.post("/workspaces", response_model=WorkspaceOut)
async def create_workspace(
    data: WorkspaceCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> WorkspaceOut:
    return await workspace_service.create_workspace(db, current_user, data)


@router.get("/workspaces/{workspace_id}", response_model=WorkspaceOut)
async def get_workspace(
    workspace_id: UUID,
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceOut:
    return await workspace_service.get_workspace(db, workspace_id)


@router.patch("/workspaces/{workspace_id}", response_model=WorkspaceOut)
async def update_workspace(
    workspace_id: UUID,
    data: WorkspaceUpdate,
    membership: WorkspaceMember = Depends(require_permission(PERM_WORKSPACE_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceOut:
    return await workspace_service.update_workspace(db, workspace_id, data)


@router.get("/workspaces/{workspace_id}/members", response_model=list[MemberOut])
async def list_members(
    workspace_id: UUID,
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> list[MemberOut]:
    return await workspace_service.list_members(db, workspace_id)


@router.patch("/workspaces/{workspace_id}/members/{user_id}/role", response_model=MemberOut)
async def update_member_role(
    workspace_id: UUID,
    user_id: UUID,
    data: MemberRoleUpdate,
    membership: WorkspaceMember = Depends(require_permission(PERM_MEMBERS_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> MemberOut:
    return await workspace_service.update_member_role(db, workspace_id, user_id, data.role)


@router.delete("/workspaces/{workspace_id}/members/{user_id}", response_model=MessageResponse)
async def remove_member(
    workspace_id: UUID,
    user_id: UUID,
    membership: WorkspaceMember = Depends(require_permission(PERM_MEMBERS_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await workspace_service.remove_member(db, workspace_id, user_id)
    return MessageResponse(message="عضو با موفقیت حذف شد.")


@router.get("/workspaces/{workspace_id}/invites", response_model=list[InviteOut])
async def list_invites(
    workspace_id: UUID,
    membership: WorkspaceMember = Depends(require_permission(PERM_MEMBERS_INVITE)),
    db: AsyncSession = Depends(get_db),
) -> list[InviteOut]:
    return await workspace_service.list_invites(db, workspace_id)


@router.post("/workspaces/{workspace_id}/invites", response_model=InviteOut)
async def invite_member(
    workspace_id: UUID,
    data: MemberInvite,
    membership: WorkspaceMember = Depends(require_permission(PERM_MEMBERS_INVITE)),
    db: AsyncSession = Depends(get_db),
) -> InviteOut:
    return await workspace_service.invite_member(db, workspace_id, membership.user_id, data)


@router.delete("/workspaces/{workspace_id}/invites/{invite_id}", response_model=MessageResponse)
async def revoke_invite(
    workspace_id: UUID,
    invite_id: UUID,
    membership: WorkspaceMember = Depends(require_permission(PERM_MEMBERS_INVITE)),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await workspace_service.revoke_invite(db, workspace_id, invite_id)
    return MessageResponse(message="دعوت‌نامه لغو شد.")


@router.get("/workspaces/{workspace_id}/teams", response_model=list[TeamOut])
async def list_teams(
    workspace_id: UUID,
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> list[TeamOut]:
    return await workspace_service.list_teams(db, workspace_id)


@router.post("/workspaces/{workspace_id}/teams", response_model=TeamOut)
async def create_team(
    workspace_id: UUID,
    data: TeamCreate,
    membership: WorkspaceMember = Depends(require_permission(PERM_MEMBERS_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> TeamOut:
    return await workspace_service.create_team(db, workspace_id, data)


@router.patch("/workspaces/{workspace_id}/teams/{team_id}", response_model=TeamOut)
async def update_team(
    workspace_id: UUID,
    team_id: UUID,
    data: TeamUpdate,
    membership: WorkspaceMember = Depends(require_permission(PERM_MEMBERS_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> TeamOut:
    return await workspace_service.update_team(db, workspace_id, team_id, data)


@router.delete("/workspaces/{workspace_id}/teams/{team_id}", response_model=MessageResponse)
async def delete_team(
    workspace_id: UUID,
    team_id: UUID,
    membership: WorkspaceMember = Depends(require_permission(PERM_MEMBERS_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await workspace_service.delete_team(db, workspace_id, team_id)
    return MessageResponse(message="تیم حذف شد.")


@router.get("/workspaces/{workspace_id}/roles", response_model=list[RoleOut])
async def list_roles(
    workspace_id: UUID,
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> list[RoleOut]:
    return await workspace_service.list_roles(db, workspace_id)


@router.post("/workspaces/{workspace_id}/roles", response_model=RoleOut)
async def create_role(
    workspace_id: UUID,
    data: RoleCreate,
    membership: WorkspaceMember = Depends(require_permission(PERM_WORKSPACE_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> RoleOut:
    return await workspace_service.create_role(db, workspace_id, data)


@router.patch("/workspaces/{workspace_id}/roles/{role_id}", response_model=RoleOut)
async def update_role(
    workspace_id: UUID,
    role_id: UUID,
    data: RoleUpdate,
    membership: WorkspaceMember = Depends(require_permission(PERM_WORKSPACE_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> RoleOut:
    return await workspace_service.update_role(db, workspace_id, role_id, data)


@router.delete("/workspaces/{workspace_id}/roles/{role_id}", response_model=MessageResponse)
async def delete_role(
    workspace_id: UUID,
    role_id: UUID,
    membership: WorkspaceMember = Depends(require_permission(PERM_WORKSPACE_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await workspace_service.delete_role(db, workspace_id, role_id)
    return MessageResponse(message="نقش حذف شد.")
