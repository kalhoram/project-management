"""Task PATCH RBAC regression tests (ISS-013)."""

from __future__ import annotations

import os
import time

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

WS_A_ID = str(seed_id("ws-1"))
TASK_A_ID = str(seed_id("task-1"))
PROJ_A_ID = str(seed_id("proj-1"))


async def _login(client: AsyncClient, email: str, password: str = "demo") -> dict[str, str]:
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    token = resp.json()["accessToken"]
    return {"Authorization": f"Bearer {token}"}


async def _ensure_db() -> None:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        pytest.skip("PostgreSQL not available")


@pytest.mark.asyncio
async def test_guest_patch_task_forbidden() -> None:
    await _ensure_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _login(client, "guest@yadbox.app")
        resp = await client.patch(f"/api/v1/tasks/{TASK_A_ID}", headers=headers, json={"title": "guest-edit"})
    assert resp.status_code == 403
    assert resp.json()["code"] == "PERMISSION_DENIED"


@pytest.mark.asyncio
async def test_viewer_patch_task_forbidden() -> None:
    await _ensure_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _login(client, "viewer@yadbox.app")
        resp = await client.patch(f"/api/v1/tasks/{TASK_A_ID}", headers=headers, json={"title": "viewer-edit"})
    assert resp.status_code == 403
    assert resp.json()["code"] == "PERMISSION_DENIED"


@pytest.mark.asyncio
async def test_member_patch_task_allowed() -> None:
    await _ensure_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _login(client, "member@yadbox.app")
        title = f"member-rbac-{int(time.time())}"
        resp = await client.patch(f"/api/v1/tasks/{TASK_A_ID}", headers=headers, json={"title": title})
    assert resp.status_code == 200
    assert resp.json()["title"] == title


@pytest.mark.asyncio
async def test_unauthenticated_patch_task_returns_401() -> None:
    await _ensure_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.patch(f"/api/v1/tasks/{TASK_A_ID}", json={"title": "anon-edit"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_guest_cannot_patch_task_in_other_workspace() -> None:
    await _ensure_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        owner_h = await _login(client, "owner@yadbox.app")
        guest_h = await _login(client, "guest@yadbox.app")
        slug = f"rbac-ws-b-{int(time.time())}"
        ws_resp = await client.post(
            "/api/v1/workspaces",
            headers=owner_h,
            json={"name": "RBAC Workspace B", "slug": slug},
        )
        assert ws_resp.status_code in (200, 201), ws_resp.text
        ws_b_id = ws_resp.json()["id"]
        proj_resp = await client.post(
            f"/api/v1/workspaces/{ws_b_id}/projects",
            headers=owner_h,
            json={"name": "RBAC Project B", "workspaceId": ws_b_id},
        )
        assert proj_resp.status_code in (200, 201), proj_resp.text
        proj_b_id = proj_resp.json()["id"]
        task_resp = await client.post(
            "/api/v1/tasks",
            headers=owner_h,
            json={"title": "RBAC Task B", "projectId": proj_b_id, "status": "backlog"},
        )
        assert task_resp.status_code in (200, 201), task_resp.text
        task_b_id = task_resp.json()["id"]

        get_resp = await client.get(f"/api/v1/tasks/{task_b_id}", headers=guest_h)
        assert get_resp.status_code in (403, 404)

        patch_resp = await client.patch(
            f"/api/v1/tasks/{task_b_id}", headers=guest_h, json={"title": "cross-ws-edit"}
        )
        assert patch_resp.status_code in (403, 404)

        cleanup = await client.delete(f"/api/v1/tasks/{task_b_id}", headers=owner_h)
        assert cleanup.status_code == 200
