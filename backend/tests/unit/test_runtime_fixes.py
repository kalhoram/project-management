from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError
from sqlalchemy.exc import OperationalError

from app.core.config import Settings, validate_jwt_secret_for_boot
from app.core.exceptions import RateLimitError, _is_database_connectivity_error
from app.main import app
from app.schemas.auth import LoginRequest
from app.utils.rate_limit import enforce_rate_limit, reset_memory_rate_limits


@pytest.mark.asyncio
async def test_login_db_unavailable_returns_503() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.api.v1.routes.auth.auth_service.login", new=AsyncMock(side_effect=ConnectionRefusedError())):
            resp = await client.post(
                "/api/v1/auth/login",
                json={"identifier": "owner@yadbox.app", "password": "demo"},
            )
    assert resp.status_code == 503
    data = resp.json()
    assert data["success"] is False
    assert data["code"] == "DATABASE_UNAVAILABLE"
    assert "پایگاه داده" in data["message"]


@pytest.mark.asyncio
async def test_ready_db_unavailable_returns_503() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.core.readiness._probe_database", new=AsyncMock(return_value="unavailable")):
            resp = await client.get("/ready")
    assert resp.status_code == 503
    data = resp.json()
    assert data["code"] == "SERVICE_NOT_READY"
    assert data["components"]["database"] == "unavailable"


def test_database_connectivity_error_detection() -> None:
    assert _is_database_connectivity_error(ConnectionRefusedError())
    assert _is_database_connectivity_error(OperationalError("stmt", {}, Exception("connection refused")))


def test_login_request_accepts_email_alias() -> None:
    payload = LoginRequest(email="owner@yadbox.app", password="demo")
    assert payload.identifier == "owner@yadbox.app"


def test_production_rejects_unsafe_jwt_secret() -> None:
    with pytest.raises(ValidationError):
        Settings(app_env="production", jwt_secret="change-me-in-production-yadbox-secret-key-32chars")

    safe = Settings(app_env="production", jwt_secret="a" * 32)
    validate_jwt_secret_for_boot(safe)


@pytest.mark.asyncio
async def test_auth_rate_limit_returns_429() -> None:
    reset_memory_rate_limits()
    transport = ASGITransport(app=app)

    class FakeRequest:
        client = type("C", (), {"host": "127.0.0.1"})()
        headers: dict[str, str] = {}

    request = FakeRequest()
    with patch("app.utils.rate_limit.get_settings") as mock_settings:
        mock_settings.return_value.rate_limit_login = 2
        mock_settings.return_value.rate_limit_window_seconds = 60
        mock_settings.return_value.redis_url = ""
        await enforce_rate_limit(request, scope="test-login", suffix="user@test.com")
        await enforce_rate_limit(request, scope="test-login", suffix="user@test.com")
        with pytest.raises(RateLimitError):
            await enforce_rate_limit(request, scope="test-login", suffix="user@test.com")
