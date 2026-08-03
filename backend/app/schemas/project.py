from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import Field

from app.schemas.common import CamelModel
from app.schemas.enums import ProjectStatus, ProjectVisibility, TaskStatus


class ProjectOut(CamelModel):
    id: UUID
    workspace_id: UUID
    name: str
    description: str | None = None
    key: str
    status: ProjectStatus
    visibility: ProjectVisibility
    category_id: UUID | None = None
    owner_id: UUID
    member_ids: list[UUID] = Field(default_factory=list)
    start_date: date | None = None
    due_date: date | None = None
    progress: int = 0
    task_count: int = 0
    completed_task_count: int = 0
    template_id: str | None = None
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None = None
    deleted_at: datetime | None = None


class ProjectCreate(CamelModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    key: str | None = Field(default=None, min_length=2, max_length=10)
    visibility: ProjectVisibility = "private"
    category_id: UUID | None = None
    member_ids: list[UUID] = Field(default_factory=list)
    start_date: date | None = None
    due_date: date | None = None
    template_id: str | None = None


class ProjectUpdate(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    status: ProjectStatus | None = None
    visibility: ProjectVisibility | None = None
    category_id: UUID | None = None
    owner_id: UUID | None = None
    member_ids: list[UUID] | None = None
    start_date: date | None = None
    due_date: date | None = None


class ProjectCategoryOut(CamelModel):
    id: UUID
    workspace_id: UUID
    name: str
    color: str
    project_count: int = 0


class ProjectCategoryCreate(CamelModel):
    name: str = Field(min_length=1, max_length=80)
    color: str = "#6366f1"


class ProjectCategoryUpdate(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    color: str | None = None


class KanbanColumnOut(CamelModel):
    id: UUID
    project_id: UUID
    name: str
    status: TaskStatus
    order: int
    wip_limit: int | None = None
    color: str


class KanbanColumnCreate(CamelModel):
    name: str = Field(min_length=1, max_length=60)
    status: TaskStatus
    order: int | None = None
    wip_limit: int | None = Field(default=None, ge=0)
    color: str = "#6366f1"


class KanbanColumnUpdate(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=60)
    status: TaskStatus | None = None
    wip_limit: int | None = Field(default=None, ge=0)
    color: str | None = None


class KanbanMoveRequest(CamelModel):
    task_id: UUID
    column_id: UUID
    order: int = Field(ge=0)


class KanbanReorderColumns(CamelModel):
    column_ids: list[UUID] = Field(min_length=1)


class ScheduleItemUpdate(CamelModel):
    task_id: UUID
    start_date: date | None = None
    due_date: date | None = None


class ScheduleUpdateRequest(CamelModel):
    items: list[ScheduleItemUpdate] = Field(min_length=1)
