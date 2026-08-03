"""Project view endpoints: kanban board, list/table, calendar, timeline/gantt, schedule."""

from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.routes.projects import require_project_permission
from app.core.exceptions import PermissionDeniedError
from app.db.session import get_db
from app.models.project import Project
from app.permissions.rbac import PERM_PROJECTS_MANAGE
from app.schemas.common import Page
from app.schemas.project import (
    KanbanColumnCreate,
    KanbanColumnOut,
    KanbanColumnUpdate,
    KanbanMoveRequest,
    KanbanReorderColumns,
    ScheduleUpdateRequest,
)
from app.schemas.task import TaskOut
from app.services import project_service, task_service
from app.utils.persian import contains_normalized

router = APIRouter(tags=["views"])


@router.get("/projects/{project_id}/kanban")
async def get_kanban_board(
    project: Project = Depends(require_project_permission(None)), db: AsyncSession = Depends(get_db)
) -> dict:
    columns = await project_service.list_columns(db, project.id)
    tasks = await task_service.list_by_project(db, project.id)
    return {"columns": columns, "tasks": tasks}


@router.get("/projects/{project_id}/kanban/columns", response_model=list[KanbanColumnOut])
async def list_columns(
    project: Project = Depends(require_project_permission(None)), db: AsyncSession = Depends(get_db)
) -> list[KanbanColumnOut]:
    return await project_service.list_columns(db, project.id)


@router.post("/projects/{project_id}/kanban/columns", response_model=KanbanColumnOut)
async def create_column(
    data: KanbanColumnCreate,
    project: Project = Depends(require_project_permission(PERM_PROJECTS_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> KanbanColumnOut:
    return await project_service.create_column(db, project.id, data)


@router.patch("/projects/{project_id}/kanban/columns/{column_id}", response_model=KanbanColumnOut)
async def update_column(
    column_id: UUID,
    data: KanbanColumnUpdate,
    project: Project = Depends(require_project_permission(PERM_PROJECTS_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> KanbanColumnOut:
    return await project_service.update_column(db, project.id, column_id, data)


@router.delete("/projects/{project_id}/kanban/columns/{column_id}")
async def delete_column(
    column_id: UUID,
    project: Project = Depends(require_project_permission(PERM_PROJECTS_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await project_service.delete_column(db, project.id, column_id)
    return {"success": True, "message": "ستون حذف شد."}


@router.post("/projects/{project_id}/kanban/columns/reorder", response_model=list[KanbanColumnOut])
async def reorder_columns(
    data: KanbanReorderColumns,
    project: Project = Depends(require_project_permission(PERM_PROJECTS_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> list[KanbanColumnOut]:
    return await project_service.reorder_columns(db, project.id, data)


@router.post("/projects/{project_id}/kanban/move", response_model=TaskOut)
async def move_task(
    data: KanbanMoveRequest,
    project: Project = Depends(require_project_permission(None)),
    db: AsyncSession = Depends(get_db),
) -> TaskOut:
    await project_service.move_task(db, project.id, data)
    return await task_service.get_task(db, data.task_id)


@router.get("/projects/{project_id}/list", response_model=Page)
async def list_view(
    q: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    assignee: UUID | None = None,
    label: UUID | None = None,
    sort: str = Query(default="order"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200, alias="pageSize"),
    project: Project = Depends(require_project_permission(None)),
    db: AsyncSession = Depends(get_db),
) -> Page:
    tasks = await task_service.list_by_project(db, project.id, status=status, priority=priority, assignee_id=assignee)

    if label is not None:
        tasks = [t for t in tasks if label in t.label_ids]
    if q:
        tasks = [t for t in tasks if contains_normalized(t.title, q) or contains_normalized(t.key, q)]

    sort_key_map = {
        "order": lambda t: t.order,
        "dueDate": lambda t: (t.due_date is None, t.due_date),
        "priority": lambda t: t.priority,
        "updatedAt": lambda t: t.updated_at,
    }
    tasks.sort(key=sort_key_map.get(sort, sort_key_map["order"]))

    total = len(tasks)
    start = (page - 1) * page_size
    page_items = tasks[start : start + page_size]

    return Page(items=page_items, total=total, page=page, page_size=page_size, has_more=start + page_size < total)


@router.get("/projects/{project_id}/calendar", response_model=list[TaskOut])
async def calendar_view(
    date_from: date = Query(alias="from"),
    date_to: date = Query(alias="to"),
    project: Project = Depends(require_project_permission(None)),
    db: AsyncSession = Depends(get_db),
) -> list[TaskOut]:
    tasks = await task_service.list_by_project(db, project.id)
    return [
        t
        for t in tasks
        if (t.due_date and date_from <= t.due_date <= date_to)
        or (t.start_date and date_from <= t.start_date <= date_to)
    ]


def _task_bar(task: TaskOut) -> dict:
    start = task.start_date or task.created_at.date()
    end = task.due_date or start
    if end < start:
        end = start
    return {
        "id": str(task.id),
        "key": task.key,
        "title": task.title,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "progress": task.progress,
        "status": task.status,
        "assigneeId": str(task.assignee_id) if task.assignee_id else None,
        "dependsOn": [str(x) for x in task.blocked_by_ids],
    }


@router.get("/projects/{project_id}/timeline")
async def timeline_view(
    project: Project = Depends(require_project_permission(None)), db: AsyncSession = Depends(get_db)
) -> dict:
    tasks = await task_service.list_by_project(db, project.id)
    return {"bars": [_task_bar(t) for t in tasks]}


@router.get("/projects/{project_id}/gantt")
async def gantt_view(
    project: Project = Depends(require_project_permission(None)), db: AsyncSession = Depends(get_db)
) -> dict:
    return await timeline_view(project=project, db=db)


@router.patch("/projects/{project_id}/schedule", response_model=list[TaskOut])
async def update_schedule(
    data: ScheduleUpdateRequest,
    project: Project = Depends(require_project_permission(PERM_PROJECTS_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> list[TaskOut]:
    from app.schemas.task import TaskUpdate

    results: list[TaskOut] = []
    for item in data.items:
        task = await task_service.get_task(db, item.task_id)
        if task.project_id != project.id:
            raise PermissionDeniedError("این وظیفه متعلق به این پروژه نیست.")
        updated = await task_service.update_task(
            db, item.task_id, TaskUpdate(start_date=item.start_date, due_date=item.due_date)
        )
        results.append(updated)
    return results
