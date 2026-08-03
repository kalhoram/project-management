"""Tests for email verification dispatch wiring."""

from __future__ import annotations

import os
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, text

from app.db.session import AsyncSessionLocal, engine
from app.main import app
from app.models.user import User

pytestmark = pytest.mark.skipif(
    os.getenv("SKIP_DB_TESTS", "1") == "1",
    reason="Set SKIP_DB_TESTS=0 and run PostgreSQL to enable DB integration tests",
)


async def _ensure_db() -> None:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        pytest.skip("PostgreSQL not available")


@pytest.mark.asyncio
async def test_signup_dispatches_verification_email(monkeypatch: pytest.MonkeyPatch) -> None:
    await _ensure_db()
    sent: list[dict[str, str]] = []

    async def _mock_send(*, to: str, token: str) -> tuple[bool, str]:
        sent.append({"to": to, "token": token})
        return True, "console"

    monkeypatch.setattr("app.services.auth_service.send_verification_email", _mock_send)

    email = f"verify-test-{os.getpid()}@yadbox.app"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/auth/signup",
            json={"name": "Verify Test", "email": email, "password": "Test1234!"},
        )

    assert resp.status_code == 200, resp.text
    assert len(sent) == 1
    assert sent[0]["to"] == email
    assert sent[0]["token"]
    assert "passwordHash" not in resp.text


@pytest.mark.asyncio
async def test_signup_fails_when_email_dispatch_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    await _ensure_db()

    async def _mock_send(*, to: str, token: str) -> tuple[bool, str]:
        return False, "smtp"

    monkeypatch.setattr("app.services.auth_service.send_verification_email", _mock_send)

    email = f"verify-fail-{os.getpid()}@yadbox.app"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/auth/signup",
            json={"name": "Verify Fail", "email": email, "password": "Test1234!"},
        )

    assert resp.status_code == 503
    body = resp.json()
    assert body.get("code") == "EMAIL_DISPATCH_FAILED"
    assert not body.get("accessToken")


@pytest.mark.asyncio
async def test_resend_verification_dispatches_for_unverified_user(monkeypatch: pytest.MonkeyPatch) -> None:
    await _ensure_db()
    sent: list[str] = []

    async def _mock_send(*, to: str, token: str) -> tuple[bool, str]:
        sent.append(to)
        return True, "console"

    monkeypatch.setattr("app.services.auth_service.send_verification_email", _mock_send)

    email = f"resend-test-{os.getpid()}@yadbox.app"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        signup = await client.post(
            "/api/v1/auth/signup",
            json={"name": "Resend Test", "email": email, "password": "Test1234!"},
        )
        assert signup.status_code == 200
        sent.clear()

        resend = await client.post("/api/v1/auth/resend-verification", json={"email": email})

    assert resend.status_code == 200
    body = resend.json()
    assert body.get("emailDispatched") is True
    assert body.get("deliveryMode") == "console"
    assert len(sent) == 1
    assert sent[0] == email


@pytest.mark.asyncio
async def test_verify_email_with_token(monkeypatch: pytest.MonkeyPatch) -> None:
    await _ensure_db()
    captured_token = {"value": ""}

    async def _mock_send(*, to: str, token: str) -> tuple[bool, str]:
        captured_token["value"] = token
        return True, "console"

    monkeypatch.setattr("app.services.auth_service.send_verification_email", _mock_send)

    email = f"verify-link-{os.getpid()}@yadbox.app"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        signup = await client.post(
            "/api/v1/auth/signup",
            json={"name": "Verify Link", "email": email, "password": "Test1234!"},
        )
        assert signup.status_code == 200
        token = captured_token["value"]
        assert token

        verify = await client.post("/api/v1/auth/verify-email", json={"token": token})

    assert verify.status_code == 200

    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        assert user.is_email_verified is True
