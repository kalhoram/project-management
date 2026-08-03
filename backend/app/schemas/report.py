from __future__ import annotations

from datetime import date as date_

from pydantic import Field

from app.schemas.common import CamelModel
from app.schemas.enums import TaskPriority, TaskStatus


class DashboardMetrics(CamelModel):
    total_projects: int
    active_projects: int
    total_tasks: int
    completed_tasks: int
    overdue_tasks: int
    total_members: int
    tasks_due_this_week: int
    completion_rate: float


class TaskStatusRow(CamelModel):
    status: TaskStatus
    count: int
    percentage: float


class TaskPriorityRow(CamelModel):
    priority: TaskPriority
    count: int
    percentage: float


class MemberPerformanceRow(CamelModel):
    user_id: str
    user_name: str
    tasks_assigned: int
    tasks_completed: int
    tasks_overdue: int = 0
    avg_completion_hours: float | None = None
    on_time_rate: float


class ProgressTrendRow(CamelModel):
    date: date_
    created: int
    completed: int
    cumulative_completed: int


class TimeTrackingByMember(CamelModel):
    user_id: str
    user_name: str
    total_hours: float
    billable_hours: float


class TimeTrackingByProject(CamelModel):
    project_id: str
    project_name: str
    total_hours: float
    billable_hours: float


class TimeTrackingReport(CamelModel):
    total_hours: float
    billable_hours: float
    non_billable_hours: float
    by_member: list[TimeTrackingByMember] = Field(default_factory=list)
    by_project: list[TimeTrackingByProject] = Field(default_factory=list)
