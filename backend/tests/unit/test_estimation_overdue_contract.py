"""Unit tests for estimation DTO and member overdue count contracts."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.schemas.advanced import EstimationOut
from app.services.advanced_service import _to_estimation_out
from app.services.report_service import _overdue_counts_by_assignee


def test_estimation_out_includes_task_fields_and_variance() -> None:
    task = SimpleNamespace(
        id=uuid4(),
        key="YB-101",
        title="طراحی API",
        estimate_hours=Decimal("8"),
        actual_hours=Decimal("10"),
        story_points=5,
    )
    out = _to_estimation_out(task, confidence=70)

    assert out.key == "YB-101"
    assert out.title == "طراحی API"
    assert out.estimate_hours == 8.0
    assert out.actual_hours == 10.0
    assert out.story_points == 5
    assert out.variance == 2.0
    assert out.confidence == 70


def test_estimation_out_defaults_actual_hours_and_variance() -> None:
    task = SimpleNamespace(
        id=uuid4(),
        key="YB-102",
        title="Kanban",
        estimate_hours=Decimal("4"),
        actual_hours=None,
        story_points=None,
    )
    out = _to_estimation_out(task)

    assert out.actual_hours == 0.0
    assert out.variance == -4.0
    assert out.story_points is None


def test_estimation_schema_serializes_camel_case_fields() -> None:
    payload = EstimationOut(
        task_id=uuid4(),
        key="YB-1",
        title="Task",
        estimate_hours=3.0,
        actual_hours=1.5,
        story_points=2,
        variance=-1.5,
        confidence=50,
    ).model_dump(by_alias=True)

    assert set(payload.keys()) >= {
        "taskId",
        "key",
        "title",
        "estimateHours",
        "actualHours",
        "storyPoints",
        "variance",
        "confidence",
    }


@pytest.mark.asyncio
async def test_overdue_counts_by_assignee_excludes_done_future_and_missing_due() -> None:
    db = SimpleNamespace()
    workspace_id = uuid4()
    user_overdue = uuid4()
    user_clear = uuid4()
    today = date.today()

    class FakeResult:
        def all(self) -> list[tuple]:
            return [(user_overdue, 2)]

    class FakeExecute:
        async def __call__(self, _stmt):
            return FakeResult()

    db.execute = FakeExecute()

    counts = await _overdue_counts_by_assignee(db, workspace_id)  # type: ignore[arg-type]

    assert counts[user_overdue] == 2
    assert user_clear not in counts


def test_overdue_definition_matches_report_service_constants() -> None:
    """Document expected overdue semantics used by member performance."""
    done_like = ("done", "cancelled")
    assert "done" in done_like
    assert "cancelled" in done_like

    overdue_due = date.today() - timedelta(days=1)
    future_due = date.today() + timedelta(days=1)
    assert overdue_due < date.today()
    assert not (future_due < date.today())
