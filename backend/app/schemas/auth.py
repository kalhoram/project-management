from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field, field_validator, model_validator

from app.schemas.common import CamelModel
from app.schemas.user import UserOut


class LoginRequest(CamelModel):
    """Login accepts email or username via `identifier`, or legacy frontend `email` alias."""

    identifier: str | None = Field(default=None, min_length=1, max_length=255)
    email: str | None = Field(default=None, min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=255)
    remember_me: bool = False

    @model_validator(mode="after")
    def resolve_identifier(self) -> LoginRequest:
        resolved = (self.identifier or self.email or "").strip()
        if not resolved:
            raise ValueError("ایمیل یا نام کاربری الزامی است.")
        self.identifier = resolved
        return self


class SignupRequest(CamelModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=255)
    username: str | None = Field(default=None, min_length=3, max_length=32)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        if not any(c.isdigit() for c in value) or not any(c.isalpha() for c in value):
            raise ValueError("رمز عبور باید ترکیبی از حروف و اعداد باشد.")
        return value


class TokenResponse(CamelModel):
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str = "bearer"
    expires_in: int | None = None
    user: UserOut | None = None
    requires_two_factor: bool = False
    two_factor_token: str | None = None


class RefreshRequest(CamelModel):
    refresh_token: str = Field(min_length=1)


class ForgotPasswordRequest(CamelModel):
    email: EmailStr


class ResetPasswordRequest(CamelModel):
    token: str = Field(min_length=1)
    password: str = Field(min_length=8, max_length=255)


class VerifyEmailRequest(CamelModel):
    token: str = Field(min_length=1)


class ResendVerificationRequest(CamelModel):
    email: EmailStr


class TwoFactorVerifyRequest(CamelModel):
    two_factor_token: str = Field(min_length=1)
    code: str = Field(min_length=6, max_length=8)


class ChangePasswordRequest(CamelModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=255)


class SessionOut(CamelModel):
    """Mirrors the frontend `Session` interface."""

    id: UUID
    device: str
    browser: str
    location: str
    ip: str
    last_active_at: datetime
    current: bool
