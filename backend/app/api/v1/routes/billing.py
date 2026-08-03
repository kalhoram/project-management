"""Plan catalog, subscription, invoice and payment endpoints (workspace-scoped)."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies.workspace import get_workspace_membership, require_permission
from app.models.workspace import WorkspaceMember
from app.permissions.rbac import PERM_BILLING_MANAGE
from app.schemas.billing import InvoiceOut, PlanOut, SelectPlanRequest, SubscriptionDetailOut
from app.services import billing_service

router = APIRouter(tags=["billing"])


@router.get("/billing/plans", response_model=list[PlanOut])
async def list_plans(db: AsyncSession = Depends(get_db)) -> list[PlanOut]:
    return await billing_service.list_plans(db)


@router.get("/billing/plans/{plan_id}", response_model=PlanOut)
async def get_plan(plan_id: UUID, db: AsyncSession = Depends(get_db)) -> PlanOut:
    return await billing_service.get_plan(db, plan_id)


@router.get("/workspaces/{workspace_id}/billing/invoices", response_model=list[InvoiceOut])
async def list_invoices(
    workspace_id: UUID,
    membership: WorkspaceMember = Depends(require_permission(PERM_BILLING_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> list[InvoiceOut]:
    return await billing_service.list_invoices(db, workspace_id)


@router.get("/workspaces/{workspace_id}/billing/subscription", response_model=SubscriptionDetailOut)
async def get_subscription(
    workspace_id: UUID,
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> SubscriptionDetailOut:
    return await billing_service.get_subscription(db, workspace_id)


@router.post("/workspaces/{workspace_id}/billing/select-plan", response_model=SubscriptionDetailOut)
async def select_plan(
    workspace_id: UUID,
    data: SelectPlanRequest,
    membership: WorkspaceMember = Depends(require_permission(PERM_BILLING_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> SubscriptionDetailOut:
    return await billing_service.select_plan(db, workspace_id, data)


@router.post("/workspaces/{workspace_id}/billing/cancel", response_model=SubscriptionDetailOut)
async def cancel_subscription(
    workspace_id: UUID,
    membership: WorkspaceMember = Depends(require_permission(PERM_BILLING_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> SubscriptionDetailOut:
    return await billing_service.cancel_subscription(db, workspace_id)
