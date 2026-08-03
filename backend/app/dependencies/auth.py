"""Authentication dependencies: current user resolution from the access-token JWT."""

from __future__ import annotations

from uuid import UUID

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthError, PermissionDeniedError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User, UserSession

_bearer_scheme = HTTPBearer(auto_error=False)


async def _resolve_user_from_token(
    credentials: HTTPAuthorizationCredentials | None,
    db: AsyncSession,
) -> User | None:
    if credentials is None or not credentials.credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError:
        return None

    user_id = payload.get("sub")
    session_id = payload.get("sid")
    if not user_id or not session_id:
        return None

    try:
        user_uuid = UUID(str(user_id))
        session_uuid = UUID(str(session_id))
    except ValueError:
        return None

    session = await db.get(UserSession, session_uuid)
    if session is None or session.revoked_at is not None or session.user_id != user_uuid:
        return None

    user = await db.get(User, user_uuid)
    if user is None or user.status == "suspended":
        return None

    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await _resolve_user_from_token(credentials, db)
    if user is None:
        raise AuthError("ورود به سیستم الزامی است. لطفاً دوباره وارد شوید.", code="AUTH_REQUIRED")
    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    return await _resolve_user_from_token(credentials, db)


async def require_system_admin(current_user: User = Depends(get_current_user)) -> User:
    if not getattr(current_user, "is_system_admin", False):
        raise PermissionDeniedError("این عملیات مخصوص مدیران سیستم است.")
    return current_user

