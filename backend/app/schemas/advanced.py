from __future__ import annotations

from datetime import date as date_
from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.common import CamelModel
from app.schemas.enums import ApprovalStatus, OKRStatus, RoadmapStatus, SprintStatus


class SprintOut(CamelModel):
    id: UUID
    workspace_id: UUID
    project_id: UUID | None = None
    name: str
    goal: str | None = None
    status: SprintStatus
    start_date: date_
    end_date: date_
    capacity: int = 0
    committed_points: int = 0
    completed_points: int = 0
    task_ids: list[UUID] = Field(default_factory=list)


class SprintCreate(CamelModel):
    project_id: UUID | None = None
    name: str = Field(min_length=1, max_length=120)
    goal: str | None = None
    start_date: date_
    end_date: date_
    capacity: int = Field(default=0, ge=0)
    task_ids: list[UUID] = Field(default_factory=list)


class SprintUpdate(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    goal: str | None = None
    status: SprintStatus | None = None
    start_date: date_ | None = None
    end_date: date_ | None = None
    capacity: int | None = Field(default=None, ge=0)
    task_ids: list[UUID] | None = None


class RoadmapOut(CamelModel):
    id: UUID
    workspace_id: UUID
    title: str
    description: str | None = None
    status: RoadmapStatus
    start_date: date_
    end_date: date_
    owner_id: UUID | None = None
    initiative: str | None = None
    release: str | None = None


class RoadmapCreate(CamelModel):
    title: str = Field(min_length=1, max_length=160)
    description: str | None = None
    status: RoadmapStatus = "planned"
    start_date: date_
    end_date: date_
    owner_id: UUID | None = None
    initiative: str | None = None
    release: str | None = None


class RoadmapUpdate(CamelModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = None
    status: RoadmapStatus | None = None
    start_date: date_ | None = None
    end_date: date_ | None = None
    owner_id: UUID | None = None
    initiative: str | None = None
    release: str | None = None


class KeyResultOut(CamelModel):
    id: UUID
    title: str
    target: float
    current: float
    unit: str


class KeyResultInput(CamelModel):
    title: str = Field(min_length=1, max_length=160)
    target: float
    current: float = 0
    unit: str = ""


class OKROut(CamelModel):
    id: UUID
    workspace_id: UUID
    objective: str
    owner_id: UUID
    confidence: int
    progress: int
    key_results: list[KeyResultOut] = Field(default_factory=list)
    period: str
    status: OKRStatus


class OKRCreate(CamelModel):
    objective: str = Field(min_length=1, max_length=255)
    owner_id: UUID
    confidence: int = Field(default=50, ge=0, le=100)
    key_results: list[KeyResultInput] = Field(default_factory=list)
    period: str


class OKRUpdate(CamelModel):
    objective: str | None = Field(default=None, min_length=1, max_length=255)
    owner_id: UUID | None = None
    confidence: int | None = Field(default=None, ge=0, le=100)
    key_results: list[KeyResultInput] | None = None
    period: str | None = None
    status: OKRStatus | None = None


class TimeEntryOut(CamelModel):
    id: UUID
    workspace_id: UUID
    task_id: UUID
    user_id: UUID
    hours: float
    note: str | None = None
    date: date_
    billable: bool = True


class TimeEntryCreate(CamelModel):
    task_id: UUID
    hours: float = Field(gt=0, le=24)
    note: str | None = Field(default=None, max_length=500)
    date: date_
    billable: bool = True


class TimeEntryUpdate(CamelModel):
    hours: float | None = Field(default=None, gt=0, le=24)
    note: str | None = Field(default=None, max_length=500)
    date: date_ | None = None
    billable: bool | None = None


class ApprovalOut(CamelModel):
    id: UUID
    workspace_id: UUID
    title: str
    description: str | None = None
    requester_id: UUID
    approver_ids: list[UUID] = Field(default_factory=list)
    status: ApprovalStatus
    entity_type: str
    entity_id: UUID
    created_at: datetime
    decided_at: datetime | None = None


class ApprovalCreate(CamelModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    approver_ids: list[UUID] = Field(min_length=1)
    entity_type: str
    entity_id: UUID


class ApprovalDecision(CamelModel):
    status: ApprovalStatus
    comment: str | None = None


class CapacityOut(CamelModel):
    """Per-member weekly capacity/allocation, used for resource planning."""

    user_id: UUID
    workspace_id: UUID
    week_start: date_
    capacity_hours: float
    allocated_hours: float
    available_hours: float


class CapacityUpdate(CamelModel):
    capacity_hours: float = Field(ge=0, le=168)


class EstimationOut(CamelModel):
    """Story-point / hour estimation snapshot for a task."""

    task_id: UUID
    key: str
    title: str
    estimate_hours: float | None = None
    actual_hours: float = 0
    story_points: int | None = None
    variance: float = 0
    confidence: int = Field(default=50, ge=0, le=100)


class EstimationUpdate(CamelModel):
    estimate_hours: float | None = Field(default=None, ge=0)
    story_points: int | None = Field(default=None, ge=0)
    confidence: int | None = Field(default=None, ge=0, le=100)


class RequestFormFieldSpec(CamelModel):
    key: str = Field(min_length=1, max_length=60)
    label: str = Field(min_length=1, max_length=160)
    field_type: str = "text"
    required: bool = False
    options: list[str] = Field(default_factory=list)


class RequestFormOut(CamelModel):
    id: UUID
    workspace_id: UUID
    name: str
    description: str | None = None
    schema_fields: list[RequestFormFieldSpec] = Field(default_factory=list)
    is_active: bool = True
    created_by_id: UUID | None = None
    created_at: datetime


class RequestFormCreate(CamelModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = None
    schema_fields: list[RequestFormFieldSpec] = Field(default_factory=list)


class RequestSubmissionOut(CamelModel):
    id: UUID
    workspace_id: UUID
    form_id: UUID
    submitted_by_id: UUID | None = None
    data: dict = Field(default_factory=dict)
    status: ApprovalStatus
    resulting_task_id: UUID | None = None
    created_at: datetime


class RequestSubmissionCreate(CamelModel):
    data: dict = Field(default_factory=dict)
