from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from app.schemas.common import CamelModel
from app.schemas.file import AttachmentOut
from app.schemas.project import ProjectOut
from app.schemas.task import CommentOut, TaskOut
from app.schemas.user import UserOut

SearchResultType = Literal["task", "project", "workspace", "file", "comment", "user"]


class GlobalSearchResult(CamelModel):
    id: UUID
    type: SearchResultType
    title: str
    subtitle: str | None = None
    workspace_id: UUID | None = None
    project_id: UUID | None = None
    url: str | None = None
    updated_at: datetime | None = None
    score: float | None = None


class GlobalSearchResponse(CamelModel):
    """`globalSearch(query)` shape expected by `lib/api/search.service.ts`."""

    tasks: list[TaskOut] = Field(default_factory=list)
    projects: list[ProjectOut] = Field(default_factory=list)
    users: list[UserOut] = Field(default_factory=list)
    files: list[AttachmentOut] = Field(default_factory=list)
    comments: list[CommentOut] = Field(default_factory=list)
