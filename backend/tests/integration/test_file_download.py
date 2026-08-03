"""File download endpoint integration test."""

from __future__ import annotations

import os

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from app.db.session import engine
from app.main import app
from scripts.ids import seed_id

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
async def test_download_seeded_file() -> None:
    await _ensure_db()
    file_id = str(seed_id("att-file-yb-1"))
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "owner@yadbox.app", "password": "demo"},
        )
        assert login.status_code == 200, login.text
        token = login.json()["accessToken"]
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get(f"/api/v1/files/{file_id}/download", headers=headers)

    assert response.status_code == 200, response.text
    assert len(response.content) > 0
    assert "attachment" in response.headers.get("content-disposition", "")
