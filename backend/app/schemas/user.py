from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field

from app.schemas.common import CamelModel
from app.schemas.enums import UserStatus, WorkspaceRole


class UserOut(CamelModel):
    """Mirrors the frontend `User` interface (lib/types/index.ts) exactly."""

    id: UUID
    name: str
    email: EmailStr
    username: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    job_title: str | None = None
    status: UserStatus
    role: WorkspaceRole | None = None
    timezone: str | None = None
    language: str | None = None
    created_at: datetime
    last_active_at: datetime | None = None


class ProfileUpdate(CamelModel):
    """Fields a user may update about themselves (name, avatar, bio, etc.)."""

    name: str | None = Field(default=None, min_length=1, max_length=120)
    avatar_url: str | None = None
    bio: str | None = Field(default=None, max_length=500)
    job_title: str | None = Field(default=None, max_length=120)
    timezone: str | None = None
    language: str | None = None


class AccountUpdate(CamelModel):
    """Account-level identifiers (email/username) requiring re-verification."""

    email: EmailStr | None = None
    username: str | None = Field(default=None, min_length=3, max_length=32)
