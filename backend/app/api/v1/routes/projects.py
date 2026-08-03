"""Project, project-category and (workspace-scoped) project listing endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, PermissionDeniedError
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.workspace import get_workspace_membership, require_permission
from app.models.project import Project
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.permissions.rbac import PERM_PROJECTS_CREATE, PERM_PROJECTS_MANAGE, has_permission
from app.schemas.common import MessageResponse
from app.schemas.project import (
    ProjectCategoryCreate,
    ProjectCategoryOut,
    ProjectCategoryUpdate,
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
)
from app.services import project_service
from app.services.project_service import ProjectScope

router = APIRouter(tags=["projects"])


def require_project_permission(permission_key: str | None):
    """Dependency factory resolving `project_id` -> `Project`, gated on the
    caller's workspace-role permission (or plain membership if `permission_key`
    is `None`)."""

    async def _checker(
        project_id: UUID,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> Project:
        project = await db.get(Project, project_id)
        if project is None:
            raise NotFoundError("پروژه یافت نشد.")

        stmt = select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == project.workspace_id, WorkspaceMember.user_id == current_user.id
        )
        membership = (await db.execute(stmt)).scalar_one_or_none()
        if membership is None:
            raise NotFoundError("پروژه یافت نشد.")
        if permission_key and not has_permission(membership.role, permission_key):
            raise PermissionDeniedError("شما اجازه انجام این عملیات را ندارید.")
        return project

    return _checker


@router.get("/workspaces/{workspace_id}/projects", response_model=list[ProjectOut])
async def list_projects(
    workspace_id: UUID,
    scope: ProjectScope = Query(default="active"),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> list[ProjectOut]:
    return await project_service.list_projects(db, workspace_id, scope)


@router.post("/workspaces/{workspace_id}/projects", response_model=ProjectOut)
async def create_project(
    workspace_id: UUID,
    data: ProjectCreate,
    membership: WorkspaceMember = Depends(require_permission(PERM_PROJECTS_CREATE)),
    db: AsyncSession = Depends(get_db),
) -> ProjectOut:
    return await project_service.create_project(db, workspace_id, membership.user_id, data)


@router.get("/projects/{project_id}", response_model=ProjectOut)
async def get_project(project: Project = Depends(require_project_permission(None)), db: AsyncSession = Depends(get_db)) -> ProjectOut:
    return await project_service.get_project(db, project.id)


@router.patch("/projects/{project_id}", response_model=ProjectOut)
async def update_project(
    data: ProjectUpdate,
    project: Project = Depends(require_project_permission(PERM_PROJECTS_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> ProjectOut:
    return await project_service.update_project(db, project.id, data)


@router.post("/projects/{project_id}/archive", response_model=ProjectOut)
async def archive_project(
    project: Project = Depends(require_project_permission(PERM_PROJECTS_MANAGE)), db: AsyncSession = Depends(get_db)
) -> ProjectOut:
    return await project_service.archive_project(db, project.id)


@router.post("/projects/{project_id}/restore", response_model=ProjectOut)
async def restore_project(
    project: Project = Depends(require_project_permission(PERM_PROJECTS_MANAGE)), db: AsyncSession = Depends(get_db)
) -> ProjectOut:
    return await project_service.restore_project(db, project.id)


@router.delete("/projects/{project_id}", response_model=ProjectOut)
async def soft_delete_project(
    project: Project = Depends(require_project_permission(PERM_PROJECTS_MANAGE)), db: AsyncSession = Depends(get_db)
) -> ProjectOut:
    return await project_service.soft_delete_project(db, project.id)


@router.delete("/projects/{project_id}/permanent", response_model=MessageResponse)
async def permanent_delete_project(
    project: Project = Depends(require_project_permission(PERM_PROJECTS_MANAGE)), db: AsyncSession = Depends(get_db)
) -> MessageResponse:
    await project_service.permanent_delete_project(db, project.id)
    return MessageResponse(message="پروژه برای همیشه حذف شد.")


@router.get("/workspaces/{workspace_id}/project-categories", response_model=list[ProjectCategoryOut])
async def list_categories(
    workspace_id: UUID,
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> list[ProjectCategoryOut]:
    return await project_service.list_categories(db, workspace_id)


@router.post("/workspaces/{workspace_id}/project-categories", response_model=ProjectCategoryOut)
async def create_category(
    workspace_id: UUID,
    data: ProjectCategoryCreate,
    membership: WorkspaceMember = Depends(require_permission(PERM_PROJECTS_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> ProjectCategoryOut:
    return await project_service.create_category(db, workspace_id, data)


@router.patch("/workspaces/{workspace_id}/project-categories/{category_id}", response_model=ProjectCategoryOut)
async def update_category(
    workspace_id: UUID,
    category_id: UUID,
    data: ProjectCategoryUpdate,
    membership: WorkspaceMember = Depends(require_permission(PERM_PROJECTS_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> ProjectCategoryOut:
    return await project_service.update_category(db, workspace_id, category_id, data)


@router.delete("/workspaces/{workspace_id}/project-categories/{category_id}", response_model=MessageResponse)
async def delete_category(
    workspace_id: UUID,
    category_id: UUID,
    membership: WorkspaceMember = Depends(require_permission(PERM_PROJECTS_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await project_service.delete_category(db, workspace_id, category_id)
    return MessageResponse(message="دسته‌بندی حذف شد.")
