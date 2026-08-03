from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import Field, model_validator

from app.schemas.common import CamelModel
from app.schemas.enums import CommentEntityType, TaskPriority, TaskStatus


class ChecklistItemOut(CamelModel):
    id: UUID
    title: str
    completed: bool = False
    assignee_id: UUID | None = None
    due_date: date | None = None


class ChecklistItemCreate(CamelModel):
    title: str = Field(min_length=1, max_length=255)
    assignee_id: UUID | None = None
    due_date: date | None = None


class ChecklistItemUpdate(CamelModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    completed: bool | None = None
    assignee_id: UUID | None = None
    due_date: date | None = None


class LabelOut(CamelModel):
    id: UUID
    name: str
    color: str


class LabelCreate(CamelModel):
    name: str = Field(min_length=1, max_length=60)
    color: str = "#6366f1"


class LabelUpdate(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=60)
    color: str | None = None


class CommentOut(CamelModel):
    id: UUID
    entity_type: CommentEntityType
    entity_id: UUID
    author_id: UUID
    body: str
    mentions: list[UUID] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime | None = None
    parent_id: UUID | None = None


class CommentCreate(CamelModel):
    body: str = Field(min_length=1, max_length=10_000)
    mentions: list[UUID] = Field(default_factory=list)
    parent_id: UUID | None = None


class CommentUpdate(CamelModel):
    body: str = Field(min_length=1, max_length=10_000)
    mentions: list[UUID] | None = None


class TaskOut(CamelModel):
    """Mirrors the frontend `Task` interface exactly."""

    id: UUID
    project_id: UUID
    workspace_id: UUID
    key: str
    title: str
    description: str | None = None
    status: TaskStatus
    priority: TaskPriority
    assignee_id: UUID | None = None
    reporter_id: UUID
    label_ids: list[UUID] = Field(default_factory=list)
    start_date: date | None = None
    due_date: date | None = None
    estimate_hours: float | None = None
    actual_hours: float | None = None
    story_points: int | None = None
    progress: int = 0
    column_id: UUID | None = None
    order: int = 0
    parent_id: UUID | None = None
    blocked_by_ids: list[UUID] = Field(default_factory=list)
    blocking_ids: list[UUID] = Field(default_factory=list)
    checklist: list[ChecklistItemOut] = Field(default_factory=list)
    attachment_count: int = 0
    comment_count: int = 0
    is_recurring: bool = False
    created_at: datetime
    updated_at: datetime


class TaskCreate(CamelModel):
    project_id: UUID
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=10_000)
    status: TaskStatus = "backlog"
    priority: TaskPriority = "medium"
    assignee_id: UUID | None = None
    label_ids: list[UUID] = Field(default_factory=list)
    start_date: date | None = None
    due_date: date | None = None
    estimate_hours: float | None = Field(default=None, ge=0)
    story_points: int | None = Field(default=None, ge=0)
    column_id: UUID | None = None
    parent_id: UUID | None = None
    is_recurring: bool = False

    @model_validator(mode="after")
    def validate_dates(self) -> "TaskCreate":
        if self.start_date and self.due_date and self.due_date < self.start_date:
            raise ValueError("تاریخ سررسید نمی‌تواند قبل از تاریخ شروع باشد.")
        return self


class TaskUpdate(CamelModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=10_000)
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    assignee_id: UUID | None = None
    label_ids: list[UUID] | None = None
    start_date: date | None = None
    due_date: date | None = None
    estimate_hours: float | None = Field(default=None, ge=0)
    actual_hours: float | None = Field(default=None, ge=0)
    story_points: int | None = Field(default=None, ge=0)
    progress: int | None = Field(default=None, ge=0, le=100)
    column_id: UUID | None = None
    order: int | None = None
    parent_id: UUID | None = None
    is_recurring: bool | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> "TaskUpdate":
        if self.start_date and self.due_date and self.due_date < self.start_date:
            raise ValueError("تاریخ سررسید نمی‌تواند قبل از تاریخ شروع باشد.")
        return self


class TaskDependencyUpdate(CamelModel):
    """Add/remove blocking relationships. `blocked_by_ids` fully replaces the set."""

    blocked_by_ids: list[UUID] = Field(default_factory=list)


class BulkUpdateRequest(CamelModel):
    task_ids: list[UUID] = Field(min_length=1)
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    assignee_id: UUID | None = None
    column_id: UUID | None = None
    add_label_ids: list[UUID] = Field(default_factory=list)
    remove_label_ids: list[UUID] = Field(default_factory=list)
    delete: bool = False
