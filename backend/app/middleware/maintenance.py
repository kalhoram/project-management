"""Blocks non-admin traffic with `503 MAINTENANCE` while maintenance mode is active.

Maintenance state lives in the `maintenance_states` table (see `admin_service`)
so ops can toggle it without a redeploy. The DB is polled at most once every
`_CACHE_TTL_SECONDS` to avoid a query per request; `Settings.maintenance_mode`
acts as an env-level override that always wins.
"""

from __future__ import annotations

import time

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import get_settings
from app.core.exceptions import error_body

_CACHE_TTL_SECONDS = 10.0
_EXEMPT_PREFIXES = (
    "/health",
    "/ready",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/api/v1/admin",
    "/api/v1/auth",
    "/ws",
)

_cache: dict[str, float | bool] = {"checked_at": 0.0, "is_active": False, "message": ""}


async def _fetch_is_active() -> tuple[bool, str]:
    from sqlalchemy import select

    from app.db.session import AsyncSessionLocal
    from app.models.system import MaintenanceState

    async with AsyncSessionLocal() as db:
        stmt = select(MaintenanceState).order_by(MaintenanceState.created_at.desc()).limit(1)
        state = (await db.execute(stmt)).scalars().first()
        if state is None:
            return False, ""
        return state.is_active, state.message or "سامانه در حال تعمیر و نگهداری است. لطفاً بعداً مراجعه کنید."


async def _is_maintenance_active() -> tuple[bool, str]:
    settings = get_settings()
    if settings.maintenance_mode:
        return True, "سامانه در حال تعمیر و نگهداری است. لطفاً بعداً مراجعه کنید."

    now = time.monotonic()
    if now - float(_cache["checked_at"]) < _CACHE_TTL_SECONDS:
        return bool(_cache["is_active"]), str(_cache["message"])

    try:
        is_active, message = await _fetch_is_active()
    except Exception:
        # DB not ready yet (e.g. before first migration) -- fail open.
        is_active, message = False, ""

    _cache.update(checked_at=now, is_active=is_active, message=message)
    return is_active, message


class MaintenanceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        path = request.url.path
        if any(path.startswith(prefix) for prefix in _EXEMPT_PREFIXES):
            return await call_next(request)

        is_active, message = await _is_maintenance_active()
        if is_active:
            return JSONResponse(status_code=503, content=error_body("MAINTENANCE", message))

        return await call_next(request)
