"""Per-user settings: notification preferences, language, appearance, Google link.

- Notification preferences persist to `NotificationPreference` (one row per
  `NotificationType`, upserted lazily with sane defaults).
- Language persists directly to `User.language`.
- Appearance (theme/density/accent) has no backing column on `User` /
  `UserProfile`, so it's kept in an in-process cache and simply echoed back --
  good enough for a dev/demo deployment; the frontend already persists it
  client-side too.
- Google connect is a stub: it reports/toggles an `OAuthAccount(provider="google")`
  row without performing a real OAuth handshake (no browser redirect flow here).
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.enums import NotificationType
from app.models.activity import NotificationPreference
from app.models.user import OAuthAccount, User
from app.schemas.settings import (
    AppearancePrefs,
    GoogleConnectionOut,
    GoogleConnectUrlOut,
    LanguageUpdate,
    NotificationPreferenceOut,
    NotificationPreferencesUpdate,
)
from app.schemas.user import UserOut

_appearance_cache: dict[str, dict[str, Any]] = {}


async def list_notification_preferences(db: AsyncSession, user_id: UUID) -> list[NotificationPreferenceOut]:
    stmt = select(NotificationPreference).where(NotificationPreference.user_id == user_id)
    rows = {p.notification_type: p for p in (await db.execute(stmt)).scalars().all()}

    results: list[NotificationPreferenceOut] = []
    for notification_type in NotificationType:
        existing = rows.get(notification_type)
        if existing is not None:
            results.append(
                NotificationPreferenceOut(
                    notification_type=notification_type,
                    email_enabled=existing.email_enabled,
                    push_enabled=existing.push_enabled,
                    in_app_enabled=existing.in_app_enabled,
                )
            )
        else:
            results.append(NotificationPreferenceOut(notification_type=notification_type))
    return results


async def update_notification_preferences(
    db: AsyncSession, user_id: UUID, data: NotificationPreferencesUpdate
) -> list[NotificationPreferenceOut]:
    for pref in data.preferences:
        stmt = select(NotificationPreference).where(
            NotificationPreference.user_id == user_id,
            NotificationPreference.notification_type == pref.notification_type,
        )
        row = (await db.execute(stmt)).scalar_one_or_none()
        if row is None:
            db.add(
                NotificationPreference(
                    user_id=user_id,
                    notification_type=pref.notification_type,
                    email_enabled=pref.email_enabled,
                    push_enabled=pref.push_enabled,
                    in_app_enabled=pref.in_app_enabled,
                )
            )
        else:
            row.email_enabled = pref.email_enabled
            row.push_enabled = pref.push_enabled
            row.in_app_enabled = pref.in_app_enabled

    await db.flush()
    return await list_notification_preferences(db, user_id)


async def update_language(db: AsyncSession, user: User, data: LanguageUpdate) -> UserOut:
    user.language = data.language
    await db.flush()
    return UserOut.model_validate(user)


def get_appearance(user_id: UUID) -> AppearancePrefs:
    cached = _appearance_cache.get(str(user_id))
    return AppearancePrefs(**cached) if cached else AppearancePrefs()


def update_appearance(user_id: UUID, data: AppearancePrefs) -> AppearancePrefs:
    _appearance_cache[str(user_id)] = data.model_dump()
    return data


async def get_google_connection(db: AsyncSession, user_id: UUID) -> GoogleConnectionOut:
    stmt = select(OAuthAccount).where(OAuthAccount.user_id == user_id, OAuthAccount.provider == "google")
    account = (await db.execute(stmt)).scalar_one_or_none()
    if account is None:
        return GoogleConnectionOut(connected=False)
    return GoogleConnectionOut(
        connected=True,
        email=account.provider_account_id,
        connected_at=account.created_at.isoformat(),
    )


def get_google_connect_url(user_id: UUID) -> GoogleConnectUrlOut:
    settings = get_settings()
    authorize_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.google_client_id}"
        f"&redirect_uri={settings.google_redirect_uri}"
        "&response_type=code&scope=openid%20email%20profile"
        f"&state={user_id}"
    )
    return GoogleConnectUrlOut(authorize_url=authorize_url)


async def disconnect_google(db: AsyncSession, user_id: UUID) -> None:
    stmt = select(OAuthAccount).where(OAuthAccount.user_id == user_id, OAuthAccount.provider == "google")
    account = (await db.execute(stmt)).scalar_one_or_none()
    if account is not None:
        await db.delete(account)
