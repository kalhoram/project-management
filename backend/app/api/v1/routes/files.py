"""File (attachment), folder and versioning endpoints."""

from __future__ import annotations

import io
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.routes.projects import require_project_permission
from app.api.v1.routes.tasks import require_task_permission
from app.core.config import get_settings
from app.core.exceptions import AppError, NotFoundError, PermissionDeniedError
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.workspace import get_workspace_membership, require_permission
from app.models.file import Attachment
from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.permissions.rbac import PERM_FILES_UPLOAD, has_permission
from app.schemas.common import MessageResponse
from app.schemas.file import (
    AttachmentOut,
    AttachmentUpdate,
    FileVersionOut,
    FolderCreate,
    FolderOut,
    FolderUpdate,
)
from app.services import file_service

router = APIRouter(tags=["files"])


def require_file_permission(permission_key: str | None):
    async def _checker(
        file_id: UUID,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> Attachment:
        attachment = await db.get(Attachment, file_id)
        if attachment is None:
            raise NotFoundError("فایل یافت نشد.")
        from sqlalchemy import select

        stmt = select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == attachment.workspace_id, WorkspaceMember.user_id == current_user.id
        )
        membership = (await db.execute(stmt)).scalar_one_or_none()
        if membership is None:
            raise NotFoundError("فایل یافت نشد.")
        if permission_key and not has_permission(membership.role, permission_key):
            raise PermissionDeniedError("شما اجازه انجام این عملیات را ندارید.")
        return attachment

    return _checker


@router.get("/workspaces/{workspace_id}/files", response_model=list[AttachmentOut])
async def list_workspace_files(
    workspace_id: UUID,
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> list[AttachmentOut]:
    return await file_service.list_workspace_files(db, workspace_id)


@router.get("/workspaces/{workspace_id}/files/deleted", response_model=list[AttachmentOut])
async def list_deleted_files(
    workspace_id: UUID,
    membership: WorkspaceMember = Depends(require_permission(PERM_FILES_UPLOAD)),
    db: AsyncSession = Depends(get_db),
) -> list[AttachmentOut]:
    return await file_service.list_deleted_files(db, workspace_id)


@router.get("/projects/{project_id}/files", response_model=list[AttachmentOut])
async def list_project_files(
    project: Project = Depends(require_project_permission(None)), db: AsyncSession = Depends(get_db)
) -> list[AttachmentOut]:
    return await file_service.list_project_files(db, project.id)


@router.get("/tasks/{task_id}/files", response_model=list[AttachmentOut])
async def list_task_files(
    task: Task = Depends(require_task_permission(None)), db: AsyncSession = Depends(get_db)
) -> list[AttachmentOut]:
    return await file_service.list_task_files(db, task.id)


@router.get("/workspaces/{workspace_id}/folders", response_model=list[FolderOut])
async def list_folders(
    workspace_id: UUID,
    project_id: UUID | None = None,
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> list[FolderOut]:
    return await file_service.list_folders(db, workspace_id, project_id)


@router.post("/workspaces/{workspace_id}/folders", response_model=FolderOut)
async def create_folder(
    workspace_id: UUID,
    data: FolderCreate,
    membership: WorkspaceMember = Depends(require_permission(PERM_FILES_UPLOAD)),
    db: AsyncSession = Depends(get_db),
) -> FolderOut:
    return await file_service.create_folder(db, workspace_id, data)


@router.patch("/workspaces/{workspace_id}/folders/{folder_id}", response_model=FolderOut)
async def update_folder(
    workspace_id: UUID,
    folder_id: UUID,
    data: FolderUpdate,
    membership: WorkspaceMember = Depends(require_permission(PERM_FILES_UPLOAD)),
    db: AsyncSession = Depends(get_db),
) -> FolderOut:
    return await file_service.update_folder(db, workspace_id, folder_id, data)


@router.delete("/workspaces/{workspace_id}/folders/{folder_id}", response_model=MessageResponse)
async def delete_folder(
    workspace_id: UUID,
    folder_id: UUID,
    membership: WorkspaceMember = Depends(require_permission(PERM_FILES_UPLOAD)),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await file_service.delete_folder(db, workspace_id, folder_id)
    return MessageResponse(message="پوشه حذف شد.")


@router.get("/files/{file_id}", response_model=AttachmentOut)
async def get_file(
    attachment: Attachment = Depends(require_file_permission(None)),
    db: AsyncSession = Depends(get_db),
) -> AttachmentOut:
    return await file_service.get_file(db, attachment.id)


@router.get("/files/{file_id}/download")
async def download_file(
    attachment: Attachment = Depends(require_file_permission(None)),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    data, filename, mime_type = await file_service.read_file_bytes(db, attachment.id)
    encoded_name = quote(filename)
    headers = {"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_name}"}
    return StreamingResponse(io.BytesIO(data), media_type=mime_type, headers=headers)


@router.patch("/files/{file_id}", response_model=AttachmentOut)
async def update_file(
    data: AttachmentUpdate,
    attachment: Attachment = Depends(require_file_permission(PERM_FILES_UPLOAD)),
    db: AsyncSession = Depends(get_db),
) -> AttachmentOut:
    return await file_service.update_file(db, attachment.id, data)


@router.post("/files/upload", response_model=AttachmentOut)
async def upload_file(
    workspace_id: UUID = Form(...),
    project_id: UUID | None = Form(default=None),
    task_id: UUID | None = Form(default=None),
    folder_id: UUID | None = Form(default=None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AttachmentOut:
    from sqlalchemy import select

    stmt = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == current_user.id
    )
    membership = (await db.execute(stmt)).scalar_one_or_none()
    if membership is None:
        raise NotFoundError("فضای کاری یافت نشد یا شما عضو آن نیستید.")
    if not has_permission(membership.role, PERM_FILES_UPLOAD):
        raise PermissionDeniedError("شما اجازه بارگذاری فایل را ندارید.")

    settings = get_settings()
    data = await file.read()
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise AppError(
            f"حجم فایل نباید بیشتر از {settings.max_upload_mb} مگابایت باشد.",
            code="FILE_TOO_LARGE",
            status_code=413,
        )

    return await file_service.upload_file(
        db,
        workspace_id=workspace_id,
        uploaded_by_id=current_user.id,
        filename=file.filename or "بدون‌نام",
        content_type=file.content_type,
        data=data,
        project_id=project_id,
        task_id=task_id,
        folder_id=folder_id,
    )


@router.delete("/files/{file_id}", response_model=AttachmentOut)
async def soft_delete_file(
    attachment: Attachment = Depends(require_file_permission(PERM_FILES_UPLOAD)), db: AsyncSession = Depends(get_db)
) -> AttachmentOut:
    return await file_service.soft_delete_file(db, attachment.id)


@router.post("/files/{file_id}/restore", response_model=AttachmentOut)
async def restore_file(
    attachment: Attachment = Depends(require_file_permission(PERM_FILES_UPLOAD)), db: AsyncSession = Depends(get_db)
) -> AttachmentOut:
    return await file_service.restore_file(db, attachment.id)


@router.delete("/files/{file_id}/permanent", response_model=MessageResponse)
async def permanent_delete_file(
    attachment: Attachment = Depends(require_file_permission(PERM_FILES_UPLOAD)), db: AsyncSession = Depends(get_db)
) -> MessageResponse:
    await file_service.permanent_delete_file(db, attachment.id)
    return MessageResponse(message="فایل برای همیشه حذف شد.")


@router.get("/files/{file_id}/versions", response_model=list[FileVersionOut])
async def list_versions(
    attachment: Attachment = Depends(require_file_permission(None)), db: AsyncSession = Depends(get_db)
) -> list[FileVersionOut]:
    return await file_service.list_versions(db, attachment.id)


@router.post("/files/{file_id}/versions", response_model=AttachmentOut)
async def upload_new_version(
    file: UploadFile = File(...),
    attachment: Attachment = Depends(require_file_permission(PERM_FILES_UPLOAD)),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AttachmentOut:
    data = await file.read()
    return await file_service.upload_new_version(
        db, file_id=attachment.id, uploaded_by_id=current_user.id, content_type=file.content_type, data=data
    )
