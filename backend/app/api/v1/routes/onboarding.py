"""Onboarding wizard finalization (workspace + invites + first project)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.workspace import OnboardingComplete, WorkspaceOut
from app.services import workspace_service

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post("/complete", response_model=WorkspaceOut)
async def complete_onboarding(
    data: OnboardingComplete, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> WorkspaceOut:
    return await workspace_service.complete_onboarding(db, current_user, data)
