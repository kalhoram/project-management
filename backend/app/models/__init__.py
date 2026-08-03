"""Import every ORM model so `Base.metadata` is fully populated for Alembic autogenerate.

Anything added to `app/models/*.py` must be imported here, otherwise Alembic's
`--autogenerate` will not see the table and will try to drop it.
"""

from __future__ import annotations

from app.db.base import (
    AuditUserMixin,
    Base,
    SoftDeleteMixin,
    TenantMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
    VersionMixin,
)
from app.models.activity import ActivityLog, AuditLog, Notification, NotificationPreference, SavedFilter
from app.models.advanced import (
    ApprovalRequest,
    ApprovalStep,
    ApprovalWorkflow,
    CapacityPlan,
    EstimationRecord,
    OKRKeyResult,
    OKRObjective,
    ReportExportJob,
    RequestForm,
    RequestSubmission,
    RoadmapItem,
    Sprint,
    SprintTask,
    TimeEntry,
)
from app.models.billing import BillingCustomer, Invoice, Payment, Plan, Subscription
from app.models.enums import (
    ActivityEntityType,
    ApprovalStatus,
    FilterOperator,
    InvoiceStatus,
    InviteStatus,
    LogSeverity,
    NotificationType,
    OKRStatus,
    PaymentStatus,
    PlanInterval,
    PlanStatus,
    ProjectStatus,
    ProjectVisibility,
    RoadmapStatus,
    SprintStatus,
    SubscriptionStatus,
    TaskPriority,
    TaskStatus,
    UserStatus,
    WorkspaceRole,
    WorkspaceStatus,
)
from app.models.file import Attachment, FileObject, FileVersion, Folder
from app.models.project import (
    CustomField,
    CustomFieldValue,
    KanbanColumn,
    Project,
    ProjectCategory,
    ProjectMember,
)
from app.models.rbac import Permission, Role, RolePermission
from app.models.system import FeatureFlag, MaintenanceState, SystemLog
from app.models.task import (
    CommentReaction,
    Label,
    RecurringRule,
    Task,
    TaskChecklist,
    TaskChecklistItem,
    TaskComment,
    TaskDependency,
    TaskLabelLink,
)
from app.models.user import (
    EmailVerificationToken,
    OAuthAccount,
    PasswordResetToken,
    TwoFactorMethod,
    User,
    UserProfile,
    UserSession,
)
from app.models.workspace import Team, TeamMember, Workspace, WorkspaceInvite, WorkspaceMember

__all__ = [
    # Base / mixins
    "Base",
    "TimestampMixin",
    "SoftDeleteMixin",
    "UUIDPrimaryKeyMixin",
    "AuditUserMixin",
    "VersionMixin",
    "TenantMixin",
    # Enums
    "UserStatus",
    "WorkspaceRole",
    "ProjectVisibility",
    "ProjectStatus",
    "TaskStatus",
    "TaskPriority",
    "NotificationType",
    "PaymentStatus",
    "InvoiceStatus",
    "ApprovalStatus",
    "ActivityEntityType",
    "SprintStatus",
    "RoadmapStatus",
    "OKRStatus",
    "WorkspaceStatus",
    "SubscriptionStatus",
    "FilterOperator",
    "LogSeverity",
    "PlanStatus",
    "InviteStatus",
    "PlanInterval",
    # user.py
    "User",
    "UserProfile",
    "UserSession",
    "EmailVerificationToken",
    "PasswordResetToken",
    "TwoFactorMethod",
    "OAuthAccount",
    # workspace.py
    "Workspace",
    "WorkspaceMember",
    "WorkspaceInvite",
    "Team",
    "TeamMember",
    # rbac.py
    "Permission",
    "Role",
    "RolePermission",
    # project.py
    "Project",
    "ProjectCategory",
    "ProjectMember",
    "KanbanColumn",
    "CustomField",
    "CustomFieldValue",
    # task.py
    "Task",
    "Label",
    "TaskLabelLink",
    "TaskChecklist",
    "TaskChecklistItem",
    "TaskDependency",
    "TaskComment",
    "CommentReaction",
    "RecurringRule",
    # file.py
    "Folder",
    "FileObject",
    "FileVersion",
    "Attachment",
    # activity.py
    "ActivityLog",
    "Notification",
    "NotificationPreference",
    "SavedFilter",
    "AuditLog",
    # advanced.py
    "Sprint",
    "SprintTask",
    "RoadmapItem",
    "OKRObjective",
    "OKRKeyResult",
    "TimeEntry",
    "CapacityPlan",
    "RequestForm",
    "RequestSubmission",
    "ApprovalWorkflow",
    "ApprovalRequest",
    "ApprovalStep",
    "EstimationRecord",
    "ReportExportJob",
    # billing.py
    "Plan",
    "Subscription",
    "Invoice",
    "Payment",
    "BillingCustomer",
    # system.py
    "SystemLog",
    "FeatureFlag",
    "MaintenanceState",
]
