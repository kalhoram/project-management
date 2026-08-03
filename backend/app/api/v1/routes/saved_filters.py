"""Saved filter CRUD endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.saved_filter import SavedFilterCreate, SavedFilterOut, SavedFilterPage, SavedFilterUpdate
from app.services import saved_filter_service

router = APIRouter(prefix="/saved-filters", tags=["saved-filters"])


@router.get("", response_model=SavedFilterPage)
async def list_saved_filters(
    workspace_id: UUID | None = Query(default=None, alias="workspaceId"),
    project_id: UUID | None = Query(default=None, alias="projectId"),
    scope: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100, alias="pageSize"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SavedFilterPage:
    items, total = await saved_filter_service.list_saved_filters(
        db,
        current_user.id,
        workspace_id=workspace_id,
        project_id=project_id,
        scope=scope,
        page=page,
        page_size=page_size,
    )
    return SavedFilterPage(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.post("", response_model=SavedFilterOut, status_code=201)
async def create_saved_filter(
    data: SavedFilterCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SavedFilterOut:
    return await saved_filter_service.create_saved_filter(db, current_user.id, data)


@router.get("/{filter_id}", response_model=SavedFilterOut)
async def get_saved_filter(
    filter_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SavedFilterOut:
    return await saved_filter_service.get_saved_filter(db, current_user.id, filter_id)


@router.patch("/{filter_id}", response_model=SavedFilterOut)
async def update_saved_filter(
    filter_id: UUID,
    data: SavedFilterUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SavedFilterOut:
    return await saved_filter_service.update_saved_filter(db, current_user.id, filter_id, data)


@router.delete("/{filter_id}", response_model=MessageResponse)
async def delete_saved_filter(
    filter_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await saved_filter_service.delete_saved_filter(db, current_user.id, filter_id)
    return MessageResponse(message="فیلتر ذخیره‌شده با موفقیت حذف شد.")
