"""Sprints, roadmap, OKRs, time tracking, capacity, requests/approvals and reporting jobs."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID as PyUUID

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import ApprovalStatus, OKRStatus, RoadmapStatus, SprintStatus, sa_enum


class Sprint(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "sprints"

    project_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    goal: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[SprintStatus] = mapped_column(
        sa_enum(SprintStatus), default=SprintStatus.PLANNING, nullable=False
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    committed_points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    sprint_tasks: Mapped[list["SprintTask"]] = relationship(
        back_populates="sprint", cascade="all, delete-orphan"
    )


class SprintTask(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "sprint_tasks"
    __table_args__ = (UniqueConstraint("sprint_id", "task_id", name="uq_sprint_tasks_sprint_task"),)

    sprint_id: Mapped[PyUUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("sprints.id", ondelete="CASCADE"), nullable=False, index=True
    )
    task_id: Mapped[PyUUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True
    )

    sprint: Mapped["Sprint"] = relationship(back_populates="sprint_tasks")


class RoadmapItem(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "roadmap_items"

    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[RoadmapStatus] = mapped_column(
        sa_enum(RoadmapStatus), default=RoadmapStatus.PLANNED, nullable=False
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    owner_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    initiative: Mapped[str | None] = mapped_column(Text, nullable=True)
    release: Mapped[str | None] = mapped_column(Text, nullable=True)


class OKRObjective(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "okr_objectives"

    objective: Mapped[str] = mapped_column(Text, nullable=False)
    owner_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    confidence: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    period: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[OKRStatus] = mapped_column(
        sa_enum(OKRStatus), default=OKRStatus.ON_TRACK, nullable=False
    )

    key_results: Mapped[list["OKRKeyResult"]] = relationship(
        back_populates="objective", cascade="all, delete-orphan"
    )


class OKRKeyResult(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "okr_key_results"

    objective_id: Mapped[PyUUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("okr_objectives.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    target: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    current: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    objective: Mapped["OKRObjective"] = relationship(back_populates="key_results")


class TimeEntry(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "time_entries"

    task_id: Mapped[PyUUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    hours: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    billable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class CapacityPlan(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """Planned vs. allocated capacity for a user or team over a period."""

    __tablename__ = "capacity_plans"

    user_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    team_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=True, index=True
    )
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    capacity_hours: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=0, nullable=False)
    allocated_hours: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=0, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class RequestForm(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """A configurable intake-form template (e.g. bug report, access request)."""

    __tablename__ = "request_forms"

    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    schema_definition: Mapped[list] = mapped_column("schema", JSONB, default=list, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    submissions: Mapped[list["RequestSubmission"]] = relationship(
        back_populates="form", cascade="all, delete-orphan"
    )


class RequestSubmission(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "request_submissions"

    form_id: Mapped[PyUUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("request_forms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    submitted_by_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    data: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    status: Mapped[ApprovalStatus] = mapped_column(
        sa_enum(ApprovalStatus), default=ApprovalStatus.PENDING, nullable=False
    )
    resulting_task_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True
    )

    form: Mapped["RequestForm"] = relationship(back_populates="submissions")


class ApprovalWorkflow(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """Reusable, multi-step approval workflow template for a given entity type."""

    __tablename__ = "approval_workflows"

    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    entity_type: Mapped[str] = mapped_column(String(32), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    steps: Mapped[list["ApprovalStep"]] = relationship(
        back_populates="workflow", cascade="all, delete-orphan"
    )


class ApprovalStep(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A single ordered step definition within an `ApprovalWorkflow` template."""

    __tablename__ = "approval_steps"

    workflow_id: Mapped[PyUUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("approval_workflows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    approver_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approver_role: Mapped[str | None] = mapped_column(String(32), nullable=True)

    workflow: Mapped["ApprovalWorkflow"] = relationship(back_populates="steps")


class ApprovalRequest(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """A concrete, in-flight approval request (frontend: `ApprovalRequest`)."""

    __tablename__ = "approval_requests"

    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    requester_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approver_ids: Mapped[list[PyUUID]] = mapped_column(
        ARRAY(PGUUID(as_uuid=True)), default=list, nullable=False
    )
    status: Mapped[ApprovalStatus] = mapped_column(
        sa_enum(ApprovalStatus), default=ApprovalStatus.PENDING, nullable=False
    )
    entity_type: Mapped[str] = mapped_column(String(32), nullable=False)
    entity_id: Mapped[PyUUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, index=True)
    workflow_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("approval_workflows.id", ondelete="SET NULL"), nullable=True
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class EstimationRecord(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """A single estimate (e.g. planning-poker vote) cast for a task."""

    __tablename__ = "estimation_records"

    task_id: Mapped[PyUUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    estimator_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    estimate_value: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    estimate_type: Mapped[str] = mapped_column(String(20), default="story_points", nullable=False)
    session_id: Mapped[PyUUID | None] = mapped_column(PGUUID(as_uuid=True), nullable=True, index=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)


class ReportExportJob(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """An async job that renders a report to PDF/XLSX/CSV for download."""

    __tablename__ = "report_export_jobs"

    requested_by_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    report_type: Mapped[str] = mapped_column(Text, nullable=False)
    format: Mapped[str] = mapped_column(String(10), default="pdf", nullable=False)
    filters: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    file_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
