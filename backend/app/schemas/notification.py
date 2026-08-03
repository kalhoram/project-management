from __future__ import annotations

from datetime import datetime
from uuid import UUID

from app.schemas.common import CamelModel
from app.schemas.enums import ActivityEntityType, NotificationType


class NotificationOut(CamelModel):
    id: UUID
    user_id: UUID
    type: NotificationType
    title: str
    body: str
    entity_type: ActivityEntityType | None = None
    entity_id: UUID | None = None
    read: bool = False
    created_at: datetime


class ActivityOut(CamelModel):
    id: UUID
    workspace_id: UUID
    actor_id: UUID
    action: str
    entity_type: ActivityEntityType
    entity_id: UUID
    entity_name: str
    metadata: dict[str, str] | None = None
    created_at: datetime
