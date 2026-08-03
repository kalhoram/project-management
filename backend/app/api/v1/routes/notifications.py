"""Notification and activity-feed endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.routes.projects import require_project_permission
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.workspace import get_workspace_membership
from app.models.project import Project
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.schemas.common import MessageResponse
from app.schemas.notification import ActivityOut, NotificationOut
from app.services import notification_service

router = APIRouter(tags=["notifications"])


@router.get("/notifications", response_model=list[NotificationOut])
async def list_notifications(
    unread_only: bool = Query(default=False, alias="unreadOnly"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[NotificationOut]:
    return await notification_service.list_notifications(db, current_user.id, unread_only=unread_only)


@router.post("/notifications/{notification_id}/read", response_model=NotificationOut)
async def mark_notification_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationOut:
    return await notification_service.mark_notification_read(db, current_user.id, notification_id)


@router.post("/notifications/read-all", response_model=MessageResponse)
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> MessageResponse:
    count = await notification_service.mark_all_notifications_read(db, current_user.id)
    return MessageResponse(message=f"{count} اعلان به‌عنوان خوانده‌شده علامت خورد.")


@router.get("/activities", response_model=list[ActivityOut])
async def list_my_activities(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[ActivityOut]:
    return await notification_service.list_activities(db, user_id=current_user.id)


@router.get("/workspaces/{workspace_id}/activities", response_model=list[ActivityOut])
async def list_workspace_activities(
    workspace_id: UUID,
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> list[ActivityOut]:
    return await notification_service.list_activities(db, workspace_id=workspace_id)


@router.get("/projects/{project_id}/activities", response_model=list[ActivityOut])
async def list_project_activities(
    project: Project = Depends(require_project_permission(None)), db: AsyncSession = Depends(get_db)
) -> list[ActivityOut]:
    return await notification_service.list_project_activities(db, project.workspace_id, project.id)
