"""User-level settings: notification preferences, language, appearance, Google link.

New schema module (no existing contract to break) backing `app.services.settings_service`.
"""

from __future__ import annotations

from pydantic import Field

from app.schemas.common import CamelModel
from app.schemas.enums import NotificationType


class NotificationPreferenceOut(CamelModel):
    notification_type: NotificationType
    email_enabled: bool = True
    push_enabled: bool = True
    in_app_enabled: bool = True


class NotificationPreferenceUpdate(CamelModel):
    email_enabled: bool | None = None
    push_enabled: bool | None = None
    in_app_enabled: bool | None = None


class NotificationPreferencesUpdate(CamelModel):
    preferences: list[NotificationPreferenceOut] = Field(default_factory=list)


class LanguageUpdate(CamelModel):
    language: str = Field(min_length=2, max_length=10)


class AppearancePrefs(CamelModel):
    """Not backed by a DB column today; echoed back for the frontend to persist client-side."""

    theme: str = "system"
    density: str = "comfortable"
    accent_color: str = "#6366f1"


class GoogleConnectionOut(CamelModel):
    connected: bool
    email: str | None = None
    connected_at: str | None = None


class GoogleConnectUrlOut(CamelModel):
    authorize_url: str
