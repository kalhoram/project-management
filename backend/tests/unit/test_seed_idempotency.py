"""Regression tests for seed script idempotency (ISS-010)."""

from __future__ import annotations

import json
import os
import subprocess
import sys

import pytest

pytestmark = pytest.mark.skipif(
    os.getenv("SKIP_DB_TESTS", "1") == "1",
    reason="Set SKIP_DB_TESTS=0 and run PostgreSQL to enable DB integration tests",
)

_COUNT_SCRIPT = """
import asyncio, json
from sqlalchemy import func, select
from app.db.session import AsyncSessionLocal
from app.models.activity import ActivityLog
from app.models.file import Attachment
from app.models.advanced import OKRObjective, RoadmapItem, Sprint, TimeEntry
from app.models.billing import Plan
from app.models.project import Project
from app.models.user import User
from scripts.ids import seed_id

async def main():
    ws_id = seed_id("ws-1")
    async with AsyncSessionLocal() as session:
        out = {
            "plans": (await session.execute(select(func.count()).select_from(Plan))).scalar_one(),
            "users": (await session.execute(select(func.count()).select_from(User))).scalar_one(),
            "activity_logs": (await session.execute(select(func.count()).select_from(ActivityLog))).scalar_one(),
            "active_projects": (
                await session.execute(
                    select(func.count()).select_from(Project).where(
                        Project.workspace_id == ws_id,
                        Project.status == "active",
                    )
                )
            ).scalar_one(),
            "sprints": (
                await session.execute(
                    select(func.count()).select_from(Sprint).where(Sprint.workspace_id == ws_id)
                )
            ).scalar_one(),
            "roadmap_items": (
                await session.execute(
                    select(func.count()).select_from(RoadmapItem).where(RoadmapItem.workspace_id == ws_id)
                )
            ).scalar_one(),
            "okrs": (
                await session.execute(
                    select(func.count()).select_from(OKRObjective).where(OKRObjective.workspace_id == ws_id)
                )
            ).scalar_one(),
            "time_entries": (
                await session.execute(
                    select(func.count()).select_from(TimeEntry).where(TimeEntry.workspace_id == ws_id)
                )
            ).scalar_one(),
            "attachments": (
                await session.execute(
                    select(func.count()).select_from(Attachment).where(
                        Attachment.workspace_id == ws_id,
                        Attachment.deleted_at.is_(None),
                    )
                )
            ).scalar_one(),
            "files_proj_1": (
                await session.execute(
                    select(func.count()).select_from(Attachment).where(
                        Attachment.workspace_id == ws_id,
                        Attachment.project_id == seed_id("proj-1"),
                        Attachment.deleted_at.is_(None),
                    )
                )
            ).scalar_one(),
            "files_proj_2": (
                await session.execute(
                    select(func.count()).select_from(Attachment).where(
                        Attachment.workspace_id == ws_id,
                        Attachment.project_id == seed_id("proj-2"),
                        Attachment.deleted_at.is_(None),
                    )
                )
            ).scalar_one(),
        }
    print(json.dumps(out))

asyncio.run(main())
"""


def _table_counts() -> dict[str, int]:
    env = {**os.environ, "PYTHONPATH": os.getcwd(), "SQLALCHEMY_ECHO": "0"}
    result = subprocess.run(
        [sys.executable, "-c", _COUNT_SCRIPT],
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )
    assert result.returncode == 0, result.stderr[-500:]
    for line in reversed(result.stdout.splitlines()):
        line = line.strip()
        if line.startswith("{"):
            return json.loads(line)
    raise AssertionError(f"No JSON counts in stdout: {result.stdout[-300:]}")


def _run_seed() -> subprocess.CompletedProcess[str]:
    env = {**os.environ, "PYTHONPATH": os.getcwd()}
    return subprocess.run(
        [sys.executable, "-m", "scripts.seed"],
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )


def test_seed_rerun_is_idempotent() -> None:
    before = _table_counts()
    first = _run_seed()
    mid = _table_counts()
    second = _run_seed()
    after = _table_counts()

    assert first.returncode == 0, first.stderr[-500:]
    assert second.returncode == 0, second.stderr[-500:]
    assert before == mid == after


def test_demo_seed_coverage() -> None:
    result = _run_seed()
    assert result.returncode == 0, result.stderr[-500:]
    counts = _table_counts()
    assert counts["active_projects"] == 2
    assert counts["sprints"] >= 2
    assert counts["roadmap_items"] >= 2
    assert counts["okrs"] >= 2
    assert counts["time_entries"] >= 4
    assert counts["attachments"] >= 10
    assert counts["files_proj_1"] >= 4
    assert counts["files_proj_2"] >= 4
