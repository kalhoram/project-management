"""Integration tests for estimation and member overdue API contracts."""

from __future__ import annotations

import os

import httpx
import pytest

pytestmark = pytest.mark.skipif(
    os.getenv("SKIP_DB_TESTS", "1") == "1",
    reason="Set SKIP_DB_TESTS=0 and run PostgreSQL to enable DB integration tests",
)

BASE = os.environ.get("RUNTIME_VERIFY_BASE", "http://127.0.0.1:8000")
API = f"{BASE}/api/v1"
WS_ID = "326613e1-f483-5194-9a8a-fd95e5560352"


def test_estimation_and_member_performance_contracts() -> None:
    with httpx.Client(timeout=30.0) as client:
        login = client.post(f"{API}/auth/login", json={"email": "owner@yadbox.app", "password": "demo"})
        assert login.status_code == 200
        token = login.json()["accessToken"]
        headers = {"Authorization": f"Bearer {token}"}

        estimation = client.get(f"{API}/workspaces/{WS_ID}/estimation", headers=headers)
        assert estimation.status_code == 200
        rows = estimation.json()
        assert isinstance(rows, list)
        assert len(rows) >= 1

        first = rows[0]
        for field in (
            "taskId",
            "key",
            "title",
            "estimateHours",
            "actualHours",
            "storyPoints",
            "variance",
            "confidence",
        ):
            assert field in first, f"missing {field}"
        assert isinstance(first["actualHours"], (int, float))
        assert isinstance(first["variance"], (int, float))

        members = client.get(f"{API}/workspaces/{WS_ID}/reports/members", headers=headers)
        assert members.status_code == 200
        member_rows = members.json()
        assert isinstance(member_rows, list)
        assert len(member_rows) >= 1

        for row in member_rows:
            assert "tasksOverdue" in row
            assert row["tasksOverdue"] is not None
            assert isinstance(row["tasksOverdue"], int)
            assert row["tasksOverdue"] >= 0

        overdue_members = [r for r in member_rows if r["tasksOverdue"] > 0]
        assert len(overdue_members) >= 1
