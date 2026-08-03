"""Folder, attachment (file) and versioning business logic.

Aligned with the real ORM models (app.models.file):

- Folder: id, name, parent_id (self FK), project_id (nullable), workspace_id
  (TenantMixin). No soft delete -- folders are hard-deleted.
- FileObject: the physical, storage-backed object (storage_key, original_name,
  mime_type, size_bytes, checksum, uploaded_by_id). SoftDeleteMixin.
- FileVersion: file_id, version_number, storage_key, size_bytes, uploaded_by_id,
  checksum.
- Attachment: the frontend-facing record (mirrors `Attachment` in
  lib/types/index.ts): file_id (nullable FK to FileObject), name, mime_type,
  size_bytes, url, folder_id, project_id, task_id, uploaded_by_id, workspace_id,
  version (VersionMixin), deleted_at (SoftDeleteMixin -> frontend `deletedAt`).

`AttachmentOut.size` maps to `Attachment.size_bytes` -- handled explicitly
below since Pydantic's `from_attributes` matches by Python attribute name, not
by the camelCase JSON alias.
"""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.files.storage import get_storage
from app.models.file import Attachment, FileObject, FileVersion, Folder
from app.models.task import Task
from app.schemas.file import (
    AttachmentOut,
    AttachmentUpdate,
    FileVersionOut,
    FolderCreate,
    FolderOut,
    FolderUpdate,
)


def _to_attachment_out(attachment: Attachment) -> AttachmentOut:
    return AttachmentOut(
        id=attachment.id,
        name=attachment.name,
        mime_type=attachment.mime_type,
        size=attachment.size_bytes,
        url=attachment.url,
        folder_id=attachment.folder_id,
        project_id=attachment.project_id,
        task_id=attachment.task_id,
        workspace_id=attachment.workspace_id,
        uploaded_by_id=attachment.uploaded_by_id,
        version=attachment.version,
        created_at=attachment.created_at,
        deleted_at=attachment.deleted_at,
    )


def _to_version_out(version: FileVersion) -> FileVersionOut:
    return FileVersionOut(
        id=version.id,
        file_id=version.file_id,
        version_number=version.version_number,
        size=version.size_bytes,
        uploaded_by_id=version.uploaded_by_id,
        checksum=version.checksum,
        created_at=version.created_at,
    )


async def list_workspace_files(db: AsyncSession, workspace_id: UUID) -> list[AttachmentOut]:
    stmt = (
        select(Attachment)
        .where(Attachment.workspace_id == workspace_id, Attachment.deleted_at.is_(None))
        .order_by(Attachment.created_at.desc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_attachment_out(a) for a in rows]


async def list_project_files(db: AsyncSession, project_id: UUID) -> list[AttachmentOut]:
    stmt = (
        select(Attachment)
        .where(Attachment.project_id == project_id, Attachment.deleted_at.is_(None))
        .order_by(Attachment.created_at.desc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_attachment_out(a) for a in rows]


async def list_task_files(db: AsyncSession, task_id: UUID) -> list[AttachmentOut]:
    stmt = (
        select(Attachment)
        .where(Attachment.task_id == task_id, Attachment.deleted_at.is_(None))
        .order_by(Attachment.created_at.desc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_attachment_out(a) for a in rows]


async def list_deleted_files(db: AsyncSession, workspace_id: UUID) -> list[AttachmentOut]:
    stmt = (
        select(Attachment)
        .where(Attachment.workspace_id == workspace_id, Attachment.deleted_at.is_not(None))
        .order_by(Attachment.deleted_at.desc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_attachment_out(a) for a in rows]


async def get_file(db: AsyncSession, file_id: UUID) -> AttachmentOut:
    attachment = await db.get(Attachment, file_id)
    if attachment is None:
        raise NotFoundError("فایل یافت نشد.")
    return _to_attachment_out(attachment)


async def read_file_bytes(db: AsyncSession, file_id: UUID) -> tuple[bytes, str, str]:
    """Return (content, filename, mime_type) for download."""
    attachment = await db.get(Attachment, file_id)
    if attachment is None or attachment.deleted_at is not None:
        raise NotFoundError("فایل یافت نشد.")
    if attachment.file_id is None:
        raise NotFoundError("محتوای فایل یافت نشد.")
    file_obj = await db.get(FileObject, attachment.file_id)
    if file_obj is None:
        raise NotFoundError("محتوای فایل یافت نشد.")
    storage = get_storage()
    data = await storage.read(file_obj.storage_key)
    return data, attachment.name, attachment.mime_type


async def update_file(db: AsyncSession, file_id: UUID, data: AttachmentUpdate) -> AttachmentOut:
    attachment = await db.get(Attachment, file_id)
    if attachment is None:
        raise NotFoundError("فایل یافت نشد.")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(attachment, field, value)
    await db.flush()
    return _to_attachment_out(attachment)


async def soft_delete_file(db: AsyncSession, file_id: UUID) -> AttachmentOut:
    attachment = await db.get(Attachment, file_id)
    if attachment is None:
        raise NotFoundError("فایل یافت نشد.")
    attachment.deleted_at = datetime.now(UTC)
    if attachment.task_id:
        task = await db.get(Task, attachment.task_id)
        if task is not None and task.attachment_count:
            task.attachment_count = max(0, task.attachment_count - 1)
    await db.flush()
    return _to_attachment_out(attachment)


async def restore_file(db: AsyncSession, file_id: UUID) -> AttachmentOut:
    attachment = await db.get(Attachment, file_id)
    if attachment is None:
        raise NotFoundError("فایل یافت نشد.")
    attachment.deleted_at = None
    if attachment.task_id:
        task = await db.get(Task, attachment.task_id)
        if task is not None:
            task.attachment_count = (task.attachment_count or 0) + 1
    await db.flush()
    return _to_attachment_out(attachment)


async def permanent_delete_file(db: AsyncSession, file_id: UUID) -> None:
    attachment = await db.get(Attachment, file_id)
    if attachment is None:
        raise NotFoundError("فایل یافت نشد.")
    if attachment.deleted_at is None:
        raise ConflictError("فایل باید ابتدا حذف موقت شود.")

    storage = get_storage()
    if attachment.file_id is not None:
        file_obj = await db.get(FileObject, attachment.file_id)
        if file_obj is not None:
            try:
                await storage.delete(file_obj.storage_key)
            except Exception:
                pass
            await db.delete(file_obj)
    await db.delete(attachment)


async def upload_file(
    db: AsyncSession,
    *,
    workspace_id: UUID,
    uploaded_by_id: UUID,
    filename: str,
    content_type: str | None,
    data: bytes,
    project_id: UUID | None = None,
    task_id: UUID | None = None,
    folder_id: UUID | None = None,
) -> AttachmentOut:
    storage = get_storage()
    key = storage.build_key(str(workspace_id), filename)
    await storage.save(key, data, content_type=content_type)
    checksum = hashlib.sha256(data).hexdigest()
    mime_type = content_type or "application/octet-stream"

    file_obj = FileObject(
        workspace_id=workspace_id,
        storage_key=key,
        original_name=filename,
        mime_type=mime_type,
        size_bytes=len(data),
        checksum=checksum,
        uploaded_by_id=uploaded_by_id,
    )
    db.add(file_obj)
    await db.flush()

    db.add(
        FileVersion(
            file_id=file_obj.id,
            version_number=1,
            storage_key=key,
            size_bytes=len(data),
            uploaded_by_id=uploaded_by_id,
            checksum=checksum,
        )
    )

    attachment = Attachment(
        file_id=file_obj.id,
        name=filename,
        mime_type=mime_type,
        size_bytes=len(data),
        url=storage.url(key),
        folder_id=folder_id,
        project_id=project_id,
        task_id=task_id,
        uploaded_by_id=uploaded_by_id,
        workspace_id=workspace_id,
        version=1,
    )
    db.add(attachment)

    if task_id:
        task = await db.get(Task, task_id)
        if task is not None:
            task.attachment_count = (task.attachment_count or 0) + 1

    await db.flush()
    return _to_attachment_out(attachment)


async def upload_new_version(
    db: AsyncSession,
    *,
    file_id: UUID,
    uploaded_by_id: UUID,
    content_type: str | None,
    data: bytes,
) -> AttachmentOut:
    attachment = await db.get(Attachment, file_id)
    if attachment is None or attachment.file_id is None:
        raise NotFoundError("فایل یافت نشد.")

    file_obj = await db.get(FileObject, attachment.file_id)
    if file_obj is None:
        raise NotFoundError("فایل یافت نشد.")

    storage = get_storage()
    key = storage.build_key(str(attachment.workspace_id), attachment.name)
    await storage.save(key, data, content_type=content_type)
    checksum = hashlib.sha256(data).hexdigest()

    count_stmt = select(FileVersion.id).where(FileVersion.file_id == file_obj.id)
    next_version = len((await db.execute(count_stmt)).scalars().all()) + 1

    db.add(
        FileVersion(
            file_id=file_obj.id,
            version_number=next_version,
            storage_key=key,
            size_bytes=len(data),
            uploaded_by_id=uploaded_by_id,
            checksum=checksum,
        )
    )

    file_obj.storage_key = key
    file_obj.size_bytes = len(data)
    file_obj.checksum = checksum
    if content_type:
        file_obj.mime_type = content_type

    attachment.size_bytes = len(data)
    attachment.url = storage.url(key)
    attachment.version = next_version
    if content_type:
        attachment.mime_type = content_type

    await db.flush()
    return _to_attachment_out(attachment)


async def list_versions(db: AsyncSession, file_id: UUID) -> list[FileVersionOut]:
    attachment = await db.get(Attachment, file_id)
    if attachment is None or attachment.file_id is None:
        raise NotFoundError("فایل یافت نشد.")
    stmt = (
        select(FileVersion)
        .where(FileVersion.file_id == attachment.file_id)
        .order_by(FileVersion.version_number.desc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_version_out(v) for v in rows]


async def list_folders(db: AsyncSession, workspace_id: UUID, project_id: UUID | None = None) -> list[FolderOut]:
    stmt = select(Folder).where(Folder.workspace_id == workspace_id)
    if project_id is not None:
        stmt = stmt.where(Folder.project_id == project_id)
    stmt = stmt.order_by(Folder.name.asc())
    rows = (await db.execute(stmt)).scalars().all()
    return [FolderOut.model_validate(f) for f in rows]


async def create_folder(db: AsyncSession, workspace_id: UUID, data: FolderCreate) -> FolderOut:
    folder = Folder(
        workspace_id=workspace_id,
        name=data.name.strip(),
        parent_id=data.parent_id,
        project_id=data.project_id,
    )
    db.add(folder)
    await db.flush()
    return FolderOut.model_validate(folder)


async def update_folder(db: AsyncSession, workspace_id: UUID, folder_id: UUID, data: FolderUpdate) -> FolderOut:
    folder = await db.get(Folder, folder_id)
    if folder is None or folder.workspace_id != workspace_id:
        raise NotFoundError("پوشه یافت نشد.")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(folder, field, value)
    await db.flush()
    return FolderOut.model_validate(folder)


async def delete_folder(db: AsyncSession, workspace_id: UUID, folder_id: UUID) -> None:
    folder = await db.get(Folder, folder_id)
    if folder is None or folder.workspace_id != workspace_id:
        raise NotFoundError("پوشه یافت نشد.")
    await db.delete(folder)
