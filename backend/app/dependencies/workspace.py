"""Workspace-scoped dependencies: membership resolution and permission gates."""

from __future__ import annotations

from uuid import UUID

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, PermissionDeniedError
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.permissions.rbac import has_permission


async def get_workspace_membership(
    workspace_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceMember:
    """Resolve (and authorize) the current user's membership in `workspace_id`."""
    stmt = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == current_user.id,
    )
    membership = (await db.execute(stmt)).scalar_one_or_none()
    if membership is None:
        raise NotFoundError("فضای کاری یافت نشد یا شما عضو آن نیستید.")
    return membership


def require_permission(permission_key: str):
    """Dependency factory: raises PermissionDeniedError unless the member's role has `permission_key`."""

    async def _checker(
        membership: WorkspaceMember = Depends(get_workspace_membership),
    ) -> WorkspaceMember:
        if not has_permission(membership.role, permission_key):
            raise PermissionDeniedError("شما اجازه انجام این عملیات را ندارید.")
        return membership

    return _checker
