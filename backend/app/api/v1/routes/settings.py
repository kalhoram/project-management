"""User settings: profile, account, password, sessions, notifications, language, appearance, Google."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.routes.auth import get_current_session_id
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, SessionOut
from app.schemas.common import MessageResponse
from app.schemas.settings import (
    AppearancePrefs,
    GoogleConnectionOut,
    GoogleConnectUrlOut,
    LanguageUpdate,
    NotificationPreferenceOut,
    NotificationPreferencesUpdate,
)
from app.schemas.user import AccountUpdate, ProfileUpdate, UserOut
from app.services import auth_service, settings_service

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/profile", response_model=UserOut)
async def get_profile(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)


@router.patch("/profile", response_model=UserOut)
async def update_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    return await auth_service.update_profile(db, current_user, data)


@router.get("/account", response_model=UserOut)
async def get_account(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)


@router.patch("/account", response_model=UserOut)
async def update_account(
    data: AccountUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    return await auth_service.update_account(db, current_user, data)


@router.post("/password", response_model=MessageResponse)
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await auth_service.change_password(db, current_user, data)
    return MessageResponse(success=True, message="رمز عبور با موفقیت تغییر کرد.")


@router.get("/sessions", response_model=list[SessionOut])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    current_session_id: UUID | None = Depends(get_current_session_id),
    db: AsyncSession = Depends(get_db),
) -> list[SessionOut]:
    return await auth_service.list_sessions(db, current_user.id, current_session_id)


@router.delete("/sessions/{session_id}", response_model=MessageResponse)
async def revoke_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await auth_service.revoke_session(db, current_user.id, session_id)
    return MessageResponse(success=True, message="نشست با موفقیت لغو شد.")


@router.get("/notifications", response_model=list[NotificationPreferenceOut])
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[NotificationPreferenceOut]:
    return await settings_service.list_notification_preferences(db, current_user.id)


@router.patch("/notifications", response_model=list[NotificationPreferenceOut])
async def update_notification_preferences(
    data: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[NotificationPreferenceOut]:
    return await settings_service.update_notification_preferences(db, current_user.id, data)


@router.get("/language", response_model=UserOut)
async def get_language(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)


@router.patch("/language", response_model=UserOut)
async def update_language(
    data: LanguageUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    return await settings_service.update_language(db, current_user, data)


@router.get("/appearance", response_model=AppearancePrefs)
async def get_appearance(current_user: User = Depends(get_current_user)) -> AppearancePrefs:
    return settings_service.get_appearance(current_user.id)


@router.patch("/appearance", response_model=AppearancePrefs)
async def update_appearance(
    data: AppearancePrefs,
    current_user: User = Depends(get_current_user),
) -> AppearancePrefs:
    return settings_service.update_appearance(current_user.id, data)


@router.get("/google", response_model=GoogleConnectionOut)
async def get_google_connection(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GoogleConnectionOut:
    return await settings_service.get_google_connection(db, current_user.id)


@router.post("/google/connect", response_model=GoogleConnectUrlOut)
async def connect_google(current_user: User = Depends(get_current_user)) -> GoogleConnectUrlOut:
    return settings_service.get_google_connect_url(current_user.id)


@router.delete("/google", response_model=MessageResponse)
async def disconnect_google(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await settings_service.disconnect_google(db, current_user.id)
    return MessageResponse(success=True, message="اتصال گوگل قطع شد.")
