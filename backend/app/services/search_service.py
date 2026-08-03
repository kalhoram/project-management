"""Workspace-scoped global search across tasks, projects, users, files and comments.

Persian-normalizes both the query and candidate rows (see `app.utils.persian`)
so ی/ي، ک/ك and ZWNJ variants match regardless of how they were typed/stored.
Postgres `ILIKE` narrows the SQL-side candidate set (cheap, indexable-ish via
trigram in production); the normalized comparison is the source of truth and
runs in Python on that candidate set.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.file import Attachment
from app.models.project import Project
from app.models.task import Task, TaskComment
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.schemas.search import GlobalSearchResponse
from app.schemas.user import UserOut
from app.services.file_service import _to_attachment_out
from app.services.project_service import _to_project_out
from app.services.task_service import _comment_out, _to_task_out
from app.utils.persian import contains_normalized, normalize_persian

_CANDIDATE_LIMIT = 40
_RESULT_LIMIT = 15


async def global_search(db: AsyncSession, workspace_id: UUID, query: str) -> GlobalSearchResponse:
    normalized_query = normalize_persian(query)
    if not normalized_query:
        return GlobalSearchResponse()

    like_pattern = f"%{query.strip()}%"

    task_stmt = (
        select(Task)
        .where(Task.workspace_id == workspace_id, (Task.title.ilike(like_pattern) | Task.key.ilike(like_pattern)))
        .limit(_CANDIDATE_LIMIT)
    )
    task_candidates = (await db.execute(task_stmt)).scalars().all()
    tasks = [
        t for t in task_candidates if contains_normalized(t.title, query) or contains_normalized(t.key, query)
    ][:_RESULT_LIMIT]

    project_stmt = (
        select(Project)
        .where(
            Project.workspace_id == workspace_id,
            (Project.name.ilike(like_pattern) | Project.key.ilike(like_pattern)),
        )
        .limit(_CANDIDATE_LIMIT)
    )
    project_candidates = (await db.execute(project_stmt)).scalars().all()
    projects = [
        p for p in project_candidates if contains_normalized(p.name, query) or contains_normalized(p.key, query)
    ][:_RESULT_LIMIT]

    user_stmt = (
        select(User)
        .join(WorkspaceMember, WorkspaceMember.user_id == User.id)
        .where(
            WorkspaceMember.workspace_id == workspace_id,
            (User.name.ilike(like_pattern) | User.email.ilike(like_pattern)),
        )
        .limit(_CANDIDATE_LIMIT)
    )
    user_candidates = (await db.execute(user_stmt)).scalars().all()
    users = [
        u for u in user_candidates if contains_normalized(u.name, query) or contains_normalized(u.email, query)
    ][:_RESULT_LIMIT]

    file_stmt = (
        select(Attachment)
        .where(
            Attachment.workspace_id == workspace_id,
            Attachment.deleted_at.is_(None),
            Attachment.name.ilike(like_pattern),
        )
        .limit(_CANDIDATE_LIMIT)
    )
    file_candidates = (await db.execute(file_stmt)).scalars().all()
    files = [f for f in file_candidates if contains_normalized(f.name, query)][:_RESULT_LIMIT]

    comment_stmt = (
        select(TaskComment)
        .join(Task, Task.id == TaskComment.task_id)
        .where(
            Task.workspace_id == workspace_id,
            TaskComment.deleted_at.is_(None),
            TaskComment.body.ilike(like_pattern),
        )
        .limit(_CANDIDATE_LIMIT)
    )
    comment_candidates = (await db.execute(comment_stmt)).scalars().all()
    comments = [c for c in comment_candidates if contains_normalized(c.body, query)][:_RESULT_LIMIT]

    return GlobalSearchResponse(
        tasks=[await _to_task_out(db, t) for t in tasks],
        projects=[await _to_project_out(db, p) for p in projects],
        users=[UserOut.model_validate(u) for u in users],
        files=[_to_attachment_out(f) for f in files],
        comments=[_comment_out(c) for c in comments],
    )
