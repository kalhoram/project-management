from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field

from app.schemas.common import CamelModel
from app.schemas.enums import SystemLogSeverity
from app.schemas.project import ProjectOut
from app.schemas.user import UserOut
from app.schemas.workspace import WorkspaceOut


class AdminDashboard(CamelModel):
    total_workspaces: int
    total_users: int
    total_projects: int
    total_tasks: int
    active_subscriptions: int
    mrr: float
    new_users_last_30_days: int
    new_workspaces_last_30_days: int
    storage_used_gb: float


class AdminUserDetail(CamelModel):
    user: UserOut
    workspaces: list[WorkspaceOut] = Field(default_factory=list)
    projects: list[ProjectOut] = Field(default_factory=list)


class AdminWorkspaceDetail(CamelModel):
    workspace: WorkspaceOut
    projects: list[ProjectOut] = Field(default_factory=list)
    members: list[UserOut] = Field(default_factory=list)


class ReportSeriesPoint(CamelModel):
    label: str
    count: int


class AdminReports(CamelModel):
    active_users: list[ReportSeriesPoint] = Field(default_factory=list)
    workspace_growth: list[ReportSeriesPoint] = Field(default_factory=list)
    errors: list[ReportSeriesPoint] = Field(default_factory=list)


class FeatureFlagsOut(CamelModel):
    ai_assist: bool = False
    advanced_reports: bool = True
    sso: bool = False
    beta_kanban: bool = True
    export_pdf: bool = True


class AdminSettingsFull(CamelModel):
    """`getAdminSettings()` shape expected by `lib/api/advanced.service.ts`."""

    maintenance_mode: bool
    feature_flags: FeatureFlagsOut
    support_email: str
    max_upload_mb: int


class AdminSettingsFullUpdate(CamelModel):
    maintenance_mode: bool | None = None
    maintenance_message: str | None = None
    feature_flags: dict[str, bool] | None = None
    support_email: str | None = None
    max_upload_mb: int | None = None


class AdminSettings(CamelModel):
    maintenance_mode: bool
    email_enabled: bool
    registration_enabled: bool = True
    default_timezone: str
    default_locale: str
    password_min_length: int
    rate_limit_login: int


class AdminSettingsUpdate(CamelModel):
    maintenance_mode: bool | None = None
    email_enabled: bool | None = None
    registration_enabled: bool | None = None
    default_timezone: str | None = None
    default_locale: str | None = None


class SystemLogOut(CamelModel):
    id: UUID
    severity: SystemLogSeverity
    source: str
    message: str
    details: dict[str, Any] | None = None
    created_at: datetime
