"""Notification and activity-feed business logic.

Aligned with the real ORM models (app.models.activity):

- Notification: id, user_id, type (NotificationType), title, body, entity_type
  (nullable), entity_id (nullable), read, created_at.
- ActivityLog: id, workspace_id (TenantMixin), actor_id, action, entity_type,
  entity_id, entity_name, metadata_ (mapped to DB column "metadata" -- the
  Python attribute is renamed since `metadata` is reserved on `Base`).

`ActivityOut.metadata` therefore needs an explicit mapping from
`ActivityLog.metadata_` below (Pydantic's `from_attributes` matches by Python
attribute name, not the DB column name or the camelCase JSON alias).
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.activity import ActivityLog, Notification
from app.models.workspace import WorkspaceMember
from app.schemas.notification import ActivityOut, NotificationOut

_DEFAULT_LIMIT = 100


def _to_activity_out(activity: ActivityLog) -> ActivityOut:
    return ActivityOut(
        id=activity.id,
        workspace_id=activity.workspace_id,
        actor_id=activity.actor_id,
        action=activity.action,
        entity_type=activity.entity_type,
        entity_id=activity.entity_id,
        entity_name=activity.entity_name,
        metadata=activity.metadata_,
        created_at=activity.created_at,
    )


async def list_notifications(
    db: AsyncSession, user_id: UUID, *, unread_only: bool = False, limit: int = _DEFAULT_LIMIT
) -> list[NotificationOut]:
    stmt = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        stmt = stmt.where(Notification.read.is_(False))
    stmt = stmt.order_by(Notification.created_at.desc()).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    return [NotificationOut.model_validate(n) for n in rows]


async def mark_notification_read(db: AsyncSession, user_id: UUID, notification_id: UUID) -> NotificationOut:
    notification = await db.get(Notification, notification_id)
    if notification is None or notification.user_id != user_id:
        raise NotFoundError("اعلان یافت نشد.")
    notification.read = True
    await db.flush()
    return NotificationOut.model_validate(notification)


async def mark_all_notifications_read(db: AsyncSession, user_id: UUID) -> int:
    result = await db.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.read.is_(False))
        .values(read=True)
    )
    return result.rowcount or 0


async def create_notification(
    db: AsyncSession,
    *,
    user_id: UUID,
    notification_type: str,
    title: str,
    body: str,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
) -> NotificationOut:
    notification = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        body=body,
        entity_type=entity_type,
        entity_id=entity_id,
        read=False,
    )
    db.add(notification)
    await db.flush()
    return NotificationOut.model_validate(notification)


async def _member_workspace_ids(db: AsyncSession, user_id: UUID) -> list[UUID]:
    stmt = select(WorkspaceMember.workspace_id).where(
        WorkspaceMember.user_id == user_id, WorkspaceMember.is_active.is_(True)
    )
    return list((await db.execute(stmt)).scalars().all())


async def list_activities(
    db: AsyncSession,
    *,
    workspace_id: UUID | None = None,
    user_id: UUID | None = None,
    limit: int = _DEFAULT_LIMIT,
) -> list[ActivityOut]:
    stmt = select(ActivityLog)
    if workspace_id is not None:
        stmt = stmt.where(ActivityLog.workspace_id == workspace_id)
    elif user_id is not None:
        workspace_ids = await _member_workspace_ids(db, user_id)
        if not workspace_ids:
            return []
        stmt = stmt.where(ActivityLog.workspace_id.in_(workspace_ids))
    stmt = stmt.order_by(ActivityLog.created_at.desc()).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_activity_out(a) for a in rows]


async def list_project_activities(
    db: AsyncSession, workspace_id: UUID, project_id: UUID, *, limit: int = _DEFAULT_LIMIT
) -> list[ActivityOut]:
    """Mirrors the (loose) frontend filter: project-entity rows scoped to
    `project_id`, plus *all* task/file activity rows in the workspace (the
    mock has no project reference on task/file activity entries either)."""
    stmt = (
        select(ActivityLog)
        .where(
            ActivityLog.workspace_id == workspace_id,
            (
                ((ActivityLog.entity_type == "project") & (ActivityLog.entity_id == project_id))
                | ActivityLog.entity_type.in_(["task", "file"])
            ),
        )
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_activity_out(a) for a in rows]


async def create_activity(
    db: AsyncSession,
    *,
    workspace_id: UUID,
    actor_id: UUID | None,
    action: str,
    entity_type: str,
    entity_id: UUID,
    entity_name: str,
    metadata: dict | None = None,
) -> ActivityOut:
    activity = ActivityLog(
        workspace_id=workspace_id,
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        metadata_=metadata,
    )
    db.add(activity)
    await db.flush()
    return _to_activity_out(activity)
