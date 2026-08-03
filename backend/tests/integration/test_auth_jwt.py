"""JWT auth integration tests against the FastAPI app."""

from __future__ import annotations

import os

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from app.db.session import engine
from app.main import app

pytestmark = pytest.mark.skipif(
    os.getenv("SKIP_DB_TESTS", "1") == "1",
    reason="Set SKIP_DB_TESTS=0 and run PostgreSQL to enable DB integration tests",
)

DEMO_EMAIL = "demo@yadbox.app"
DEMO_PASSWORD = "Demo1234!"


async def _ensure_db() -> None:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        pytest.skip("PostgreSQL not available")


@pytest.mark.asyncio
async def test_demo_login_and_me() -> None:
    await _ensure_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
        )
    assert login.status_code == 200, login.text
    data = login.json()
    token = data.get("accessToken")
    assert token
    assert "passwordHash" not in login.text

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200, me.text
    assert me.json()["email"] == DEMO_EMAIL


@pytest.mark.asyncio
async def test_me_rejects_missing_and_invalid_token() -> None:
    await _ensure_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        missing = await client.get("/api/v1/auth/me")
        invalid = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid.token.value"},
        )
    assert missing.status_code in (401, 403)
    assert invalid.status_code in (401, 403)


@pytest.mark.asyncio
async def test_login_wrong_password() -> None:
    await _ensure_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": DEMO_EMAIL, "password": "wrong-password-xyz"},
        )
    assert resp.status_code in (400, 401)
    assert not resp.json().get("accessToken")
