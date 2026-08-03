"""Task, comment, checklist, dependency and workspace-label endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, PermissionDeniedError
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.workspace import get_workspace_membership, require_permission
from app.models.task import Task, TaskComment
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.permissions.rbac import PERM_TASKS_CREATE, PERM_TASKS_DELETE, has_permission
from app.schemas.common import MessageResponse
from app.schemas.task import (
    BulkUpdateRequest,
    ChecklistItemCreate,
    ChecklistItemOut,
    ChecklistItemUpdate,
    CommentCreate,
    CommentOut,
    CommentUpdate,
    LabelCreate,
    LabelOut,
    LabelUpdate,
    TaskCreate,
    TaskDependencyUpdate,
    TaskOut,
    TaskUpdate,
)
from app.services import task_service
from app.services import advanced_service

router = APIRouter(tags=["tasks"])


async def _get_membership(db: AsyncSession, workspace_id: UUID, user_id: UUID) -> WorkspaceMember:
    stmt = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user_id
    )
    membership = (await db.execute(stmt)).scalar_one_or_none()
    if membership is None:
        raise NotFoundError("وظیفه یافت نشد.")
    return membership


def require_task_permission(permission_key: str | None):
    async def _checker(
        task_id: UUID,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> Task:
        task = await db.get(Task, task_id)
        if task is None:
            raise NotFoundError("وظیفه یافت نشد.")
        membership = await _get_membership(db, task.workspace_id, current_user.id)
        if permission_key and not has_permission(membership.role, permission_key):
            raise PermissionDeniedError("شما اجازه انجام این عملیات را ندارید.")
        return task

    return _checker


@router.get("/projects/{project_id}/tasks", response_model=list[TaskOut])
async def list_project_tasks(
    project_id: UUID,
    status: str | None = None,
    priority: str | None = None,
    assignee: UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TaskOut]:
    return await task_service.list_by_project(db, project_id, status=status, priority=priority, assignee_id=assignee)


@router.get("/workspaces/{workspace_id}/tasks", response_model=list[TaskOut])
async def list_workspace_tasks(
    workspace_id: UUID,
    status: str | None = None,
    priority: str | None = None,
    assignee: UUID | None = None,
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> list[TaskOut]:
    return await task_service.list_by_workspace(
        db, workspace_id, status=status, priority=priority, assignee_id=assignee
    )


@router.post("/tasks", response_model=TaskOut)
async def create_task(
    data: TaskCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> TaskOut:
    from app.models.project import Project

    project = await db.get(Project, data.project_id)
    if project is None:
        raise NotFoundError("پروژه یافت نشد.")
    membership = await _get_membership(db, project.workspace_id, current_user.id)
    if not has_permission(membership.role, PERM_TASKS_CREATE):
        raise PermissionDeniedError("شما اجازه ایجاد وظیفه را ندارید.")
    return await task_service.create_task(db, project.workspace_id, current_user.id, data)


@router.get("/tasks/my", response_model=list[TaskOut])
async def list_my_tasks(
    workspace_id: UUID | None = Query(default=None, alias="workspaceId"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TaskOut]:
    return await advanced_service.list_my_tasks(db, current_user.id, workspace_id)


@router.get("/tasks/overdue", response_model=list[TaskOut])
async def list_overdue_tasks(
    workspace_id: UUID | None = Query(default=None, alias="workspaceId"),
    mine_only: bool = Query(default=False, alias="mineOnly"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TaskOut]:
    user_id = current_user.id if mine_only else None
    return await advanced_service.list_overdue_tasks(db, user_id=user_id, workspace_id=workspace_id)


@router.get("/tasks/upcoming-deadlines", response_model=list[TaskOut])
async def list_upcoming_deadlines(
    workspace_id: UUID | None = Query(default=None, alias="workspaceId"),
    mine_only: bool = Query(default=False, alias="mineOnly"),
    days: int = Query(default=14, ge=1, le=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TaskOut]:
    user_id = current_user.id if mine_only else None
    return await advanced_service.list_upcoming_deadlines(
        db, user_id=user_id, workspace_id=workspace_id, days=days
    )


@router.get("/tasks/{task_id}", response_model=TaskOut)
async def get_task(task: Task = Depends(require_task_permission(None)), db: AsyncSession = Depends(get_db)) -> TaskOut:
    return await task_service.get_task(db, task.id)


@router.patch("/tasks/{task_id}", response_model=TaskOut)
async def update_task(
    data: TaskUpdate, task: Task = Depends(require_task_permission(PERM_TASKS_CREATE)), db: AsyncSession = Depends(get_db)
) -> TaskOut:
    return await task_service.update_task(db, task.id, data)


@router.delete("/tasks/{task_id}", response_model=MessageResponse)
async def delete_task(
    task: Task = Depends(require_task_permission(PERM_TASKS_DELETE)), db: AsyncSession = Depends(get_db)
) -> MessageResponse:
    await task_service.delete_task(db, task.id)
    return MessageResponse(message="وظیفه حذف شد.")


@router.patch("/tasks/{task_id}/dependencies", response_model=TaskOut)
async def update_dependencies(
    data: TaskDependencyUpdate,
    task: Task = Depends(require_task_permission(PERM_TASKS_CREATE)),
    db: AsyncSession = Depends(get_db),
) -> TaskOut:
    return await task_service.update_dependencies(db, task.id, data.blocked_by_ids)


@router.post("/tasks/bulk-update", response_model=list[TaskOut])
async def bulk_update(
    data: BulkUpdateRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[TaskOut]:
    stmt = select(Task).where(Task.id.in_(data.task_ids))
    tasks = (await db.execute(stmt)).scalars().all()
    if not tasks:
        raise NotFoundError("وظایف موردنظر یافت نشدند.")
    workspace_ids = {t.workspace_id for t in tasks}
    for workspace_id in workspace_ids:
        membership = await _get_membership(db, workspace_id, current_user.id)
        required = PERM_TASKS_DELETE if data.delete else PERM_TASKS_CREATE
        if not has_permission(membership.role, required):
            raise PermissionDeniedError("شما اجازه انجام این عملیات را ندارید.")
    return await task_service.bulk_update(db, data)


@router.get("/tasks/{task_id}/comments", response_model=list[CommentOut])
async def list_task_comments(
    task: Task = Depends(require_task_permission(None)), db: AsyncSession = Depends(get_db)
) -> list[CommentOut]:
    return await task_service.list_task_comments(db, task.id)


@router.post("/tasks/{task_id}/comments", response_model=CommentOut)
async def create_task_comment(
    data: CommentCreate,
    task: Task = Depends(require_task_permission(PERM_TASKS_CREATE)),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CommentOut:
    return await task_service.create_task_comment(db, task.id, current_user.id, data)


async def _comment_task(db: AsyncSession, comment_id: UUID) -> tuple[TaskComment, Task]:
    comment = await db.get(TaskComment, comment_id)
    if comment is None:
        raise NotFoundError("نظر یافت نشد.")
    task = await db.get(Task, comment.task_id)
    if task is None:
        raise NotFoundError("نظر یافت نشد.")
    return comment, task


@router.patch("/tasks/comments/{comment_id}", response_model=CommentOut)
async def update_comment(
    comment_id: UUID,
    data: CommentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CommentOut:
    _, task = await _comment_task(db, comment_id)
    membership = await _get_membership(db, task.workspace_id, current_user.id)
    if not has_permission(membership.role, PERM_TASKS_CREATE):
        raise PermissionDeniedError("شما اجازه انجام این عملیات را ندارید.")
    return await task_service.update_comment(db, comment_id, current_user.id, data)


@router.delete("/tasks/comments/{comment_id}", response_model=MessageResponse)
async def delete_comment(
    comment_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> MessageResponse:
    _, task = await _comment_task(db, comment_id)
    membership = await _get_membership(db, task.workspace_id, current_user.id)
    if not has_permission(membership.role, PERM_TASKS_CREATE):
        raise PermissionDeniedError("شما اجازه انجام این عملیات را ندارید.")
    await task_service.delete_comment(db, comment_id, current_user.id)
    return MessageResponse(message="نظر حذف شد.")


@router.get("/workspaces/{workspace_id}/labels", response_model=list[LabelOut])
async def list_labels(
    workspace_id: UUID,
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> list[LabelOut]:
    return await task_service.list_labels(db, workspace_id)


@router.post("/workspaces/{workspace_id}/labels", response_model=LabelOut)
async def create_label(
    workspace_id: UUID,
    data: LabelCreate,
    membership: WorkspaceMember = Depends(require_permission(PERM_TASKS_CREATE)),
    db: AsyncSession = Depends(get_db),
) -> LabelOut:
    return await task_service.create_label(db, workspace_id, data)


@router.patch("/workspaces/{workspace_id}/labels/{label_id}", response_model=LabelOut)
async def update_label(
    workspace_id: UUID,
    label_id: UUID,
    data: LabelUpdate,
    membership: WorkspaceMember = Depends(require_permission(PERM_TASKS_CREATE)),
    db: AsyncSession = Depends(get_db),
) -> LabelOut:
    return await task_service.update_label(db, workspace_id, label_id, data)


@router.delete("/workspaces/{workspace_id}/labels/{label_id}", response_model=MessageResponse)
async def delete_label(
    workspace_id: UUID,
    label_id: UUID,
    membership: WorkspaceMember = Depends(require_permission(PERM_TASKS_CREATE)),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await task_service.delete_label(db, workspace_id, label_id)
    return MessageResponse(message="برچسب حذف شد.")


@router.post("/tasks/{task_id}/checklist", response_model=ChecklistItemOut)
async def add_checklist_item(
    data: ChecklistItemCreate,
    task: Task = Depends(require_task_permission(PERM_TASKS_CREATE)),
    db: AsyncSession = Depends(get_db),
) -> ChecklistItemOut:
    return await task_service.add_checklist_item(db, task.id, data)


@router.patch("/tasks/{task_id}/checklist/{item_id}", response_model=ChecklistItemOut)
async def update_checklist_item(
    item_id: UUID,
    data: ChecklistItemUpdate,
    task: Task = Depends(require_task_permission(PERM_TASKS_CREATE)),
    db: AsyncSession = Depends(get_db),
) -> ChecklistItemOut:
    return await task_service.update_checklist_item(db, task.id, item_id, data)


@router.delete("/tasks/{task_id}/checklist/{item_id}", response_model=MessageResponse)
async def delete_checklist_item(
    item_id: UUID, task: Task = Depends(require_task_permission(PERM_TASKS_CREATE)), db: AsyncSession = Depends(get_db)
) -> MessageResponse:
    await task_service.delete_checklist_item(db, task.id, item_id)
    return MessageResponse(message="آیتم چک‌لیست حذف شد.")
