"""Task, comment, label, checklist and dependency business logic.

Aligned with the real ORM models (app.models.task):

- Task: id, project_id, workspace_id (TenantMixin), key, title, description,
  status, priority, assignee_id, reporter_id, start_date, due_date,
  estimate_hours, actual_hours (Numeric -> exposed as float), story_points,
  progress, column_id, sort_order (frontend `order`), parent_id,
  attachment_count, comment_count, is_recurring, created_at, updated_at.
- Label: id, workspace_id, name, color. TaskLabelLink(task_id, label_id) is
  the many-to-many join.
- TaskDependency: task_id is blocked by depends_on_task_id (frontend:
  `blockedByIds` = depends_on_task_id values for this task; `blockingIds` =
  task_id values that depend on this task).
- TaskChecklist(task_id, title, sort_order) groups TaskChecklistItem rows
  (checklist_id, title, is_completed, assignee_id, due_date, sort_order).
  The frontend models a task's checklist as a *flat* list, so we transparently
  maintain a single default `TaskChecklist` container per task and expose its
  items as `Task.checklist`.
- TaskComment: task_id, author_id, body, mentions, parent_id, deleted_at
  (SoftDeleteMixin). There is currently no generic/polymorphic comment model,
  so only task comments are supported (`entityType` is always "task").
"""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.models.project import Project
from app.models.task import (
    Label,
    Task,
    TaskChecklist,
    TaskChecklistItem,
    TaskComment,
    TaskDependency,
    TaskLabelLink,
)
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
    TaskOut,
    TaskUpdate,
)

_DONE_LIKE_STATUSES = {"done", "cancelled"}
_DEFAULT_CHECKLIST_TITLE = "چک‌لیست"


def _as_float(value: Decimal | float | None) -> float | None:
    return float(value) if value is not None else None


async def _label_ids(db: AsyncSession, task_id: UUID) -> list[UUID]:
    stmt = select(TaskLabelLink.label_id).where(TaskLabelLink.task_id == task_id)
    return list((await db.execute(stmt)).scalars().all())


async def _blocked_by_ids(db: AsyncSession, task_id: UUID) -> list[UUID]:
    stmt = select(TaskDependency.depends_on_task_id).where(TaskDependency.task_id == task_id)
    return list((await db.execute(stmt)).scalars().all())


async def _blocking_ids(db: AsyncSession, task_id: UUID) -> list[UUID]:
    stmt = select(TaskDependency.task_id).where(TaskDependency.depends_on_task_id == task_id)
    return list((await db.execute(stmt)).scalars().all())


def _checklist_item_out(item: TaskChecklistItem) -> ChecklistItemOut:
    return ChecklistItemOut(
        id=item.id,
        title=item.title,
        completed=item.is_completed,
        assignee_id=item.assignee_id,
        due_date=item.due_date,
    )


async def _get_default_checklist(db: AsyncSession, task_id: UUID) -> TaskChecklist | None:
    stmt = select(TaskChecklist).where(TaskChecklist.task_id == task_id).order_by(TaskChecklist.sort_order.asc())
    return (await db.execute(stmt)).scalars().first()


async def _get_or_create_default_checklist(db: AsyncSession, task_id: UUID) -> TaskChecklist:
    checklist = await _get_default_checklist(db, task_id)
    if checklist is None:
        checklist = TaskChecklist(task_id=task_id, title=_DEFAULT_CHECKLIST_TITLE, sort_order=0)
        db.add(checklist)
        await db.flush()
    return checklist


async def _checklist(db: AsyncSession, task_id: UUID) -> list[ChecklistItemOut]:
    checklist = await _get_default_checklist(db, task_id)
    if checklist is None:
        return []
    stmt = (
        select(TaskChecklistItem)
        .where(TaskChecklistItem.checklist_id == checklist.id)
        .order_by(TaskChecklistItem.sort_order.asc())
    )
    items = (await db.execute(stmt)).scalars().all()
    return [_checklist_item_out(i) for i in items]


def _comment_out(comment: TaskComment) -> CommentOut:
    return CommentOut(
        id=comment.id,
        entity_type="task",
        entity_id=comment.task_id,
        author_id=comment.author_id,
        body=comment.body,
        mentions=comment.mentions,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        parent_id=comment.parent_id,
    )


async def _to_task_out(db: AsyncSession, task: Task) -> TaskOut:
    label_ids = await _label_ids(db, task.id)
    blocked_by_ids = await _blocked_by_ids(db, task.id)
    blocking_ids = await _blocking_ids(db, task.id)
    checklist = await _checklist(db, task.id)

    return TaskOut(
        id=task.id,
        project_id=task.project_id,
        workspace_id=task.workspace_id,
        key=task.key,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        assignee_id=task.assignee_id,
        reporter_id=task.reporter_id,
        label_ids=label_ids,
        start_date=task.start_date,
        due_date=task.due_date,
        estimate_hours=_as_float(task.estimate_hours),
        actual_hours=_as_float(task.actual_hours),
        story_points=task.story_points,
        progress=task.progress,
        column_id=task.column_id,
        order=task.sort_order,
        parent_id=task.parent_id,
        blocked_by_ids=blocked_by_ids,
        blocking_ids=blocking_ids,
        checklist=checklist,
        attachment_count=task.attachment_count,
        comment_count=task.comment_count,
        is_recurring=task.is_recurring,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


def _validate_dates(start_date, due_date) -> None:
    if start_date and due_date and due_date < start_date:
        raise ConflictError("تاریخ سررسید نمی‌تواند قبل از تاریخ شروع باشد.")


async def _generate_task_key(db: AsyncSession, project_id: UUID) -> str:
    project = await db.get(Project, project_id)
    if project is None:
        raise NotFoundError("پروژه یافت نشد.")
    stmt = select(Task.id).where(Task.project_id == project_id)
    count = len((await db.execute(stmt)).scalars().all())
    return f"{project.key}-{count + 1}"


async def _recompute_blocked_status(db: AsyncSession, task: Task) -> None:
    """Auto-flip a task in/out of `blocked` based on unresolved dependencies."""
    if task.status in _DONE_LIKE_STATUSES:
        return

    blocked_by_ids = await _blocked_by_ids(db, task.id)
    has_unresolved_blocker = False
    if blocked_by_ids:
        stmt = select(Task.id).where(Task.id.in_(blocked_by_ids), Task.status.notin_(_DONE_LIKE_STATUSES))
        has_unresolved_blocker = len((await db.execute(stmt)).scalars().all()) > 0

    if has_unresolved_blocker and task.status != "blocked":
        task.status = "blocked"
    elif not has_unresolved_blocker and task.status == "blocked":
        task.status = "todo"


async def list_by_project(
    db: AsyncSession,
    project_id: UUID,
    *,
    status: str | None = None,
    priority: str | None = None,
    assignee_id: UUID | None = None,
) -> list[TaskOut]:
    stmt = select(Task).where(Task.project_id == project_id)
    if status:
        stmt = stmt.where(Task.status == status)
    if priority:
        stmt = stmt.where(Task.priority == priority)
    if assignee_id:
        stmt = stmt.where(Task.assignee_id == assignee_id)
    stmt = stmt.order_by(Task.sort_order.asc())
    tasks = (await db.execute(stmt)).scalars().all()
    return [await _to_task_out(db, t) for t in tasks]


async def list_by_workspace(
    db: AsyncSession,
    workspace_id: UUID,
    *,
    status: str | None = None,
    priority: str | None = None,
    assignee_id: UUID | None = None,
) -> list[TaskOut]:
    stmt = select(Task).where(Task.workspace_id == workspace_id)
    if status:
        stmt = stmt.where(Task.status == status)
    if priority:
        stmt = stmt.where(Task.priority == priority)
    if assignee_id:
        stmt = stmt.where(Task.assignee_id == assignee_id)
    stmt = stmt.order_by(Task.created_at.desc())
    tasks = (await db.execute(stmt)).scalars().all()
    return [await _to_task_out(db, t) for t in tasks]


async def get_task(db: AsyncSession, task_id: UUID) -> TaskOut:
    task = await db.get(Task, task_id)
    if task is None:
        raise NotFoundError("وظیفه یافت نشد.")
    return await _to_task_out(db, task)


async def create_task(db: AsyncSession, workspace_id: UUID, reporter_id: UUID, data: TaskCreate) -> TaskOut:
    _validate_dates(data.start_date, data.due_date)
    key = await _generate_task_key(db, data.project_id)

    max_order_stmt = (
        select(Task.sort_order).where(Task.project_id == data.project_id).order_by(Task.sort_order.desc()).limit(1)
    )
    max_order = (await db.execute(max_order_stmt)).scalar_one_or_none()

    task = Task(
        project_id=data.project_id,
        workspace_id=workspace_id,
        key=key,
        title=data.title.strip(),
        description=data.description,
        status=data.status,
        priority=data.priority,
        assignee_id=data.assignee_id,
        reporter_id=reporter_id,
        start_date=data.start_date,
        due_date=data.due_date,
        estimate_hours=data.estimate_hours,
        story_points=data.story_points,
        progress=0,
        column_id=data.column_id,
        sort_order=(max_order or 0) + 1,
        parent_id=data.parent_id,
        attachment_count=0,
        comment_count=0,
        is_recurring=data.is_recurring,
    )
    db.add(task)
    await db.flush()

    for label_id in data.label_ids:
        db.add(TaskLabelLink(task_id=task.id, label_id=label_id))

    project = await db.get(Project, data.project_id)
    if project is not None:
        project.task_count = (project.task_count or 0) + 1

    await db.flush()
    return await _to_task_out(db, task)


async def update_task(db: AsyncSession, task_id: UUID, data: TaskUpdate) -> TaskOut:
    task = await db.get(Task, task_id)
    if task is None:
        raise NotFoundError("وظیفه یافت نشد.")

    updates = data.model_dump(exclude_unset=True, exclude={"label_ids", "order"})
    start_date = updates.get("start_date", task.start_date)
    due_date = updates.get("due_date", task.due_date)
    _validate_dates(start_date, due_date)

    was_done = task.status == "done"
    new_status = updates.get("status", task.status)

    if new_status == "done" and task.status != "done":
        blocked_by_ids = await _blocked_by_ids(db, task.id)
        if blocked_by_ids:
            blockers_stmt = select(Task.id).where(
                Task.id.in_(blocked_by_ids), Task.status.notin_(_DONE_LIKE_STATUSES)
            )
            if (await db.execute(blockers_stmt)).scalar_one_or_none() is not None:
                raise ConflictError(
                    "این وظیفه به دلیل وابستگی به وظایف تکمیل‌نشده قابل بستن نیست.",
                    code="TASK_BLOCKED",
                )

    for field, value in updates.items():
        setattr(task, field, value)
    if data.order is not None:
        task.sort_order = data.order
    task.updated_at = datetime.now(UTC)

    if data.label_ids is not None:
        existing_stmt = select(TaskLabelLink).where(TaskLabelLink.task_id == task_id)
        for row in (await db.execute(existing_stmt)).scalars().all():
            await db.delete(row)
        await db.flush()
        for label_id in data.label_ids:
            db.add(TaskLabelLink(task_id=task_id, label_id=label_id))

    await _recompute_blocked_status(db, task)

    is_done_now = task.status == "done"
    if is_done_now != was_done:
        project = await db.get(Project, task.project_id)
        if project is not None:
            delta = 1 if is_done_now else -1
            project.completed_task_count = max(0, (project.completed_task_count or 0) + delta)

    await db.flush()
    return await _to_task_out(db, task)


async def delete_task(db: AsyncSession, task_id: UUID) -> None:
    task = await db.get(Task, task_id)
    if task is None:
        raise NotFoundError("وظیفه یافت نشد.")

    project = await db.get(Project, task.project_id)
    if project is not None:
        project.task_count = max(0, (project.task_count or 0) - 1)
        if task.status == "done":
            project.completed_task_count = max(0, (project.completed_task_count or 0) - 1)

    await db.delete(task)


async def update_dependencies(db: AsyncSession, task_id: UUID, blocked_by_ids: list[UUID]) -> TaskOut:
    task = await db.get(Task, task_id)
    if task is None:
        raise NotFoundError("وظیفه یافت نشد.")
    if task_id in blocked_by_ids:
        raise ConflictError("یک وظیفه نمی‌تواند به خودش وابسته باشد.")

    existing_stmt = select(TaskDependency).where(TaskDependency.task_id == task_id)
    for row in (await db.execute(existing_stmt)).scalars().all():
        await db.delete(row)
    await db.flush()

    for blocker_id in blocked_by_ids:
        db.add(TaskDependency(task_id=task_id, depends_on_task_id=blocker_id))
    await db.flush()

    await _recompute_blocked_status(db, task)
    await db.flush()
    return await _to_task_out(db, task)


async def list_task_comments(db: AsyncSession, task_id: UUID) -> list[CommentOut]:
    stmt = (
        select(TaskComment)
        .where(TaskComment.task_id == task_id, TaskComment.deleted_at.is_(None))
        .order_by(TaskComment.created_at.asc())
    )
    comments = (await db.execute(stmt)).scalars().all()
    return [_comment_out(c) for c in comments]


async def create_task_comment(
    db: AsyncSession, task_id: UUID, author_id: UUID, data: CommentCreate
) -> CommentOut:
    task = await db.get(Task, task_id)
    if task is None:
        raise NotFoundError("وظیفه یافت نشد.")

    comment = TaskComment(
        task_id=task_id,
        author_id=author_id,
        body=data.body,
        mentions=data.mentions,
        parent_id=data.parent_id,
    )
    db.add(comment)
    task.comment_count = (task.comment_count or 0) + 1
    await db.flush()
    return _comment_out(comment)


async def update_comment(db: AsyncSession, comment_id: UUID, author_id: UUID, data: CommentUpdate) -> CommentOut:
    comment = await db.get(TaskComment, comment_id)
    if comment is None or comment.deleted_at is not None:
        raise NotFoundError("نظر یافت نشد.")
    if comment.author_id != author_id:
        raise ConflictError("فقط نویسنده می‌تواند نظر را ویرایش کند.", code="COMMENT_NOT_OWNER")

    comment.body = data.body
    if data.mentions is not None:
        comment.mentions = data.mentions
    comment.updated_at = datetime.now(UTC)
    await db.flush()
    return _comment_out(comment)


async def delete_comment(db: AsyncSession, comment_id: UUID, author_id: UUID) -> None:
    comment = await db.get(TaskComment, comment_id)
    if comment is None or comment.deleted_at is not None:
        raise NotFoundError("نظر یافت نشد.")
    if comment.author_id != author_id:
        raise ConflictError("فقط نویسنده می‌تواند نظر را حذف کند.", code="COMMENT_NOT_OWNER")

    comment.deleted_at = datetime.now(UTC)
    task = await db.get(Task, comment.task_id)
    if task is not None and task.comment_count:
        task.comment_count = max(0, task.comment_count - 1)


async def list_labels(db: AsyncSession, workspace_id: UUID) -> list[LabelOut]:
    stmt = select(Label).where(Label.workspace_id == workspace_id).order_by(Label.name.asc())
    labels = (await db.execute(stmt)).scalars().all()
    return [LabelOut.model_validate(label) for label in labels]


async def create_label(db: AsyncSession, workspace_id: UUID, data: LabelCreate) -> LabelOut:
    label = Label(workspace_id=workspace_id, name=data.name, color=data.color)
    db.add(label)
    await db.flush()
    return LabelOut.model_validate(label)


async def update_label(db: AsyncSession, workspace_id: UUID, label_id: UUID, data: LabelUpdate) -> LabelOut:
    label = await db.get(Label, label_id)
    if label is None or label.workspace_id != workspace_id:
        raise NotFoundError("برچسب یافت نشد.")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(label, field, value)
    await db.flush()
    return LabelOut.model_validate(label)


async def delete_label(db: AsyncSession, workspace_id: UUID, label_id: UUID) -> None:
    label = await db.get(Label, label_id)
    if label is None or label.workspace_id != workspace_id:
        raise NotFoundError("برچسب یافت نشد.")
    await db.delete(label)


async def add_checklist_item(db: AsyncSession, task_id: UUID, data: ChecklistItemCreate) -> ChecklistItemOut:
    task = await db.get(Task, task_id)
    if task is None:
        raise NotFoundError("وظیفه یافت نشد.")

    checklist = await _get_or_create_default_checklist(db, task_id)
    count_stmt = select(TaskChecklistItem.id).where(TaskChecklistItem.checklist_id == checklist.id)
    order = len((await db.execute(count_stmt)).scalars().all())

    item = TaskChecklistItem(
        checklist_id=checklist.id,
        title=data.title,
        is_completed=False,
        assignee_id=data.assignee_id,
        due_date=data.due_date,
        sort_order=order,
    )
    db.add(item)
    await db.flush()
    return _checklist_item_out(item)


async def update_checklist_item(
    db: AsyncSession, task_id: UUID, item_id: UUID, data: ChecklistItemUpdate
) -> ChecklistItemOut:
    checklist = await _get_default_checklist(db, task_id)
    item = await db.get(TaskChecklistItem, item_id)
    if item is None or checklist is None or item.checklist_id != checklist.id:
        raise NotFoundError("آیتم چک‌لیست یافت نشد.")

    updates = data.model_dump(exclude_unset=True)
    if "completed" in updates:
        item.is_completed = updates.pop("completed")
    for field, value in updates.items():
        setattr(item, field, value)

    await db.flush()
    return _checklist_item_out(item)


async def delete_checklist_item(db: AsyncSession, task_id: UUID, item_id: UUID) -> None:
    checklist = await _get_default_checklist(db, task_id)
    item = await db.get(TaskChecklistItem, item_id)
    if item is None or checklist is None or item.checklist_id != checklist.id:
        raise NotFoundError("آیتم چک‌لیست یافت نشد.")
    await db.delete(item)


async def bulk_update(db: AsyncSession, data: BulkUpdateRequest) -> list[TaskOut]:
    stmt = select(Task).where(Task.id.in_(data.task_ids))
    tasks = (await db.execute(stmt)).scalars().all()
    found_ids = {t.id for t in tasks}
    missing = set(data.task_ids) - found_ids
    if missing:
        raise NotFoundError("برخی از وظایف انتخاب‌شده یافت نشدند.")

    if data.delete:
        for task in tasks:
            await delete_task(db, task.id)
        return []

    results: list[TaskOut] = []
    for task in tasks:
        if data.status is not None:
            task.status = data.status
        if data.priority is not None:
            task.priority = data.priority
        if data.assignee_id is not None:
            task.assignee_id = data.assignee_id
        if data.column_id is not None:
            task.column_id = data.column_id

        if data.add_label_ids or data.remove_label_ids:
            current = set(await _label_ids(db, task.id))
            current |= set(data.add_label_ids)
            current -= set(data.remove_label_ids)
            existing_stmt = select(TaskLabelLink).where(TaskLabelLink.task_id == task.id)
            for row in (await db.execute(existing_stmt)).scalars().all():
                await db.delete(row)
            await db.flush()
            for label_id in current:
                db.add(TaskLabelLink(task_id=task.id, label_id=label_id))

        task.updated_at = datetime.now(UTC)
        await _recompute_blocked_status(db, task)
        results.append(await _to_task_out(db, task))

    return results
