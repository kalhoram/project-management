from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field

from app.schemas.common import CamelModel
from app.schemas.enums import InviteStatus, ProjectVisibility, WorkspaceRole, WorkspaceStatus
from app.schemas.user import UserOut


class WorkspaceOut(CamelModel):
    id: UUID
    name: str
    slug: str
    logo_url: str | None = None
    description: str | None = None
    industry: str | None = None
    company_size: str | None = None
    timezone: str
    default_visibility: ProjectVisibility
    plan_id: UUID | None = None
    owner_id: UUID
    member_count: int
    project_count: int
    created_at: datetime
    status: WorkspaceStatus


class WorkspaceCreate(CamelModel):
    name: str = Field(min_length=1, max_length=120)
    slug: str | None = Field(default=None, min_length=2, max_length=60)
    description: str | None = Field(default=None, max_length=500)
    industry: str | None = None
    company_size: str | None = None
    timezone: str | None = None
    default_visibility: ProjectVisibility = "private"


class WorkspaceUpdate(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    slug: str | None = Field(default=None, min_length=2, max_length=60)
    logo_url: str | None = None
    description: str | None = Field(default=None, max_length=500)
    industry: str | None = None
    company_size: str | None = None
    timezone: str | None = None
    default_visibility: ProjectVisibility | None = None


class TeamOut(CamelModel):
    id: UUID
    workspace_id: UUID
    name: str
    description: str | None = None
    department: str | None = None
    lead_id: UUID | None = None
    member_ids: list[UUID] = Field(default_factory=list)
    color: str


class TeamCreate(CamelModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None
    department: str | None = None
    lead_id: UUID | None = None
    member_ids: list[UUID] = Field(default_factory=list)
    color: str = "#6366f1"


class TeamUpdate(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = None
    department: str | None = None
    lead_id: UUID | None = None
    member_ids: list[UUID] | None = None
    color: str | None = None


class PermissionOut(CamelModel):
    id: str
    key: str
    label: str
    description: str
    category: str


class RoleOut(CamelModel):
    id: UUID
    workspace_id: UUID
    name: str
    description: str
    is_system: bool
    permissions: list[str] = Field(default_factory=list)
    member_count: int


class RoleCreate(CamelModel):
    name: str = Field(min_length=1, max_length=80)
    description: str = ""
    permissions: list[str] = Field(default_factory=list)


class RoleUpdate(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    description: str | None = None
    permissions: list[str] | None = None


class MemberOut(CamelModel):
    """A workspace member, combining the user profile with their workspace role."""

    user: UserOut
    workspace_id: UUID
    role: WorkspaceRole
    team_ids: list[UUID] = Field(default_factory=list)
    joined_at: datetime


class MemberInvite(CamelModel):
    email: EmailStr
    role: WorkspaceRole = "member"
    team_ids: list[UUID] = Field(default_factory=list)


class InviteOut(CamelModel):
    id: UUID
    workspace_id: UUID
    email: EmailStr
    role: WorkspaceRole
    status: InviteStatus
    invited_by_id: UUID | None = None
    expires_at: datetime
    created_at: datetime
    accepted_at: datetime | None = None


class AcceptInviteRequest(CamelModel):
    token: str = Field(min_length=1)


class MemberRoleUpdate(CamelModel):
    role: WorkspaceRole


class OnboardingInvite(CamelModel):
    email: EmailStr
    role: WorkspaceRole = "member"


class OnboardingComplete(CamelModel):
    workspace_name: str = Field(min_length=1, max_length=120)
    slug: str | None = Field(default=None, min_length=2, max_length=60)
    industry: str | None = None
    company_size: str | None = None
    timezone: str | None = None
    invites: list[OnboardingInvite] = Field(default_factory=list)
    template_id: str | None = None
    project_name: str | None = None
