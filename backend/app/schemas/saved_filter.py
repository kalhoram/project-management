from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field

from app.schemas.common import CamelModel, Page


class FilterConditionOut(CamelModel):
    id: str
    field: str
    operator: str
    value: Any


class SavedFilterOut(CamelModel):
    id: UUID
    name: str
    scope: str
    workspace_id: UUID | None = None
    project_id: UUID | None = None
    owner_id: UUID | None = None
    conditions: list[dict[str, Any]]
    visibility: str
    last_used_at: datetime | None = None
    is_default: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None


class SavedFilterCreate(CamelModel):
    name: str = Field(min_length=1, max_length=120)
    scope: str = Field(pattern="^(workspace|project|global)$")
    workspace_id: UUID | None = None
    project_id: UUID | None = None
    conditions: list[dict[str, Any]] = Field(default_factory=list)
    visibility: str = Field(default="private", pattern="^(private|shared)$")
    is_default: bool = False


class SavedFilterUpdate(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    conditions: list[dict[str, Any]] | None = None
    visibility: str | None = Field(default=None, pattern="^(private|shared)$")
    is_default: bool | None = None


class SavedFilterPage(Page):
    items: list[SavedFilterOut]
