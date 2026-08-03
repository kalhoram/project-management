"""Authentication & account business logic.

Aligned with the real ORM models in app.models.user / app.models.workspace:

- User: id, name, email, username, password_hash, avatar_url, bio, job_title,
  status (UserStatus), timezone, language, is_system_admin, is_email_verified,
  last_active_at, created_at.
- UserSession: id, user_id, refresh_token_hash, device, browser, ip_address,
  location, user_agent, is_current, expires_at, revoked_at, created_at,
  updated_at (used as a last-active proxy).
- EmailVerificationToken / PasswordResetToken: id, user_id, token_hash,
  expires_at, consumed_at, created_at (PasswordResetToken also has requested_ip).
- TwoFactorMethod: id, user_id, method_type ("totp"), secret, is_enabled,
  is_primary, backup_codes, verified_at.
- WorkspaceMember (app.models.workspace): workspace_id, user_id, role, joined_at.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from jose import JWTError, jwt
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.services.email_dispatch import send_verification_email
from app.core.exceptions import AppError, AuthError, ConflictError, NotFoundError
from app.core.security import (
    create_access_token,
    generate_opaque_token,
    generate_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.user import (
    EmailVerificationToken,
    PasswordResetToken,
    TwoFactorMethod,
    User,
    UserSession,
)
from app.models.workspace import WorkspaceMember
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    SessionOut,
    SignupRequest,
    TokenResponse,
    TwoFactorVerifyRequest,
    VerifyEmailRequest,
)
from app.schemas.user import AccountUpdate, ProfileUpdate, UserOut

_TWO_FACTOR_TOKEN_TYPE = "2fa_pending"
_TWO_FACTOR_TOKEN_TTL_MINUTES = 5
_PASSWORD_RESET_TOKEN_TTL_HOURS = 2
_EMAIL_VERIFICATION_TOKEN_TTL_HOURS = 48


class RequestMeta:
    """Client metadata captured for a session, supplied by the router layer."""

    def __init__(
        self,
        device: str | None = None,
        browser: str | None = None,
        ip: str | None = None,
        location: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        self.device = device
        self.browser = browser
        self.ip = ip
        self.location = location
        self.user_agent = user_agent


async def _get_primary_role(db: AsyncSession, user_id: UUID) -> str | None:
    stmt = (
        select(WorkspaceMember.role)
        .where(WorkspaceMember.user_id == user_id, WorkspaceMember.is_active.is_(True))
        .order_by(WorkspaceMember.joined_at.asc())
        .limit(1)
    )
    role = (await db.execute(stmt)).scalar_one_or_none()
    return role.value if hasattr(role, "value") else role


async def _to_user_out(db: AsyncSession, user: User) -> UserOut:
    role = await _get_primary_role(db, user.id)
    return UserOut.model_validate(user).model_copy(update={"role": role})


async def _find_user_by_identifier(db: AsyncSession, identifier: str) -> User | None:
    key = identifier.strip().lower()
    stmt = select(User).where((User.email == key) | (User.username == key))
    return (await db.execute(stmt)).scalar_one_or_none()


async def _get_enabled_totp_method(db: AsyncSession, user_id: UUID) -> TwoFactorMethod | None:
    stmt = select(TwoFactorMethod).where(
        TwoFactorMethod.user_id == user_id,
        TwoFactorMethod.method_type == "totp",
        TwoFactorMethod.is_enabled.is_(True),
    )
    return (await db.execute(stmt)).scalars().first()


async def _create_session(db: AsyncSession, user: User, meta: RequestMeta) -> tuple[UserSession, str, str]:
    settings = get_settings()
    refresh_token = generate_refresh_token()
    now = datetime.now(UTC)
    session = UserSession(
        user_id=user.id,
        refresh_token_hash=hash_token(refresh_token),
        device=meta.device or "نامشخص",
        browser=meta.browser or "نامشخص",
        ip_address=meta.ip or "0.0.0.0",
        location=meta.location or "نامشخص",
        user_agent=meta.user_agent,
        expires_at=now + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(session)
    await db.flush()
    access_token = create_access_token(user.id, session_id=session.id)
    return session, access_token, refresh_token


def _encode_two_factor_token(user_id: UUID) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "typ": _TWO_FACTOR_TOKEN_TYPE,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=_TWO_FACTOR_TOKEN_TTL_MINUTES)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _decode_two_factor_token(token: str) -> UUID:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise AuthError("کد تأیید منقضی شده است. دوباره وارد شوید.") from exc
    if payload.get("typ") != _TWO_FACTOR_TOKEN_TYPE:
        raise AuthError("توکن نامعتبر است.")
    return UUID(str(payload["sub"]))


async def _issue_tokens(db: AsyncSession, user: User, meta: RequestMeta) -> TokenResponse:
    settings = get_settings()
    session, access_token, refresh_token = await _create_session(db, user, meta)
    user.last_active_at = datetime.now(UTC)
    user_out = await _to_user_out(db, user)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
        user=user_out,
        requires_two_factor=False,
    )


async def signup(db: AsyncSession, data: SignupRequest, meta: RequestMeta) -> TokenResponse:
    email = data.email.strip().lower()
    existing_stmt = select(User).where(
        (User.email == email) | ((User.username == data.username) if data.username else False)
    )
    if (await db.execute(existing_stmt)).scalar_one_or_none() is not None:
        raise ConflictError("حسابی با این ایمیل یا نام کاربری قبلاً ثبت شده است.")

    user = User(
        name=data.name.strip(),
        email=email,
        username=data.username,
        password_hash=hash_password(data.password),
        status="active",
    )
    db.add(user)
    await db.flush()

    await _dispatch_verification_email(db, user)
    return await _issue_tokens(db, user, meta)


async def login(db: AsyncSession, data: LoginRequest, meta: RequestMeta) -> TokenResponse:
    user = await _find_user_by_identifier(db, data.identifier)
    if user is None or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise AuthError("ایمیل/نام کاربری یا رمز عبور نامعتبر است.")
    if user.status == "suspended":
        raise AuthError("حساب کاربری شما مسدود شده است.", code="ACCOUNT_SUSPENDED")

    totp_method = await _get_enabled_totp_method(db, user.id)
    if totp_method is not None:
        return TokenResponse(
            requires_two_factor=True,
            two_factor_token=_encode_two_factor_token(user.id),
        )

    return await _issue_tokens(db, user, meta)


async def verify_two_factor(
    db: AsyncSession, data: TwoFactorVerifyRequest, meta: RequestMeta
) -> TokenResponse:
    import pyotp

    user_id = _decode_two_factor_token(data.two_factor_token)
    user = await db.get(User, user_id)
    if user is None:
        raise AuthError("کاربر یافت نشد.")

    totp_method = await _get_enabled_totp_method(db, user_id)
    if totp_method is None or not totp_method.secret:
        raise AuthError("احراز هویت دومرحله‌ای برای این حساب فعال نیست.")
    if not pyotp.TOTP(totp_method.secret).verify(data.code, valid_window=1):
        raise AuthError("کد تأیید نامعتبر است.")

    return await _issue_tokens(db, user, meta)


async def refresh(db: AsyncSession, refresh_token: str, meta: RequestMeta) -> TokenResponse:
    settings = get_settings()
    token_hash = hash_token(refresh_token)
    stmt = select(UserSession).where(UserSession.refresh_token_hash == token_hash)
    session = (await db.execute(stmt)).scalar_one_or_none()
    now = datetime.now(UTC)
    if session is None or session.revoked_at is not None or session.expires_at < now:
        raise AuthError("نشست شما منقضی شده است. لطفاً دوباره وارد شوید.", code="SESSION_EXPIRED")

    user = await db.get(User, session.user_id)
    if user is None or user.status == "suspended":
        raise AuthError("کاربر یافت نشد یا مسدود شده است.")

    new_refresh_token = generate_refresh_token()
    session.refresh_token_hash = hash_token(new_refresh_token)
    session.expires_at = now + timedelta(days=settings.refresh_token_expire_days)
    session.device = meta.device or session.device
    session.browser = meta.browser or session.browser
    session.ip_address = meta.ip or session.ip_address

    access_token = create_access_token(user.id, session_id=session.id)
    user_out = await _to_user_out(db, user)
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
        user=user_out,
    )


async def logout(db: AsyncSession, session_id: UUID) -> None:
    session = await db.get(UserSession, session_id)
    if session is not None and session.revoked_at is None:
        session.revoked_at = datetime.now(UTC)


async def _create_password_reset_token(db: AsyncSession, user: User, ip: str | None = None) -> str:
    token = generate_opaque_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(token),
            requested_ip=ip,
            expires_at=datetime.now(UTC) + timedelta(hours=_PASSWORD_RESET_TOKEN_TTL_HOURS),
        )
    )
    return token


async def forgot_password(db: AsyncSession, data: ForgotPasswordRequest, ip: str | None = None) -> None:
    stmt = select(User).where(User.email == data.email.strip().lower())
    user = (await db.execute(stmt)).scalar_one_or_none()
    if user is not None:
        await _create_password_reset_token(db, user, ip)
    # Always succeed silently to avoid leaking whether an email is registered.


async def reset_password(db: AsyncSession, data: ResetPasswordRequest) -> None:
    token_hash = hash_token(data.token)
    stmt = select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
    reset_token = (await db.execute(stmt)).scalar_one_or_none()
    now = datetime.now(UTC)
    if reset_token is None or reset_token.consumed_at is not None or reset_token.expires_at < now:
        raise AuthError("لینک بازیابی رمز عبور نامعتبر یا منقضی شده است.", code="RESET_TOKEN_INVALID")

    user = await db.get(User, reset_token.user_id)
    if user is None:
        raise NotFoundError("کاربر یافت نشد.")

    user.password_hash = hash_password(data.password)
    reset_token.consumed_at = now
    await db.execute(
        update(UserSession)
        .where(UserSession.user_id == user.id, UserSession.revoked_at.is_(None))
        .values(revoked_at=now)
    )


async def _create_email_verification_token(db: AsyncSession, user: User) -> str:
    await db.execute(
        delete(EmailVerificationToken).where(
            EmailVerificationToken.user_id == user.id,
            EmailVerificationToken.consumed_at.is_(None),
        )
    )
    token = generate_opaque_token()
    db.add(
        EmailVerificationToken(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=datetime.now(UTC) + timedelta(hours=_EMAIL_VERIFICATION_TOKEN_TTL_HOURS),
        )
    )
    return token


async def _dispatch_verification_email(db: AsyncSession, user: User) -> tuple[bool, str]:
    token = await _create_email_verification_token(db, user)
    dispatched, mode = await send_verification_email(to=user.email, token=token)
    if not dispatched:
        raise AppError(
            "ارسال ایمیل تأیید ممکن نشد. لطفاً بعداً دوباره تلاش کنید.",
            code="EMAIL_DISPATCH_FAILED",
            status_code=503,
        )
    return dispatched, mode


async def verify_email(db: AsyncSession, data: VerifyEmailRequest) -> None:
    token_hash = hash_token(data.token)
    stmt = select(EmailVerificationToken).where(EmailVerificationToken.token_hash == token_hash)
    record = (await db.execute(stmt)).scalar_one_or_none()
    now = datetime.now(UTC)
    if record is None or record.consumed_at is not None or record.expires_at < now:
        raise AuthError("لینک تأیید ایمیل نامعتبر یا منقضی شده است.", code="VERIFY_TOKEN_INVALID")

    user = await db.get(User, record.user_id)
    if user is None:
        raise NotFoundError("کاربر یافت نشد.")

    user.is_email_verified = True
    record.consumed_at = now


async def resend_verification(db: AsyncSession, data: ResendVerificationRequest) -> tuple[bool, str | None]:
    stmt = select(User).where(User.email == data.email.strip().lower())
    user = (await db.execute(stmt)).scalar_one_or_none()
    if user is None or user.is_email_verified:
        # Anti-enumeration: generic success without dispatching.
        return False, None
    await _dispatch_verification_email(db, user)
    settings = get_settings()
    mode = "smtp" if settings.email_enabled else "console"
    return True, mode


async def change_password(db: AsyncSession, user: User, data: ChangePasswordRequest) -> None:
    if not user.password_hash or not verify_password(data.current_password, user.password_hash):
        raise AuthError("رمز عبور فعلی نادرست است.")
    user.password_hash = hash_password(data.new_password)


async def update_profile(db: AsyncSession, user: User, data: ProfileUpdate) -> UserOut:
    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(user, field, value)
    await db.flush()
    return await _to_user_out(db, user)


async def get_me(db: AsyncSession, user: User) -> UserOut:
    return await _to_user_out(db, user)


async def update_account(db: AsyncSession, user: User, data: AccountUpdate) -> UserOut:
    """Update account-level identifiers (email/username); re-verification of a
    changed email is intentionally out of scope here (would require wiring a
    new verification-token send through `app.integrations.email`)."""
    if data.email is not None:
        new_email = data.email.strip().lower()
        if new_email != user.email:
            stmt = select(User).where(User.email == new_email)
            if (await db.execute(stmt)).scalar_one_or_none() is not None:
                raise ConflictError("این ایمیل قبلاً توسط حساب دیگری استفاده شده است.")
            user.email = new_email
            user.is_email_verified = False

    if data.username is not None:
        new_username = data.username.strip()
        if new_username != user.username:
            stmt = select(User).where(User.username == new_username)
            if (await db.execute(stmt)).scalar_one_or_none() is not None:
                raise ConflictError("این نام کاربری قبلاً استفاده شده است.")
            user.username = new_username

    await db.flush()
    return await _to_user_out(db, user)


def _to_session_out(session: UserSession, current_session_id: UUID | None) -> SessionOut:
    return SessionOut(
        id=session.id,
        device=session.device or "نامشخص",
        browser=session.browser or "نامشخص",
        location=session.location or "نامشخص",
        ip=session.ip_address or "0.0.0.0",
        last_active_at=session.updated_at,
        current=current_session_id is not None and session.id == current_session_id,
    )


async def list_sessions(db: AsyncSession, user_id: UUID, current_session_id: UUID | None) -> list[SessionOut]:
    stmt = (
        select(UserSession)
        .where(UserSession.user_id == user_id, UserSession.revoked_at.is_(None))
        .order_by(UserSession.updated_at.desc())
    )
    sessions = (await db.execute(stmt)).scalars().all()
    return [_to_session_out(s, current_session_id) for s in sessions]


async def revoke_session(db: AsyncSession, user_id: UUID, session_id: UUID) -> None:
    session = await db.get(UserSession, session_id)
    if session is None or session.user_id != user_id:
        raise NotFoundError("نشست موردنظر یافت نشد.")
    session.revoked_at = datetime.now(UTC)


async def revoke_other_sessions(db: AsyncSession, user_id: UUID, current_session_id: UUID) -> None:
    await db.execute(
        update(UserSession)
        .where(
            UserSession.user_id == user_id,
            UserSession.id != current_session_id,
            UserSession.revoked_at.is_(None),
        )
        .values(revoked_at=datetime.now(UTC))
    )
