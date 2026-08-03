"""Shared literal type aliases mirroring lib/types/index.ts on the frontend."""

from __future__ import annotations

from typing import Literal

UserStatus = Literal["active", "inactive", "invited", "suspended"]
WorkspaceRole = Literal["owner", "admin", "member", "guest", "viewer"]
WorkspaceStatus = Literal["active", "suspended", "trial"]
ProjectVisibility = Literal["private", "team", "public"]
ProjectStatus = Literal["active", "on_hold", "completed", "archived", "deleted"]
TaskStatus = Literal[
    "backlog",
    "todo",
    "in_progress",
    "in_review",
    "done",
    "blocked",
    "cancelled",
]
TaskPriority = Literal["highest", "high", "medium", "low", "lowest"]
NotificationType = Literal[
    "mention",
    "assignment",
    "comment",
    "deadline",
    "status_change",
    "system",
]
PlanInterval = Literal["monthly", "yearly"]
PaymentStatus = Literal["paid", "pending", "failed", "refunded"]
InvoiceStatus = Literal["draft", "open", "paid", "void", "overdue"]
ApprovalStatus = Literal["pending", "approved", "rejected"]
ActivityEntityType = Literal[
    "task",
    "project",
    "workspace",
    "file",
    "comment",
    "user",
    "sprint",
]
CommentEntityType = Literal["task", "project", "file"]
SprintStatus = Literal["planning", "active", "completed"]
RoadmapStatus = Literal["planned", "in_progress", "shipped", "cancelled"]
OKRStatus = Literal["on_track", "at_risk", "behind", "completed"]
SystemLogSeverity = Literal["info", "warning", "error", "critical"]
InviteStatus = Literal["pending", "accepted", "declined", "expired", "revoked"]
FilterScope = Literal["workspace", "project", "global"]
FilterOperator = Literal["eq", "neq", "contains", "gt", "lt", "in", "between"]
FilterVisibility = Literal["private", "shared"]
