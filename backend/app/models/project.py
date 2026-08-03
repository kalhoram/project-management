"""Projects, project membership, kanban columns and custom fields."""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID as PyUUID

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin, VersionMixin
from app.models.enums import ProjectStatus, ProjectVisibility, TaskStatus, WorkspaceRole, sa_enum


class ProjectCategory(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "project_categories"
    __table_args__ = (
        UniqueConstraint("workspace_id", "name", name="uq_project_categories_workspace_name"),
    )

    name: Mapped[str] = mapped_column(Text, nullable=False)
    color: Mapped[str] = mapped_column(String(20), default="#6366f1", nullable=False)
    project_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class Project(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, VersionMixin, TenantMixin):
    __tablename__ = "projects"
    __table_args__ = (UniqueConstraint("workspace_id", "key", name="uq_projects_workspace_key"),)

    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    key: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    status: Mapped[ProjectStatus] = mapped_column(
        sa_enum(ProjectStatus), default=ProjectStatus.ACTIVE, nullable=False
    )
    visibility: Mapped[ProjectVisibility] = mapped_column(
        sa_enum(ProjectVisibility), default=ProjectVisibility.TEAM, nullable=False
    )
    category_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("project_categories.id", ondelete="SET NULL"), nullable=True
    )
    owner_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    task_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_task_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    template_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    category: Mapped["ProjectCategory | None"] = relationship()
    members: Mapped[list["ProjectMember"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    columns: Mapped[list["KanbanColumn"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Project id={self.id} key={self.key!r}>"


class ProjectMember(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "project_members"
    __table_args__ = (UniqueConstraint("project_id", "user_id", name="uq_project_members_project_user"),)

    project_id: Mapped[PyUUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[PyUUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[WorkspaceRole] = mapped_column(
        sa_enum(WorkspaceRole), default=WorkspaceRole.MEMBER, nullable=False
    )

    project: Mapped["Project"] = relationship(back_populates="members")


class KanbanColumn(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "kanban_columns"

    project_id: Mapped[PyUUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[TaskStatus] = mapped_column(sa_enum(TaskStatus), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    wip_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    color: Mapped[str] = mapped_column(String(20), default="#94a3b8", nullable=False)

    project: Mapped["Project"] = relationship(back_populates="columns")


class CustomField(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """A custom field definition, optionally scoped to a single project (else workspace-wide)."""

    __tablename__ = "custom_fields"

    project_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    field_type: Mapped[str] = mapped_column(String(32), nullable=False)
    options: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class CustomFieldValue(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """The value of a `CustomField` for a given entity (task/project), polymorphic by `entity_type`."""

    __tablename__ = "custom_field_values"
    __table_args__ = (
        UniqueConstraint(
            "custom_field_id", "entity_id", name="uq_custom_field_values_field_entity"
        ),
    )

    custom_field_id: Mapped[PyUUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("custom_fields.id", ondelete="CASCADE"), nullable=False, index=True
    )
    entity_type: Mapped[str] = mapped_column(String(32), nullable=False)
    entity_id: Mapped[PyUUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, index=True)
    value_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    value_json: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)
