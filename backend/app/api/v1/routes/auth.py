"""Authentication, session and account-identity endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    SessionOut,
    SignupRequest,
    TokenResponse,
    TwoFactorVerifyRequest,
    VerifyEmailRequest,
)
from app.schemas.common import EmailActionResponse, MessageResponse
from app.schemas.user import AccountUpdate, ProfileUpdate, UserOut
from app.services import auth_service
from app.services.auth_service import RequestMeta
from app.utils.rate_limit import enforce_rate_limit

router = APIRouter(prefix="/auth", tags=["auth"])
_bearer_scheme = HTTPBearer(auto_error=False)


def _request_meta(request: Request) -> RequestMeta:
    return RequestMeta(
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )


async def get_current_session_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> UUID | None:
    if credentials is None:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError:
        return None
    session_id = payload.get("sid")
    try:
        return UUID(str(session_id)) if session_id else None
    except ValueError:
        return None


@router.post("/signup", response_model=TokenResponse)
async def signup(data: SignupRequest, request: Request, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    await enforce_rate_limit(request, scope="auth-signup", suffix=data.email.lower())
    return await auth_service.signup(db, data, _request_meta(request))


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    await enforce_rate_limit(request, scope="auth-login", suffix=(data.identifier or "").lower())
    return await auth_service.login(db, data, _request_meta(request))


@router.post("/two-factor/verify", response_model=TokenResponse)
async def verify_two_factor(
    data: TwoFactorVerifyRequest, request: Request, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    return await auth_service.verify_two_factor(db, data, _request_meta(request))


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, request: Request, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    await enforce_rate_limit(request, scope="auth-refresh")
    return await auth_service.refresh(db, data.refresh_token, _request_meta(request))


@router.post("/logout", response_model=MessageResponse)
async def logout(
    session_id: UUID | None = Depends(get_current_session_id), db: AsyncSession = Depends(get_db)
) -> MessageResponse:
    if session_id is not None:
        await auth_service.logout(db, session_id)
    return MessageResponse(message="خروج با موفقیت انجام شد.")


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    data: ForgotPasswordRequest, request: Request, db: AsyncSession = Depends(get_db)
) -> MessageResponse:
    await enforce_rate_limit(request, scope="auth-forgot-password", suffix=data.email.lower())
    await auth_service.forgot_password(db, data, request.client.host if request.client else None)
    return MessageResponse(message="در صورت وجود حساب، ایمیل بازیابی رمز عبور ارسال شد.")


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    data: ResetPasswordRequest, request: Request, db: AsyncSession = Depends(get_db)
) -> MessageResponse:
    await enforce_rate_limit(request, scope="auth-reset-password")
    await auth_service.reset_password(db, data)
    return MessageResponse(message="رمز عبور با موفقیت تغییر کرد.")


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(data: VerifyEmailRequest, db: AsyncSession = Depends(get_db)) -> MessageResponse:
    await auth_service.verify_email(db, data)
    return MessageResponse(message="ایمیل با موفقیت تأیید شد.")


@router.post("/resend-verification", response_model=EmailActionResponse)
async def resend_verification(data: ResendVerificationRequest, db: AsyncSession = Depends(get_db)) -> EmailActionResponse:
    dispatched, mode = await auth_service.resend_verification(db, data)
    return EmailActionResponse(
        message="در صورت وجود حساب تأییدنشده، ایمیل تأیید ارسال شد.",
        email_dispatched=dispatched,
        delivery_mode=mode,
    )


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> UserOut:
    return await auth_service.get_me(db, current_user)


@router.patch("/me", response_model=UserOut)
async def update_profile(
    data: ProfileUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> UserOut:
    return await auth_service.update_profile(db, current_user, data)


@router.patch("/me/account", response_model=UserOut)
async def update_account(
    data: AccountUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> UserOut:
    return await auth_service.update_account(db, current_user, data)


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    data: ChangePasswordRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> MessageResponse:
    await auth_service.change_password(db, current_user, data)
    return MessageResponse(message="رمز عبور با موفقیت تغییر کرد.")


@router.get("/sessions", response_model=list[SessionOut])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    current_session_id: UUID | None = Depends(get_current_session_id),
    db: AsyncSession = Depends(get_db),
) -> list[SessionOut]:
    return await auth_service.list_sessions(db, current_user.id, current_session_id)


@router.delete("/sessions/{session_id}", response_model=MessageResponse)
async def revoke_session(
    session_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> MessageResponse:
    await auth_service.revoke_session(db, current_user.id, session_id)
    return MessageResponse(message="نشست موردنظر لغو شد.")


@router.post("/sessions/revoke-others", response_model=MessageResponse)
async def revoke_other_sessions(
    current_user: User = Depends(get_current_user),
    current_session_id: UUID | None = Depends(get_current_session_id),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    if current_session_id is not None:
        await auth_service.revoke_other_sessions(db, current_user.id, current_session_id)
    return MessageResponse(message="سایر نشست‌ها با موفقیت لغو شدند.")
