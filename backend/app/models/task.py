"""Tasks and everything that hangs off a task: labels, checklists, comments, deps."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID as PyUUID

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin, VersionMixin
from app.models.enums import TaskPriority, TaskStatus, sa_enum


class TaskLabelLink(Base, TimestampMixin):
    """Many-to-many join between `Task` and `Label`. Declared first so it can be
    used as the `secondary=` table object for both sides' relationships."""

    __tablename__ = "task_label_links"

    task_id: Mapped[PyUUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True
    )
    label_id: Mapped[PyUUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True
    )


class Task(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, VersionMixin, TenantMixin):
    __tablename__ = "tasks"

    project_id: Mapped[PyUUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    key: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(sa_enum(TaskStatus), default=TaskStatus.TODO, nullable=False)
    priority: Mapped[TaskPriority] = mapped_column(
        sa_enum(TaskPriority), default=TaskPriority.MEDIUM, nullable=False
    )
    assignee_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    reporter_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    estimate_hours: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    actual_hours: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    story_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    column_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("kanban_columns.id", ondelete="SET NULL"), nullable=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    parent_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True
    )
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    recurring_rule_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("recurring_rules.id", ondelete="SET NULL"), nullable=True
    )
    attachment_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    comment_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    parent: Mapped["Task | None"] = relationship(
        remote_side="Task.id", back_populates="subtasks", foreign_keys=[parent_id]
    )
    subtasks: Mapped[list["Task"]] = relationship(back_populates="parent", foreign_keys=[parent_id])
    labels: Mapped[list["Label"]] = relationship(secondary=TaskLabelLink.__table__, back_populates="tasks")
    checklists: Mapped[list["TaskChecklist"]] = relationship(
        back_populates="task", cascade="all, delete-orphan"
    )
    comments: Mapped[list["TaskComment"]] = relationship(
        back_populates="task", cascade="all, delete-orphan"
    )
    recurring_rule: Mapped["RecurringRule | None"] = relationship(foreign_keys=[recurring_rule_id])

    def __repr__(self) -> str:
        return f"<Task id={self.id} key={self.key!r}>"


class Label(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "labels"
    __table_args__ = (UniqueConstraint("workspace_id", "name", name="uq_labels_workspace_name"),)

    name: Mapped[str] = mapped_column(Text, nullable=False)
    color: Mapped[str] = mapped_column(String(20), default="#64748b", nullable=False)

    tasks: Mapped[list["Task"]] = relationship(secondary=TaskLabelLink.__table__, back_populates="labels")


class TaskChecklist(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "task_checklists"

    task_id: Mapped[PyUUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    task: Mapped["Task"] = relationship(back_populates="checklists")
    items: Mapped[list["TaskChecklistItem"]] = relationship(
        back_populates="checklist", cascade="all, delete-orphan"
    )


class TaskChecklistItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "task_checklist_items"

    checklist_id: Mapped[PyUUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("task_checklists.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    assignee_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    checklist: Mapped["TaskChecklist"] = relationship(back_populates="items")


class TaskDependency(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """`task_id` is blocked by `depends_on_task_id` (frontend: `blockedByIds`/`blockingIds`)."""

    __tablename__ = "task_dependencies"
    __table_args__ = (
        UniqueConstraint("task_id", "depends_on_task_id", name="uq_task_dependencies_task_depends_on"),
    )

    task_id: Mapped[PyUUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    depends_on_task_id: Mapped[PyUUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    dependency_type: Mapped[str] = mapped_column(String(20), default="blocks", nullable=False)


class TaskComment(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "task_comments"

    task_id: Mapped[PyUUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    mentions: Mapped[list[PyUUID]] = mapped_column(ARRAY(PGUUID(as_uuid=True)), default=list, nullable=False)
    parent_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("task_comments.id", ondelete="SET NULL"), nullable=True
    )

    task: Mapped["Task"] = relationship(back_populates="comments")
    reactions: Mapped[list["CommentReaction"]] = relationship(
        back_populates="comment", cascade="all, delete-orphan"
    )


class CommentReaction(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "comment_reactions"
    __table_args__ = (
        UniqueConstraint(
            "comment_id", "user_id", "emoji", name="uq_comment_reactions_comment_user_emoji"
        ),
    )

    comment_id: Mapped[PyUUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("task_comments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[PyUUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    emoji: Mapped[str] = mapped_column(String(16), nullable=False)

    comment: Mapped["TaskComment"] = relationship(back_populates="reactions")


class RecurringRule(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "recurring_rules"

    frequency: Mapped[str] = mapped_column(String(20), nullable=False)
    interval: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    days_of_week: Mapped[list[int]] = mapped_column(ARRAY(Integer), default=list, nullable=False)
    day_of_month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    occurrences: Mapped[int | None] = mapped_column(Integer, nullable=True)
    next_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_task_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True
    )
