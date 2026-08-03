"""Dashboard, task, member-performance, time-tracking and trend reporting.

All figures are computed live from the real ORM tables (Project, Task,
WorkspaceMember, TimeEntry) -- there is no separate reporting/warehouse layer
yet, so these queries intentionally stay simple (COUNT/SUM/GROUP BY) rather
than pre-aggregated.
"""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.advanced import TimeEntry
from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.schemas.report import (
    DashboardMetrics,
    MemberPerformanceRow,
    ProgressTrendRow,
    TaskPriorityRow,
    TaskStatusRow,
    TimeTrackingByMember,
    TimeTrackingByProject,
    TimeTrackingReport,
)

_DONE_LIKE = ("done", "cancelled")


def _as_float(value: Decimal | float | None) -> float:
    return float(value) if value is not None else 0.0


async def get_dashboard_metrics(db: AsyncSession, workspace_id: UUID) -> DashboardMetrics:
    today = date.today()
    week_end = today + timedelta(days=7)

    total_projects = (
        await db.execute(select(func.count(Project.id)).where(Project.workspace_id == workspace_id))
    ).scalar_one()
    active_projects = (
        await db.execute(
            select(func.count(Project.id)).where(Project.workspace_id == workspace_id, Project.status == "active")
        )
    ).scalar_one()
    total_tasks = (
        await db.execute(select(func.count(Task.id)).where(Task.workspace_id == workspace_id))
    ).scalar_one()
    completed_tasks = (
        await db.execute(
            select(func.count(Task.id)).where(Task.workspace_id == workspace_id, Task.status == "done")
        )
    ).scalar_one()
    overdue_tasks = (
        await db.execute(
            select(func.count(Task.id)).where(
                Task.workspace_id == workspace_id,
                Task.due_date.is_not(None),
                Task.due_date < today,
                Task.status.notin_(_DONE_LIKE),
            )
        )
    ).scalar_one()
    tasks_due_this_week = (
        await db.execute(
            select(func.count(Task.id)).where(
                Task.workspace_id == workspace_id,
                Task.due_date.is_not(None),
                Task.due_date >= today,
                Task.due_date <= week_end,
                Task.status.notin_(_DONE_LIKE),
            )
        )
    ).scalar_one()
    total_members = (
        await db.execute(
            select(func.count(WorkspaceMember.id)).where(
                WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.is_active.is_(True)
            )
        )
    ).scalar_one()

    completion_rate = round((completed_tasks / total_tasks) * 100, 1) if total_tasks else 0.0

    return DashboardMetrics(
        total_projects=total_projects,
        active_projects=active_projects,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        overdue_tasks=overdue_tasks,
        total_members=total_members,
        tasks_due_this_week=tasks_due_this_week,
        completion_rate=completion_rate,
    )


async def get_task_status_report(db: AsyncSession, project_id: UUID) -> list[TaskStatusRow]:
    stmt = (
        select(Task.status, func.count(Task.id)).where(Task.project_id == project_id).group_by(Task.status)
    )
    rows = (await db.execute(stmt)).all()
    total = sum(count for _, count in rows) or 1
    return [
        TaskStatusRow(status=status, count=count, percentage=round((count / total) * 100, 1))
        for status, count in rows
    ]


async def get_task_priority_report(db: AsyncSession, project_id: UUID) -> list[TaskPriorityRow]:
    stmt = (
        select(Task.priority, func.count(Task.id)).where(Task.project_id == project_id).group_by(Task.priority)
    )
    rows = (await db.execute(stmt)).all()
    total = sum(count for _, count in rows) or 1
    return [
        TaskPriorityRow(priority=priority, count=count, percentage=round((count / total) * 100, 1))
        for priority, count in rows
    ]


async def _overdue_counts_by_assignee(db: AsyncSession, workspace_id: UUID) -> dict[UUID, int]:
    today = date.today()
    stmt = (
        select(Task.assignee_id, func.count(Task.id))
        .where(
            Task.workspace_id == workspace_id,
            Task.assignee_id.is_not(None),
            Task.deleted_at.is_(None),
            Task.due_date.is_not(None),
            Task.due_date < today,
            Task.status.notin_(_DONE_LIKE),
        )
        .group_by(Task.assignee_id)
    )
    return {assignee_id: count for assignee_id, count in (await db.execute(stmt)).all()}


async def get_member_performance(db: AsyncSession, workspace_id: UUID) -> list[MemberPerformanceRow]:
    stmt = (
        select(User)
        .join(WorkspaceMember, WorkspaceMember.user_id == User.id)
        .where(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.is_active.is_(True))
        .order_by(User.name.asc())
    )
    members = (await db.execute(stmt)).scalars().all()
    overdue_by_user = await _overdue_counts_by_assignee(db, workspace_id)

    rows: list[MemberPerformanceRow] = []
    for user in members:
        task_stmt = select(Task).where(
            Task.workspace_id == workspace_id,
            Task.assignee_id == user.id,
            Task.deleted_at.is_(None),
        )
        tasks = (await db.execute(task_stmt)).scalars().all()

        completed = [t for t in tasks if t.status == "done"]
        hours = [_as_float(t.actual_hours) for t in completed if t.actual_hours is not None]
        avg_hours = round(sum(hours) / len(hours), 1) if hours else None

        on_time_eligible = [t for t in completed if t.due_date is not None]
        on_time_count = sum(1 for t in on_time_eligible if t.updated_at.date() <= t.due_date)
        on_time_rate = round((on_time_count / len(on_time_eligible)) * 100, 1) if on_time_eligible else 100.0

        rows.append(
            MemberPerformanceRow(
                user_id=str(user.id),
                user_name=user.name,
                tasks_assigned=len(tasks),
                tasks_completed=len(completed),
                tasks_overdue=overdue_by_user.get(user.id, 0),
                avg_completion_hours=avg_hours,
                on_time_rate=on_time_rate,
            )
        )
    return rows


async def get_time_tracking_report(db: AsyncSession, workspace_id: UUID) -> TimeTrackingReport:
    stmt = select(TimeEntry).where(TimeEntry.workspace_id == workspace_id)
    entries = (await db.execute(stmt)).scalars().all()

    total_hours = sum(_as_float(e.hours) for e in entries)
    billable_hours = sum(_as_float(e.hours) for e in entries if e.billable)
    non_billable_hours = total_hours - billable_hours

    by_member: dict[UUID, list] = {}
    for entry in entries:
        if entry.user_id is None:
            continue
        by_member.setdefault(entry.user_id, []).append(entry)

    member_rows: list[TimeTrackingByMember] = []
    for user_id, user_entries in by_member.items():
        user = await db.get(User, user_id)
        member_rows.append(
            TimeTrackingByMember(
                user_id=str(user_id),
                user_name=user.name if user else "کاربر حذف‌شده",
                total_hours=round(sum(_as_float(e.hours) for e in user_entries), 1),
                billable_hours=round(sum(_as_float(e.hours) for e in user_entries if e.billable), 1),
            )
        )

    by_project: dict[UUID, list] = {}
    for entry in entries:
        task = await db.get(Task, entry.task_id)
        if task is None:
            continue
        by_project.setdefault(task.project_id, []).append(entry)

    project_rows: list[TimeTrackingByProject] = []
    for project_id, project_entries in by_project.items():
        project = await db.get(Project, project_id)
        project_rows.append(
            TimeTrackingByProject(
                project_id=str(project_id),
                project_name=project.name if project else "پروژه حذف‌شده",
                total_hours=round(sum(_as_float(e.hours) for e in project_entries), 1),
                billable_hours=round(sum(_as_float(e.hours) for e in project_entries if e.billable), 1),
            )
        )

    return TimeTrackingReport(
        total_hours=round(total_hours, 1),
        billable_hours=round(billable_hours, 1),
        non_billable_hours=round(non_billable_hours, 1),
        by_member=member_rows,
        by_project=project_rows,
    )


def _week_buckets(weeks: int) -> list[tuple[date, date]]:
    today = date.today()
    current_start = today - timedelta(days=today.weekday())
    buckets = []
    for i in range(weeks - 1, -1, -1):
        start = current_start - timedelta(weeks=i)
        end = start + timedelta(days=6)
        buckets.append((start, end))
    return buckets


async def get_progress_trend(db: AsyncSession, project_id: UUID, *, weeks: int = 6) -> list[ProgressTrendRow]:
    stmt = select(Task).where(Task.project_id == project_id)
    tasks = (await db.execute(stmt)).scalars().all()

    buckets = _week_buckets(weeks)
    rows: list[ProgressTrendRow] = []
    for start, end in buckets:
        created = sum(1 for t in tasks if start <= t.created_at.date() <= end)
        completed = sum(1 for t in tasks if t.status == "done" and start <= t.updated_at.date() <= end)
        cumulative_completed = sum(1 for t in tasks if t.status == "done" and t.updated_at.date() <= end)
        rows.append(
            ProgressTrendRow(date=start, created=created, completed=completed, cumulative_completed=cumulative_completed)
        )
    return rows
