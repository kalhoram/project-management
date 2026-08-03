from __future__ import annotations

import os

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from app.db.session import engine
from app.main import app


@pytest.mark.asyncio
@pytest.mark.skipif(
    os.getenv("SKIP_DB_TESTS", "1") == "1",
    reason="Set SKIP_DB_TESTS=0 and run PostgreSQL to enable DB integration tests",
)
async def test_login_demo_admin() -> None:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        pytest.skip("PostgreSQL not available")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "admin", "password": "123/321"},
        )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "accessToken" in data or "access_token" in data
    user = data.get("user") or data.get("data", {}).get("user")
    assert user is not None
    assert user["name"]
