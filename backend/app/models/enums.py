"""Python StrEnum definitions mirroring the frontend TypeScript union types.

Keep members in sync with `lib/types/index.ts` on the frontend. Values are
stored verbatim (snake_case) as VARCHAR in the database via `sa_enum()`.
"""

from __future__ import annotations

from enum import StrEnum
from typing import TypeVar

from sqlalchemy import Enum as SAEnum

_E = TypeVar("_E", bound=StrEnum)


def sa_enum(enum_cls: type[_E], *, name: str | None = None, length: int = 32) -> SAEnum:
    """Build a SQLAlchemy Enum column type stored as plain VARCHAR (not a native PG enum).

    Using ``native_enum=False`` keeps Alembic migrations simple (adding a new
    member never requires an `ALTER TYPE ... ADD VALUE` migration).
    """
    return SAEnum(
        enum_cls,
        name=name or f"{enum_cls.__name__.lower()}",
        native_enum=False,
        length=length,
        validate_strings=True,
        values_callable=lambda cls: [member.value for member in cls],
    )


class UserStatus(StrEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    INVITED = "invited"
    SUSPENDED = "suspended"


class WorkspaceRole(StrEnum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    GUEST = "guest"
    VIEWER = "viewer"


class ProjectVisibility(StrEnum):
    PRIVATE = "private"
    TEAM = "team"
    PUBLIC = "public"


class ProjectStatus(StrEnum):
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    ARCHIVED = "archived"
    DELETED = "deleted"


class TaskStatus(StrEnum):
    BACKLOG = "backlog"
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    DONE = "done"
    BLOCKED = "blocked"
    CANCELLED = "cancelled"


class TaskPriority(StrEnum):
    HIGHEST = "highest"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    LOWEST = "lowest"


class NotificationType(StrEnum):
    MENTION = "mention"
    ASSIGNMENT = "assignment"
    COMMENT = "comment"
    DEADLINE = "deadline"
    STATUS_CHANGE = "status_change"
    SYSTEM = "system"


class PaymentStatus(StrEnum):
    PAID = "paid"
    PENDING = "pending"
    FAILED = "failed"
    REFUNDED = "refunded"


class InvoiceStatus(StrEnum):
    DRAFT = "draft"
    OPEN = "open"
    PAID = "paid"
    VOID = "void"
    OVERDUE = "overdue"


class ApprovalStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ActivityEntityType(StrEnum):
    TASK = "task"
    PROJECT = "project"
    WORKSPACE = "workspace"
    FILE = "file"
    COMMENT = "comment"
    USER = "user"
    SPRINT = "sprint"


class SprintStatus(StrEnum):
    PLANNING = "planning"
    ACTIVE = "active"
    COMPLETED = "completed"


class RoadmapStatus(StrEnum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    SHIPPED = "shipped"
    CANCELLED = "cancelled"


class OKRStatus(StrEnum):
    ON_TRACK = "on_track"
    AT_RISK = "at_risk"
    BEHIND = "behind"
    COMPLETED = "completed"


class WorkspaceStatus(StrEnum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TRIAL = "trial"


class SubscriptionStatus(StrEnum):
    TRIALING = "trialing"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    UNPAID = "unpaid"
    INCOMPLETE = "incomplete"


class FilterOperator(StrEnum):
    EQ = "eq"
    NEQ = "neq"
    CONTAINS = "contains"
    GT = "gt"
    LT = "lt"
    IN = "in"
    BETWEEN = "between"


class LogSeverity(StrEnum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class PlanStatus(StrEnum):
    ACTIVE = "active"
    DEPRECATED = "deprecated"


class InviteStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"
    REVOKED = "revoked"


class PlanInterval(StrEnum):
    """Billing interval for a `Plan` / `Subscription` (frontend: `PlanInterval`)."""

    MONTHLY = "monthly"
    YEARLY = "yearly"
