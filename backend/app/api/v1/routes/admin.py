"""System-admin endpoints: cross-tenant dashboards, users, workspaces, plans,
payments, logs, report series and platform settings.

Every route is gated behind `require_system_admin`.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies.auth import require_system_admin
from app.models.user import User
from app.schemas.admin import (
    AdminDashboard,
    AdminReports,
    AdminSettingsFull,
    AdminSettingsFullUpdate,
    AdminUserDetail,
    AdminWorkspaceDetail,
    SystemLogOut,
)
from app.schemas.billing import PaymentOut, PlanCreate, PlanOut, PlanUpdate
from app.schemas.common import MessageResponse
from app.schemas.project import ProjectOut
from app.schemas.user import UserOut
from app.schemas.workspace import WorkspaceOut
from app.services import admin_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard", response_model=AdminDashboard)
async def get_dashboard(
    admin: User = Depends(require_system_admin), db: AsyncSession = Depends(get_db)
) -> AdminDashboard:
    return await admin_service.get_dashboard(db)


@router.get("/users", response_model=list[UserOut])
async def list_users(
    q: str | None = None,
    admin: User = Depends(require_system_admin),
    db: AsyncSession = Depends(get_db),
) -> list[UserOut]:
    return await admin_service.list_users(db, q=q)


@router.get("/users/{user_id}", response_model=AdminUserDetail)
async def get_user_detail(
    user_id: UUID, admin: User = Depends(require_system_admin), db: AsyncSession = Depends(get_db)
) -> AdminUserDetail:
    return await admin_service.get_user_detail(db, user_id)


@router.get("/workspaces", response_model=list[WorkspaceOut])
async def list_workspaces(
    admin: User = Depends(require_system_admin), db: AsyncSession = Depends(get_db)
) -> list[WorkspaceOut]:
    return await admin_service.list_workspaces(db)


@router.get("/workspaces/{workspace_id}", response_model=AdminWorkspaceDetail)
async def get_workspace_detail(
    workspace_id: UUID, admin: User = Depends(require_system_admin), db: AsyncSession = Depends(get_db)
) -> AdminWorkspaceDetail:
    return await admin_service.get_workspace_detail(db, workspace_id)


@router.get("/projects", response_model=list[ProjectOut])
async def list_all_projects(
    admin: User = Depends(require_system_admin), db: AsyncSession = Depends(get_db)
) -> list[ProjectOut]:
    return await admin_service.list_all_projects(db)


@router.get("/plans", response_model=list[PlanOut])
async def list_plans(admin: User = Depends(require_system_admin), db: AsyncSession = Depends(get_db)) -> list[PlanOut]:
    return await admin_service.list_plans(db)


@router.post("/plans", response_model=PlanOut)
async def create_plan(
    data: PlanCreate, admin: User = Depends(require_system_admin), db: AsyncSession = Depends(get_db)
) -> PlanOut:
    return await admin_service.create_plan(db, data)


@router.patch("/plans/{plan_id}", response_model=PlanOut)
async def update_plan(
    plan_id: UUID,
    data: PlanUpdate,
    admin: User = Depends(require_system_admin),
    db: AsyncSession = Depends(get_db),
) -> PlanOut:
    return await admin_service.update_plan(db, plan_id, data)


@router.delete("/plans/{plan_id}", response_model=MessageResponse)
async def delete_plan(
    plan_id: UUID, admin: User = Depends(require_system_admin), db: AsyncSession = Depends(get_db)
) -> MessageResponse:
    await admin_service.delete_plan(db, plan_id)
    return MessageResponse(message="طرح غیرفعال شد.")


@router.get("/payments", response_model=list[PaymentOut])
async def list_payments(
    admin: User = Depends(require_system_admin), db: AsyncSession = Depends(get_db)
) -> list[PaymentOut]:
    return await admin_service.list_payments(db)


@router.get("/logs", response_model=list[SystemLogOut])
async def list_logs(
    severity: str | None = None,
    admin: User = Depends(require_system_admin),
    db: AsyncSession = Depends(get_db),
) -> list[SystemLogOut]:
    return await admin_service.list_logs(db, severity=severity)


@router.get("/reports", response_model=AdminReports)
async def get_reports(
    months: int = Query(default=6, ge=1, le=24),
    admin: User = Depends(require_system_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminReports:
    return await admin_service.get_reports(db, months=months)


@router.get("/settings", response_model=AdminSettingsFull)
async def get_settings(
    admin: User = Depends(require_system_admin), db: AsyncSession = Depends(get_db)
) -> AdminSettingsFull:
    return await admin_service.get_platform_settings(db)


@router.patch("/settings", response_model=AdminSettingsFull)
async def update_settings(
    data: AdminSettingsFullUpdate,
    admin: User = Depends(require_system_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminSettingsFull:
    return await admin_service.update_platform_settings(db, admin.id, data)
