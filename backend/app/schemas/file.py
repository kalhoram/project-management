from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.common import CamelModel


class AttachmentOut(CamelModel):
    id: UUID
    name: str
    mime_type: str
    size: int
    url: str
    folder_id: UUID | None = None
    project_id: UUID | None = None
    task_id: UUID | None = None
    workspace_id: UUID
    uploaded_by_id: UUID
    version: int = 1
    created_at: datetime
    deleted_at: datetime | None = None


class AttachmentUpdate(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    folder_id: UUID | None = None


class FolderOut(CamelModel):
    id: UUID
    name: str
    parent_id: UUID | None = None
    workspace_id: UUID
    project_id: UUID | None = None


class FolderCreate(CamelModel):
    name: str = Field(min_length=1, max_length=160)
    parent_id: UUID | None = None
    project_id: UUID | None = None


class FolderUpdate(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    parent_id: UUID | None = None


class FileVersionOut(CamelModel):
    id: UUID
    file_id: UUID
    version_number: int
    size: int
    uploaded_by_id: UUID | None = None
    checksum: str | None = None
    created_at: datetime
