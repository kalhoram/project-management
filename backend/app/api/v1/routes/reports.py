"""Dashboard, task-status, member-performance, time-tracking and trend reports."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.routes.projects import require_project_permission
from app.db.session import get_db
from app.dependencies.workspace import get_workspace_membership
from app.models.project import Project
from app.models.workspace import WorkspaceMember
from app.schemas.report import (
    DashboardMetrics,
    MemberPerformanceRow,
    ProgressTrendRow,
    TaskPriorityRow,
    TaskStatusRow,
    TimeTrackingReport,
)
from app.services import report_service

router = APIRouter(tags=["reports"])


@router.get("/workspaces/{workspace_id}/reports/dashboard", response_model=DashboardMetrics)
async def dashboard_metrics(
    workspace_id: UUID,
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> DashboardMetrics:
    return await report_service.get_dashboard_metrics(db, workspace_id)


@router.get("/projects/{project_id}/reports/status", response_model=list[TaskStatusRow])
async def task_status_report(
    project: Project = Depends(require_project_permission(None)), db: AsyncSession = Depends(get_db)
) -> list[TaskStatusRow]:
    return await report_service.get_task_status_report(db, project.id)


@router.get("/projects/{project_id}/reports/priority", response_model=list[TaskPriorityRow])
async def task_priority_report(
    project: Project = Depends(require_project_permission(None)), db: AsyncSession = Depends(get_db)
) -> list[TaskPriorityRow]:
    return await report_service.get_task_priority_report(db, project.id)


@router.get("/workspaces/{workspace_id}/reports/members", response_model=list[MemberPerformanceRow])
async def member_performance_report(
    workspace_id: UUID,
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> list[MemberPerformanceRow]:
    return await report_service.get_member_performance(db, workspace_id)


@router.get("/workspaces/{workspace_id}/reports/time-tracking", response_model=TimeTrackingReport)
async def time_tracking_report(
    workspace_id: UUID,
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> TimeTrackingReport:
    return await report_service.get_time_tracking_report(db, workspace_id)


@router.get("/projects/{project_id}/reports/progress-trend", response_model=list[ProgressTrendRow])
async def progress_trend_report(
    weeks: int = Query(default=6, ge=1, le=52),
    project: Project = Depends(require_project_permission(None)),
    db: AsyncSession = Depends(get_db),
) -> list[ProgressTrendRow]:
    return await report_service.get_progress_trend(db, project.id, weeks=weeks)
