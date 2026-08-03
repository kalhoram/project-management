"""Global (workspace-scoped) search endpoint."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies.workspace import get_workspace_membership
from app.models.workspace import WorkspaceMember
from app.schemas.search import GlobalSearchResponse
from app.services import search_service

router = APIRouter(tags=["search"])


@router.get("/workspaces/{workspace_id}/search", response_model=GlobalSearchResponse)
async def global_search(
    workspace_id: UUID,
    q: str = Query(default="", min_length=0, max_length=200),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> GlobalSearchResponse:
    return await search_service.global_search(db, workspace_id, q)
