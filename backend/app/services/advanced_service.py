"""Sprints, roadmap, OKRs, time tracking, capacity, estimation, approvals,
request forms, comments/mentions and "my work" query business logic.

Aligned with the real ORM models (app.models.advanced / app.models.task):

- Sprint: workspace_id, project_id?, name, goal, status, start_date, end_date,
  capacity, committed_points, completed_points. `SprintTask(sprint_id,
  task_id)` is the join table backing `SprintOut.task_ids`; committed/completed
  points are recomputed from the linked tasks' `story_points` whenever the
  task set changes.
- RoadmapItem: maps 1:1 to `RoadmapOut` (safe to `model_validate`).
- OKRObjective / OKRKeyResult: key results live in a child table, loaded via
  an explicit query (async lazy-loading a relationship outside the triggering
  query would raise `MissingGreenlet`).
- TimeEntry: schema field `date` maps to the model's `entry_date` column.
- CapacityPlan: weekly capacity vs. allocated hours per member; allocated
  hours are (re)computed live from `TimeEntry`, capacity defaults to 40h/week
  until explicitly set.
- ApprovalRequest: maps 1:1 to `ApprovalOut`.
- EstimationRecord: append-only estimate history; `EstimationOut.confidence`
  has no DB column, so it's echoed from the input / defaulted to 50.
- RequestForm/RequestSubmission: `RequestForm.schema_definition` (DB column
  "schema") stores the field spec as JSON.
"""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.advanced import (
    ApprovalRequest,
    CapacityPlan,
    EstimationRecord,
    OKRKeyResult,
    OKRObjective,
    RequestForm,
    RequestSubmission,
    RoadmapItem,
    Sprint,
    SprintTask,
    TimeEntry,
)
from app.models.task import Task
from app.models.workspace import WorkspaceMember
from app.schemas.advanced import (
    ApprovalCreate,
    ApprovalDecision,
    ApprovalOut,
    CapacityOut,
    CapacityUpdate,
    EstimationOut,
    EstimationUpdate,
    KeyResultOut,
    OKRCreate,
    OKROut,
    OKRUpdate,
    RequestFormCreate,
    RequestFormFieldSpec,
    RequestFormOut,
    RequestSubmissionCreate,
    RequestSubmissionOut,
    RoadmapCreate,
    RoadmapOut,
    RoadmapUpdate,
    SprintCreate,
    SprintOut,
    SprintUpdate,
    TimeEntryCreate,
    TimeEntryOut,
    TimeEntryUpdate,
)
from app.schemas.task import CommentOut, TaskOut
from app.services.task_service import _comment_out, _to_task_out

_DEFAULT_WEEKLY_CAPACITY_HOURS = Decimal(40)


# ---------------------------------------------------------------------------
# Sprints
# ---------------------------------------------------------------------------


async def _sprint_task_ids(db: AsyncSession, sprint_id: UUID) -> list[UUID]:
    stmt = select(SprintTask.task_id).where(SprintTask.sprint_id == sprint_id)
    return list((await db.execute(stmt)).scalars().all())


def _to_sprint_out(sprint: Sprint, task_ids: list[UUID]) -> SprintOut:
    return SprintOut(
        id=sprint.id,
        workspace_id=sprint.workspace_id,
        project_id=sprint.project_id,
        name=sprint.name,
        goal=sprint.goal,
        status=sprint.status,
        start_date=sprint.start_date,
        end_date=sprint.end_date,
        capacity=sprint.capacity,
        committed_points=sprint.committed_points,
        completed_points=sprint.completed_points,
        task_ids=task_ids,
    )


async def _recompute_sprint_points(db: AsyncSession, sprint: Sprint) -> None:
    task_ids = await _sprint_task_ids(db, sprint.id)
    if not task_ids:
        sprint.committed_points = 0
        sprint.completed_points = 0
        return
    stmt = select(Task).where(Task.id.in_(task_ids))
    tasks = (await db.execute(stmt)).scalars().all()
    sprint.committed_points = sum(t.story_points or 0 for t in tasks)
    sprint.completed_points = sum(t.story_points or 0 for t in tasks if t.status == "done")


async def _set_sprint_tasks(db: AsyncSession, sprint_id: UUID, task_ids: list[UUID]) -> None:
    existing_stmt = select(SprintTask).where(SprintTask.sprint_id == sprint_id)
    for row in (await db.execute(existing_stmt)).scalars().all():
        await db.delete(row)
    await db.flush()
    for task_id in task_ids:
        db.add(SprintTask(sprint_id=sprint_id, task_id=task_id))
    await db.flush()


async def list_sprints(db: AsyncSession, workspace_id: UUID, project_id: UUID | None = None) -> list[SprintOut]:
    stmt = select(Sprint).where(Sprint.workspace_id == workspace_id)
    if project_id is not None:
        stmt = stmt.where(Sprint.project_id == project_id)
    stmt = stmt.order_by(Sprint.start_date.desc())
    sprints = (await db.execute(stmt)).scalars().all()
    return [_to_sprint_out(s, await _sprint_task_ids(db, s.id)) for s in sprints]


async def get_sprint(db: AsyncSession, sprint_id: UUID) -> SprintOut:
    sprint = await db.get(Sprint, sprint_id)
    if sprint is None:
        raise NotFoundError("اسپرینت یافت نشد.")
    return _to_sprint_out(sprint, await _sprint_task_ids(db, sprint.id))


async def create_sprint(db: AsyncSession, workspace_id: UUID, data: SprintCreate) -> SprintOut:
    sprint = Sprint(
        workspace_id=workspace_id,
        project_id=data.project_id,
        name=data.name,
        goal=data.goal,
        status="planning",
        start_date=data.start_date,
        end_date=data.end_date,
        capacity=data.capacity,
    )
    db.add(sprint)
    await db.flush()
    await _set_sprint_tasks(db, sprint.id, data.task_ids)
    await _recompute_sprint_points(db, sprint)
    await db.flush()
    return _to_sprint_out(sprint, data.task_ids)


async def update_sprint(db: AsyncSession, sprint_id: UUID, data: SprintUpdate) -> SprintOut:
    sprint = await db.get(Sprint, sprint_id)
    if sprint is None:
        raise NotFoundError("اسپرینت یافت نشد.")
    updates = data.model_dump(exclude_unset=True, exclude={"task_ids"})
    for field, value in updates.items():
        setattr(sprint, field, value)
    if data.task_ids is not None:
        await _set_sprint_tasks(db, sprint_id, data.task_ids)
    await _recompute_sprint_points(db, sprint)
    await db.flush()
    return _to_sprint_out(sprint, await _sprint_task_ids(db, sprint_id))


async def delete_sprint(db: AsyncSession, sprint_id: UUID) -> None:
    sprint = await db.get(Sprint, sprint_id)
    if sprint is None:
        raise NotFoundError("اسپرینت یافت نشد.")
    await db.delete(sprint)


# ---------------------------------------------------------------------------
# Roadmap
# ---------------------------------------------------------------------------


async def list_roadmap(db: AsyncSession, workspace_id: UUID) -> list[RoadmapOut]:
    stmt = select(RoadmapItem).where(RoadmapItem.workspace_id == workspace_id).order_by(RoadmapItem.start_date.asc())
    rows = (await db.execute(stmt)).scalars().all()
    return [RoadmapOut.model_validate(r) for r in rows]


async def create_roadmap_item(db: AsyncSession, workspace_id: UUID, data: RoadmapCreate) -> RoadmapOut:
    item = RoadmapItem(workspace_id=workspace_id, **data.model_dump())
    db.add(item)
    await db.flush()
    return RoadmapOut.model_validate(item)


async def update_roadmap_item(db: AsyncSession, workspace_id: UUID, item_id: UUID, data: RoadmapUpdate) -> RoadmapOut:
    item = await db.get(RoadmapItem, item_id)
    if item is None or item.workspace_id != workspace_id:
        raise NotFoundError("مورد نقشه راه یافت نشد.")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.flush()
    return RoadmapOut.model_validate(item)


async def delete_roadmap_item(db: AsyncSession, workspace_id: UUID, item_id: UUID) -> None:
    item = await db.get(RoadmapItem, item_id)
    if item is None or item.workspace_id != workspace_id:
        raise NotFoundError("مورد نقشه راه یافت نشد.")
    await db.delete(item)


# ---------------------------------------------------------------------------
# OKRs
# ---------------------------------------------------------------------------


async def _okr_key_results(db: AsyncSession, objective_id: UUID) -> list[KeyResultOut]:
    stmt = (
        select(OKRKeyResult)
        .where(OKRKeyResult.objective_id == objective_id)
        .order_by(OKRKeyResult.sort_order.asc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [
        KeyResultOut(id=r.id, title=r.title, target=float(r.target), current=float(r.current), unit=r.unit or "")
        for r in rows
    ]


async def _to_okr_out(db: AsyncSession, objective: OKRObjective) -> OKROut:
    key_results = await _okr_key_results(db, objective.id)
    return OKROut(
        id=objective.id,
        workspace_id=objective.workspace_id,
        objective=objective.objective,
        owner_id=objective.owner_id,
        confidence=objective.confidence,
        progress=objective.progress,
        key_results=key_results,
        period=objective.period,
        status=objective.status,
    )


def _recompute_okr_progress(key_results: list[KeyResultOut]) -> int:
    if not key_results:
        return 0
    ratios = [min(1.0, (kr.current / kr.target)) if kr.target else 0.0 for kr in key_results]
    return round((sum(ratios) / len(ratios)) * 100)


async def _replace_key_results(db: AsyncSession, objective_id: UUID, key_results) -> None:
    existing_stmt = select(OKRKeyResult).where(OKRKeyResult.objective_id == objective_id)
    for row in (await db.execute(existing_stmt)).scalars().all():
        await db.delete(row)
    await db.flush()
    for index, kr in enumerate(key_results):
        db.add(
            OKRKeyResult(
                objective_id=objective_id,
                title=kr.title,
                target=Decimal(str(kr.target)),
                current=Decimal(str(kr.current)),
                unit=kr.unit,
                sort_order=index,
            )
        )
    await db.flush()


async def list_okrs(db: AsyncSession, workspace_id: UUID) -> list[OKROut]:
    stmt = select(OKRObjective).where(OKRObjective.workspace_id == workspace_id).order_by(OKRObjective.period.desc())
    objectives = (await db.execute(stmt)).scalars().all()
    return [await _to_okr_out(db, o) for o in objectives]


async def create_okr(db: AsyncSession, workspace_id: UUID, data: OKRCreate) -> OKROut:
    objective = OKRObjective(
        workspace_id=workspace_id,
        objective=data.objective,
        owner_id=data.owner_id,
        confidence=data.confidence,
        progress=0,
        period=data.period,
        status="on_track",
    )
    db.add(objective)
    await db.flush()
    await _replace_key_results(db, objective.id, data.key_results)
    key_results = await _okr_key_results(db, objective.id)
    objective.progress = _recompute_okr_progress(key_results)
    await db.flush()
    return await _to_okr_out(db, objective)


async def update_okr(db: AsyncSession, workspace_id: UUID, objective_id: UUID, data: OKRUpdate) -> OKROut:
    objective = await db.get(OKRObjective, objective_id)
    if objective is None or objective.workspace_id != workspace_id:
        raise NotFoundError("هدف کلیدی یافت نشد.")

    updates = data.model_dump(exclude_unset=True, exclude={"key_results"})
    for field, value in updates.items():
        setattr(objective, field, value)

    if data.key_results is not None:
        await _replace_key_results(db, objective_id, data.key_results)

    key_results = await _okr_key_results(db, objective_id)
    objective.progress = _recompute_okr_progress(key_results)

    await db.flush()
    return await _to_okr_out(db, objective)


async def delete_okr(db: AsyncSession, workspace_id: UUID, objective_id: UUID) -> None:
    objective = await db.get(OKRObjective, objective_id)
    if objective is None or objective.workspace_id != workspace_id:
        raise NotFoundError("هدف کلیدی یافت نشد.")
    await db.delete(objective)


# ---------------------------------------------------------------------------
# Time entries
# ---------------------------------------------------------------------------


def _to_time_entry_out(entry: TimeEntry) -> TimeEntryOut:
    return TimeEntryOut(
        id=entry.id,
        workspace_id=entry.workspace_id,
        task_id=entry.task_id,
        user_id=entry.user_id,
        hours=float(entry.hours),
        note=entry.note,
        date=entry.entry_date,
        billable=entry.billable,
    )


async def list_time_entries(
    db: AsyncSession, workspace_id: UUID, *, user_id: UUID | None = None, task_id: UUID | None = None
) -> list[TimeEntryOut]:
    stmt = select(TimeEntry).where(TimeEntry.workspace_id == workspace_id)
    if user_id is not None:
        stmt = stmt.where(TimeEntry.user_id == user_id)
    if task_id is not None:
        stmt = stmt.where(TimeEntry.task_id == task_id)
    stmt = stmt.order_by(TimeEntry.entry_date.desc())
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_time_entry_out(e) for e in rows]


async def create_time_entry(
    db: AsyncSession, workspace_id: UUID, user_id: UUID, data: TimeEntryCreate
) -> TimeEntryOut:
    task = await db.get(Task, data.task_id)
    if task is None:
        raise NotFoundError("وظیفه یافت نشد.")

    entry = TimeEntry(
        workspace_id=workspace_id,
        task_id=data.task_id,
        user_id=user_id,
        hours=Decimal(str(data.hours)),
        note=data.note,
        entry_date=data.date,
        billable=data.billable,
    )
    db.add(entry)

    existing_hours_stmt = select(TimeEntry.hours).where(TimeEntry.task_id == data.task_id)
    total = sum((float(h) for h in (await db.execute(existing_hours_stmt)).scalars().all()), float(data.hours))
    task.actual_hours = Decimal(str(round(total, 2)))

    await db.flush()
    return _to_time_entry_out(entry)


async def update_time_entry(db: AsyncSession, entry_id: UUID, data: TimeEntryUpdate) -> TimeEntryOut:
    entry = await db.get(TimeEntry, entry_id)
    if entry is None:
        raise NotFoundError("ورودی زمان یافت نشد.")
    updates = data.model_dump(exclude_unset=True)
    if "date" in updates:
        entry.entry_date = updates.pop("date")
    if "hours" in updates:
        entry.hours = Decimal(str(updates.pop("hours")))
    for field, value in updates.items():
        setattr(entry, field, value)
    await db.flush()
    return _to_time_entry_out(entry)


async def delete_time_entry(db: AsyncSession, entry_id: UUID) -> None:
    entry = await db.get(TimeEntry, entry_id)
    if entry is None:
        raise NotFoundError("ورودی زمان یافت نشد.")
    await db.delete(entry)


# ---------------------------------------------------------------------------
# Approvals
# ---------------------------------------------------------------------------


async def list_approvals(db: AsyncSession, workspace_id: UUID, *, status: str | None = None) -> list[ApprovalOut]:
    stmt = select(ApprovalRequest).where(ApprovalRequest.workspace_id == workspace_id)
    if status:
        stmt = stmt.where(ApprovalRequest.status == status)
    stmt = stmt.order_by(ApprovalRequest.created_at.desc())
    rows = (await db.execute(stmt)).scalars().all()
    return [ApprovalOut.model_validate(a) for a in rows]


async def create_approval(db: AsyncSession, workspace_id: UUID, requester_id: UUID, data: ApprovalCreate) -> ApprovalOut:
    approval = ApprovalRequest(
        workspace_id=workspace_id,
        title=data.title,
        description=data.description,
        requester_id=requester_id,
        approver_ids=data.approver_ids,
        status="pending",
        entity_type=data.entity_type,
        entity_id=data.entity_id,
    )
    db.add(approval)
    await db.flush()
    return ApprovalOut.model_validate(approval)


async def decide_approval(db: AsyncSession, approval_id: UUID, data: ApprovalDecision) -> ApprovalOut:
    approval = await db.get(ApprovalRequest, approval_id)
    if approval is None:
        raise NotFoundError("درخواست تأیید یافت نشد.")
    approval.status = data.status
    approval.decided_at = datetime.now(UTC)
    await db.flush()
    return ApprovalOut.model_validate(approval)


# ---------------------------------------------------------------------------
# Capacity
# ---------------------------------------------------------------------------


def _week_start(reference: date | None = None) -> date:
    reference = reference or date.today()
    return reference - timedelta(days=reference.weekday())


async def list_capacity(db: AsyncSession, workspace_id: UUID, *, week_start: date | None = None) -> list[CapacityOut]:
    week_start = _week_start(week_start)
    week_end = week_start + timedelta(days=6)

    members_stmt = select(WorkspaceMember.user_id).where(
        WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.is_active.is_(True)
    )
    member_ids = list((await db.execute(members_stmt)).scalars().all())

    plans_stmt = select(CapacityPlan).where(
        CapacityPlan.workspace_id == workspace_id, CapacityPlan.period_start == week_start
    )
    plans_by_user = {p.user_id: p for p in (await db.execute(plans_stmt)).scalars().all()}

    results: list[CapacityOut] = []
    for user_id in member_ids:
        plan = plans_by_user.get(user_id)
        capacity_hours = float(plan.capacity_hours) if plan else float(_DEFAULT_WEEKLY_CAPACITY_HOURS)

        allocated_stmt = select(TimeEntry.hours).where(
            TimeEntry.workspace_id == workspace_id,
            TimeEntry.user_id == user_id,
            TimeEntry.entry_date >= week_start,
            TimeEntry.entry_date <= week_end,
        )
        allocated_hours = sum(float(h) for h in (await db.execute(allocated_stmt)).scalars().all())

        results.append(
            CapacityOut(
                user_id=user_id,
                workspace_id=workspace_id,
                week_start=week_start,
                capacity_hours=capacity_hours,
                allocated_hours=round(allocated_hours, 2),
                available_hours=round(max(0.0, capacity_hours - allocated_hours), 2),
            )
        )
    return results


async def update_capacity(
    db: AsyncSession, workspace_id: UUID, user_id: UUID, data: CapacityUpdate, *, week_start: date | None = None
) -> CapacityOut:
    week_start = _week_start(week_start)
    week_end = week_start + timedelta(days=6)

    stmt = select(CapacityPlan).where(
        CapacityPlan.workspace_id == workspace_id,
        CapacityPlan.user_id == user_id,
        CapacityPlan.period_start == week_start,
    )
    plan = (await db.execute(stmt)).scalar_one_or_none()
    if plan is None:
        plan = CapacityPlan(
            workspace_id=workspace_id,
            user_id=user_id,
            period_start=week_start,
            period_end=week_end,
            capacity_hours=Decimal(str(data.capacity_hours)),
        )
        db.add(plan)
    else:
        plan.capacity_hours = Decimal(str(data.capacity_hours))
    await db.flush()

    results = await list_capacity(db, workspace_id, week_start=week_start)
    for row in results:
        if row.user_id == user_id:
            return row
    raise NotFoundError("عضو موردنظر در این فضای کاری یافت نشد.")


# ---------------------------------------------------------------------------
# Estimation
# ---------------------------------------------------------------------------


def _to_estimation_out(task: Task, *, confidence: int = 50) -> EstimationOut:
    estimate_hours = float(task.estimate_hours) if task.estimate_hours is not None else None
    actual_hours = float(task.actual_hours) if task.actual_hours is not None else 0.0
    estimate_for_variance = estimate_hours if estimate_hours is not None else 0.0
    return EstimationOut(
        task_id=task.id,
        key=task.key,
        title=task.title,
        estimate_hours=estimate_hours,
        actual_hours=actual_hours,
        story_points=task.story_points,
        variance=round(actual_hours - estimate_for_variance, 2),
        confidence=confidence,
    )


async def list_estimation(db: AsyncSession, workspace_id: UUID) -> list[EstimationOut]:
    stmt = (
        select(Task)
        .where(
            Task.workspace_id == workspace_id,
            Task.deleted_at.is_(None),
            Task.estimate_hours.is_not(None),
        )
        .order_by(Task.key.asc())
    )
    tasks = (await db.execute(stmt)).scalars().all()
    return [_to_estimation_out(t) for t in tasks]


async def update_estimation(db: AsyncSession, task_id: UUID, estimator_id: UUID, data: EstimationUpdate) -> EstimationOut:
    task = await db.get(Task, task_id)
    if task is None:
        raise NotFoundError("وظیفه یافت نشد.")

    if data.estimate_hours is not None:
        task.estimate_hours = Decimal(str(data.estimate_hours))
        db.add(
            EstimationRecord(
                workspace_id=task.workspace_id,
                task_id=task_id,
                estimator_id=estimator_id,
                estimate_value=Decimal(str(data.estimate_hours)),
                estimate_type="hours",
            )
        )
    if data.story_points is not None:
        task.story_points = data.story_points
        db.add(
            EstimationRecord(
                workspace_id=task.workspace_id,
                task_id=task_id,
                estimator_id=estimator_id,
                estimate_value=Decimal(str(data.story_points)),
                estimate_type="story_points",
            )
        )

    await db.flush()
    return _to_estimation_out(task, confidence=data.confidence if data.confidence is not None else 50)


# ---------------------------------------------------------------------------
# Request forms
# ---------------------------------------------------------------------------


def _to_request_form_out(form: RequestForm) -> RequestFormOut:
    return RequestFormOut(
        id=form.id,
        workspace_id=form.workspace_id,
        name=form.name,
        description=form.description,
        schema_fields=[RequestFormFieldSpec(**field) for field in (form.schema_definition or [])],
        is_active=form.is_active,
        created_by_id=form.created_by_id,
        created_at=form.created_at,
    )


async def list_request_forms(db: AsyncSession, workspace_id: UUID) -> list[RequestFormOut]:
    stmt = select(RequestForm).where(RequestForm.workspace_id == workspace_id).order_by(RequestForm.created_at.desc())
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_request_form_out(f) for f in rows]


async def create_request_form(db: AsyncSession, workspace_id: UUID, created_by_id: UUID, data: RequestFormCreate) -> RequestFormOut:
    form = RequestForm(
        workspace_id=workspace_id,
        name=data.name,
        description=data.description,
        schema_definition=[f.model_dump(mode="json") for f in data.schema_fields],
        is_active=True,
        created_by_id=created_by_id,
    )
    db.add(form)
    await db.flush()
    return _to_request_form_out(form)


async def list_submissions(db: AsyncSession, form_id: UUID) -> list[RequestSubmissionOut]:
    stmt = (
        select(RequestSubmission)
        .where(RequestSubmission.form_id == form_id)
        .order_by(RequestSubmission.created_at.desc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [RequestSubmissionOut.model_validate(s) for s in rows]


async def submit_request_form(
    db: AsyncSession, form_id: UUID, submitted_by_id: UUID, data: RequestSubmissionCreate
) -> RequestSubmissionOut:
    form = await db.get(RequestForm, form_id)
    if form is None:
        raise NotFoundError("فرم درخواست یافت نشد.")
    submission = RequestSubmission(
        workspace_id=form.workspace_id,
        form_id=form_id,
        submitted_by_id=submitted_by_id,
        data=data.data,
        status="pending",
    )
    db.add(submission)
    await db.flush()
    return RequestSubmissionOut.model_validate(submission)


# ---------------------------------------------------------------------------
# Comments / mentions / my-work queries
# ---------------------------------------------------------------------------


async def list_all_comments(db: AsyncSession, workspace_id: UUID, *, limit: int = 200) -> list[CommentOut]:
    from app.models.task import TaskComment

    stmt = (
        select(TaskComment)
        .join(Task, Task.id == TaskComment.task_id)
        .where(Task.workspace_id == workspace_id, TaskComment.deleted_at.is_(None))
        .order_by(TaskComment.created_at.desc())
        .limit(limit)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_comment_out(c) for c in rows]


async def list_mentions(db: AsyncSession, workspace_id: UUID, user_id: UUID) -> list[CommentOut]:
    from app.models.task import TaskComment

    stmt = (
        select(TaskComment)
        .join(Task, Task.id == TaskComment.task_id)
        .where(
            Task.workspace_id == workspace_id,
            TaskComment.deleted_at.is_(None),
            TaskComment.mentions.any(user_id),
        )
        .order_by(TaskComment.created_at.desc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_comment_out(c) for c in rows]


async def list_my_tasks(db: AsyncSession, user_id: UUID, workspace_id: UUID | None = None) -> list[TaskOut]:
    stmt = select(Task).where(Task.assignee_id == user_id)
    if workspace_id is not None:
        stmt = stmt.where(Task.workspace_id == workspace_id)
    stmt = stmt.order_by(Task.due_date.asc().nulls_last())
    tasks = (await db.execute(stmt)).scalars().all()
    return [await _to_task_out(db, t) for t in tasks]


async def list_overdue_tasks(
    db: AsyncSession, *, user_id: UUID | None = None, workspace_id: UUID | None = None
) -> list[TaskOut]:
    today = date.today()
    stmt = select(Task).where(
        Task.due_date.is_not(None), Task.due_date < today, Task.status.notin_(["done", "cancelled"])
    )
    if user_id is not None:
        stmt = stmt.where(Task.assignee_id == user_id)
    if workspace_id is not None:
        stmt = stmt.where(Task.workspace_id == workspace_id)
    stmt = stmt.order_by(Task.due_date.asc())
    tasks = (await db.execute(stmt)).scalars().all()
    return [await _to_task_out(db, t) for t in tasks]


async def list_upcoming_deadlines(
    db: AsyncSession, *, user_id: UUID | None = None, workspace_id: UUID | None = None, days: int = 14
) -> list[TaskOut]:
    today = date.today()
    cutoff = today + timedelta(days=days)
    stmt = select(Task).where(
        Task.due_date.is_not(None),
        Task.due_date >= today,
        Task.due_date <= cutoff,
        Task.status.notin_(["done", "cancelled"]),
    )
    if user_id is not None:
        stmt = stmt.where(Task.assignee_id == user_id)
    if workspace_id is not None:
        stmt = stmt.where(Task.workspace_id == workspace_id)
    stmt = stmt.order_by(Task.due_date.asc())
    tasks = (await db.execute(stmt)).scalars().all()
    return [await _to_task_out(db, t) for t in tasks]
