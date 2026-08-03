"""Project, category and kanban board business logic.

Aligned with the real ORM models (app.models.project / app.models.task):

- Project: id, workspace_id (via TenantMixin), name, description, key, status,
  visibility, category_id, owner_id, start_date, due_date, progress,
  task_count, completed_task_count, template_id, archived_at, created_at,
  updated_at, deleted_at (SoftDeleteMixin). Member list is NOT a column --
  it lives in the `ProjectMember` association table.
- ProjectMember: project_id, user_id, role.
- ProjectCategory: id, workspace_id, name, color, project_count.
- KanbanColumn: id, project_id, name, status, sort_order (frontend `order`),
  wip_limit, color.
- Task: id, project_id, workspace_id, sort_order (frontend `order`), status,
  column_id (see app.services.task_service for full contract).
"""

from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Literal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.models.project import KanbanColumn, Project, ProjectCategory, ProjectMember
from app.models.task import Task
from app.models.workspace import Workspace
from app.schemas.project import (
    KanbanColumnCreate,
    KanbanColumnOut,
    KanbanColumnUpdate,
    KanbanMoveRequest,
    KanbanReorderColumns,
    ProjectCategoryCreate,
    ProjectCategoryOut,
    ProjectCategoryUpdate,
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
)

ProjectScope = Literal["active", "archived", "deleted"]

_SCOPE_STATUSES: dict[ProjectScope, tuple[str, ...]] = {
    "active": ("active", "on_hold", "completed"),
    "archived": ("archived",),
    "deleted": ("deleted",),
}

_DEFAULT_COLUMNS = [
    ("انجام‌نشده", "todo", "#94a3b8"),
    ("در حال انجام", "in_progress", "#3b82f6"),
    ("بررسی", "in_review", "#f59e0b"),
    ("انجام‌شده", "done", "#22c55e"),
]


def _slug_key(name: str) -> str:
    letters = re.sub(r"[^A-Za-z\u0600-\u06FF]", "", name.upper())
    return (letters[:4] or "PRJ")[:4]


async def _generate_unique_key(db: AsyncSession, workspace_id: UUID, name: str) -> str:
    base = _slug_key(name)
    candidate = base
    suffix = 2
    while True:
        stmt = select(Project.id).where(Project.workspace_id == workspace_id, Project.key == candidate)
        if (await db.execute(stmt)).scalar_one_or_none() is None:
            return candidate
        candidate = f"{base}{suffix}"
        suffix += 1


async def _member_ids(db: AsyncSession, project_id: UUID) -> list[UUID]:
    stmt = select(ProjectMember.user_id).where(ProjectMember.project_id == project_id)
    return list((await db.execute(stmt)).scalars().all())


async def _to_project_out(db: AsyncSession, project: Project) -> ProjectOut:
    member_ids = await _member_ids(db, project.id)
    return ProjectOut.model_validate(project).model_copy(update={"member_ids": member_ids})


async def _set_members(db: AsyncSession, project_id: UUID, owner_id: UUID, member_ids: list[UUID]) -> None:
    existing_stmt = select(ProjectMember).where(ProjectMember.project_id == project_id)
    for row in (await db.execute(existing_stmt)).scalars().all():
        await db.delete(row)
    await db.flush()

    final_ids = list(dict.fromkeys([owner_id, *member_ids]))
    for user_id in final_ids:
        db.add(
            ProjectMember(
                project_id=project_id,
                user_id=user_id,
                role="owner" if user_id == owner_id else "member",
            )
        )


async def list_projects(db: AsyncSession, workspace_id: UUID, scope: ProjectScope = "active") -> list[ProjectOut]:
    statuses = _SCOPE_STATUSES[scope]
    stmt = (
        select(Project)
        .where(Project.workspace_id == workspace_id, Project.status.in_(statuses))
        .order_by(Project.created_at.desc())
    )
    projects = (await db.execute(stmt)).scalars().all()
    return [await _to_project_out(db, p) for p in projects]


async def get_project(db: AsyncSession, project_id: UUID) -> ProjectOut:
    project = await db.get(Project, project_id)
    if project is None:
        raise NotFoundError("پروژه یافت نشد.")
    return await _to_project_out(db, project)


async def create_project(
    db: AsyncSession, workspace_id: UUID, owner_id: UUID, data: ProjectCreate
) -> ProjectOut:
    key = data.key.strip().upper() if data.key else await _generate_unique_key(db, workspace_id, data.name)
    if data.key:
        stmt = select(Project.id).where(Project.workspace_id == workspace_id, Project.key == key)
        if (await db.execute(stmt)).scalar_one_or_none() is not None:
            raise ConflictError("کلید پروژه در این فضای کاری قبلاً استفاده شده است.")

    project = Project(
        workspace_id=workspace_id,
        name=data.name.strip(),
        description=data.description,
        key=key,
        status="active",
        visibility=data.visibility,
        category_id=data.category_id,
        owner_id=owner_id,
        start_date=data.start_date,
        due_date=data.due_date,
        progress=0,
        task_count=0,
        completed_task_count=0,
        template_id=data.template_id,
    )
    db.add(project)
    await db.flush()

    await _set_members(db, project.id, owner_id, data.member_ids)

    for index, (name, status, color) in enumerate(_DEFAULT_COLUMNS):
        db.add(KanbanColumn(project_id=project.id, name=name, status=status, sort_order=index, color=color))

    workspace = await db.get(Workspace, workspace_id)
    if workspace is not None:
        workspace.project_count = (workspace.project_count or 0) + 1

    await db.flush()
    return await _to_project_out(db, project)


async def update_project(db: AsyncSession, project_id: UUID, data: ProjectUpdate) -> ProjectOut:
    project = await db.get(Project, project_id)
    if project is None:
        raise NotFoundError("پروژه یافت نشد.")

    updates = data.model_dump(exclude_unset=True, exclude={"member_ids"})
    for field, value in updates.items():
        setattr(project, field, value)
    project.updated_at = datetime.now(UTC)

    if data.member_ids is not None:
        owner_id = data.owner_id or project.owner_id
        await _set_members(db, project_id, owner_id, data.member_ids)

    await db.flush()
    return await _to_project_out(db, project)


async def archive_project(db: AsyncSession, project_id: UUID) -> ProjectOut:
    project = await db.get(Project, project_id)
    if project is None:
        raise NotFoundError("پروژه یافت نشد.")
    project.status = "archived"
    project.archived_at = datetime.now(UTC)
    await db.flush()
    return await _to_project_out(db, project)


async def restore_project(db: AsyncSession, project_id: UUID) -> ProjectOut:
    project = await db.get(Project, project_id)
    if project is None:
        raise NotFoundError("پروژه یافت نشد.")
    project.status = "active"
    project.archived_at = None
    project.deleted_at = None
    await db.flush()
    return await _to_project_out(db, project)


async def soft_delete_project(db: AsyncSession, project_id: UUID) -> ProjectOut:
    project = await db.get(Project, project_id)
    if project is None:
        raise NotFoundError("پروژه یافت نشد.")
    project.status = "deleted"
    project.deleted_at = datetime.now(UTC)
    await db.flush()
    return await _to_project_out(db, project)


async def permanent_delete_project(db: AsyncSession, project_id: UUID) -> None:
    project = await db.get(Project, project_id)
    if project is None:
        raise NotFoundError("پروژه یافت نشد.")
    if project.status != "deleted":
        raise ConflictError("پروژه باید ابتدا حذف موقت شود.")

    workspace = await db.get(Workspace, project.workspace_id)
    if workspace is not None and workspace.project_count:
        workspace.project_count = max(0, workspace.project_count - 1)

    await db.delete(project)


async def list_categories(db: AsyncSession, workspace_id: UUID) -> list[ProjectCategoryOut]:
    stmt = select(ProjectCategory).where(ProjectCategory.workspace_id == workspace_id).order_by(ProjectCategory.name)
    categories = (await db.execute(stmt)).scalars().all()
    return [ProjectCategoryOut.model_validate(c) for c in categories]


async def create_category(db: AsyncSession, workspace_id: UUID, data: ProjectCategoryCreate) -> ProjectCategoryOut:
    category = ProjectCategory(workspace_id=workspace_id, name=data.name, color=data.color, project_count=0)
    db.add(category)
    await db.flush()
    return ProjectCategoryOut.model_validate(category)


async def update_category(
    db: AsyncSession, workspace_id: UUID, category_id: UUID, data: ProjectCategoryUpdate
) -> ProjectCategoryOut:
    category = await db.get(ProjectCategory, category_id)
    if category is None or category.workspace_id != workspace_id:
        raise NotFoundError("دسته‌بندی یافت نشد.")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    await db.flush()
    return ProjectCategoryOut.model_validate(category)


async def delete_category(db: AsyncSession, workspace_id: UUID, category_id: UUID) -> None:
    category = await db.get(ProjectCategory, category_id)
    if category is None or category.workspace_id != workspace_id:
        raise NotFoundError("دسته‌بندی یافت نشد.")
    await db.delete(category)


def _to_column_out(column: KanbanColumn) -> KanbanColumnOut:
    return KanbanColumnOut(
        id=column.id,
        project_id=column.project_id,
        name=column.name,
        status=column.status,
        order=column.sort_order,
        wip_limit=column.wip_limit,
        color=column.color,
    )


async def list_columns(db: AsyncSession, project_id: UUID) -> list[KanbanColumnOut]:
    stmt = select(KanbanColumn).where(KanbanColumn.project_id == project_id).order_by(KanbanColumn.sort_order.asc())
    columns = (await db.execute(stmt)).scalars().all()
    return [_to_column_out(c) for c in columns]


async def create_column(db: AsyncSession, project_id: UUID, data: KanbanColumnCreate) -> KanbanColumnOut:
    if data.order is None:
        count_stmt = select(KanbanColumn.id).where(KanbanColumn.project_id == project_id)
        order = len((await db.execute(count_stmt)).scalars().all())
    else:
        order = data.order

    column = KanbanColumn(
        project_id=project_id,
        name=data.name,
        status=data.status,
        sort_order=order,
        wip_limit=data.wip_limit,
        color=data.color,
    )
    db.add(column)
    await db.flush()
    return _to_column_out(column)


async def update_column(
    db: AsyncSession, project_id: UUID, column_id: UUID, data: KanbanColumnUpdate
) -> KanbanColumnOut:
    column = await db.get(KanbanColumn, column_id)
    if column is None or column.project_id != project_id:
        raise NotFoundError("ستون کانبان یافت نشد.")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(column, field, value)
    await db.flush()
    return _to_column_out(column)


async def delete_column(db: AsyncSession, project_id: UUID, column_id: UUID) -> None:
    column = await db.get(KanbanColumn, column_id)
    if column is None or column.project_id != project_id:
        raise NotFoundError("ستون کانبان یافت نشد.")
    await db.delete(column)


async def move_task(db: AsyncSession, project_id: UUID, data: KanbanMoveRequest) -> None:
    task = await db.get(Task, data.task_id)
    if task is None or task.project_id != project_id:
        raise NotFoundError("وظیفه یافت نشد.")
    column = await db.get(KanbanColumn, data.column_id)
    if column is None or column.project_id != project_id:
        raise NotFoundError("ستون کانبان یافت نشد.")

    if column.wip_limit:
        count_stmt = select(Task.id).where(Task.column_id == column.id, Task.id != task.id)
        current_count = len((await db.execute(count_stmt)).scalars().all())
        if current_count >= column.wip_limit:
            raise ConflictError("ظرفیت این ستون تکمیل شده است.")

    stmt = (
        select(Task)
        .where(Task.column_id == data.column_id, Task.id != task.id)
        .order_by(Task.sort_order.asc())
    )
    siblings = list((await db.execute(stmt)).scalars().all())
    target_index = max(0, min(data.order, len(siblings)))
    siblings.insert(target_index, task)

    task.column_id = data.column_id
    task.status = column.status
    task.updated_at = datetime.now(UTC)

    for index, sibling in enumerate(siblings):
        sibling.sort_order = index


async def reorder_columns(db: AsyncSession, project_id: UUID, data: KanbanReorderColumns) -> list[KanbanColumnOut]:
    stmt = select(KanbanColumn).where(KanbanColumn.project_id == project_id)
    columns = {c.id: c for c in (await db.execute(stmt)).scalars().all()}

    missing = [cid for cid in data.column_ids if cid not in columns]
    if missing:
        raise NotFoundError("برخی از ستون‌های کانبان یافت نشدند.")

    for index, column_id in enumerate(data.column_ids):
        columns[column_id].sort_order = index

    await db.flush()
    return await list_columns(db, project_id)
