"""Sprints, roadmap, OKRs, time-tracking, capacity, estimation, approvals,
request forms and "my work" query endpoints (all workspace-scoped).
"""

from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select

from app.core.exceptions import NotFoundError, PermissionDeniedError
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.workspace import get_workspace_membership, require_permission
from app.models.advanced import ApprovalRequest, Sprint, TimeEntry
from app.models.task import Task
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.permissions.rbac import PERM_PROJECTS_MANAGE, has_permission
from app.schemas.advanced import (
    ApprovalCreate,
    ApprovalDecision,
    ApprovalOut,
    CapacityOut,
    CapacityUpdate,
    EstimationOut,
    EstimationUpdate,
    OKRCreate,
    OKROut,
    OKRUpdate,
    RequestFormCreate,
    RequestFormOut,
    RequestSubmissionCreate,
    RequestSubmissionOut,
    RoadmapCreate,
    RoadmapOut,
    RoadmapUpdate,
    SprintCreate,
    SprintOut,
    SprintUpdate,
    TimeEntryCreate,
    TimeEntryOut,
    TimeEntryUpdate,
)
from app.schemas.common import MessageResponse
from app.schemas.task import CommentOut, TaskOut
from app.services import advanced_service

router = APIRouter(tags=["advanced"])


async def _get_membership(db: AsyncSession, workspace_id: UUID, user_id: UUID) -> WorkspaceMember | None:
    stmt = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user_id
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def _require_membership(db: AsyncSession, workspace_id: UUID, user_id: UUID, not_found_message: str) -> None:
    if await _get_membership(db, workspace_id, user_id) is None:
        raise NotFoundError(not_found_message)


async def _require_manage(db: AsyncSession, workspace_id: UUID, user_id: UUID) -> None:
    membership = await _get_membership(db, workspace_id, user_id)
    if membership is None:
        raise NotFoundError("مورد یافت نشد.")
    if not has_permission(membership.role, PERM_PROJECTS_MANAGE):
        raise PermissionDeniedError("شما اجازه انجام این عملیات را ندارید.")


# ---------------------------------------------------------------------------
# Sprints
# ---------------------------------------------------------------------------


@router.get("/workspaces/{workspace_id}/sprints", response_model=list[SprintOut])
async def list_sprints(
    workspace_id: UUID,
    project_id: UUID | None = Query(default=None, alias="projectId"),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> list[SprintOut]:
    return await advanced_service.list_sprints(db, workspace_id, project_id)


@router.post("/workspaces/{workspace_id}/sprints", response_model=SprintOut)
async def create_sprint(
    workspace_id: UUID,
    data: SprintCreate,
    membership: WorkspaceMember = Depends(require_permission(PERM_PROJECTS_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> SprintOut:
    return await advanced_service.create_sprint(db, workspace_id, data)


async def _sprint_or_404(db: AsyncSession, sprint_id: UUID, user_id: UUID) -> Sprint:
    sprint = await db.get(Sprint, sprint_id)
    if sprint is None:
        raise NotFoundError("اسپرینت یافت نشد.")
    await _require_membership(db, sprint.workspace_id, user_id, "اسپرینت یافت نشد.")
    return sprint


@router.get("/sprints/{sprint_id}", response_model=SprintOut)
async def get_sprint(
    sprint_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> SprintOut:
    await _sprint_or_404(db, sprint_id, current_user.id)
    return await advanced_service.get_sprint(db, sprint_id)


@router.patch("/sprints/{sprint_id}", response_model=SprintOut)
async def update_sprint(
    sprint_id: UUID,
    data: SprintUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SprintOut:
    sprint = await _sprint_or_404(db, sprint_id, current_user.id)
    await _require_manage(db, sprint.workspace_id, current_user.id)
    return await advanced_service.update_sprint(db, sprint_id, data)


@router.delete("/sprints/{sprint_id}", response_model=MessageResponse)
async def delete_sprint(
    sprint_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> MessageResponse:
    sprint = await _sprint_or_404(db, sprint_id, current_user.id)
    await _require_manage(db, sprint.workspace_id, current_user.id)
    await advanced_service.delete_sprint(db, sprint_id)
    return MessageResponse(message="اسپرینت حذف شد.")


# ---------------------------------------------------------------------------
# Roadmap
# ---------------------------------------------------------------------------


@router.get("/workspaces/{workspace_id}/roadmap", response_model=list[RoadmapOut])
async def list_roadmap(
    workspace_id: UUID,
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> list[RoadmapOut]:
    return await advanced_service.list_roadmap(db, workspace_id)


@router.post("/workspaces/{workspace_id}/roadmap", response_model=RoadmapOut)
async def create_roadmap_item(
    workspace_id: UUID,
    data: RoadmapCreate,
    membership: WorkspaceMember = Depends(require_permission(PERM_PROJECTS_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> RoadmapOut:
    return await advanced_service.create_roadmap_item(db, workspace_id, data)


@router.patch("/workspaces/{workspace_id}/roadmap/{item_id}", response_model=RoadmapOut)
async def update_roadmap_item(
    workspace_id: UUID,
    item_id: UUID,
    data: RoadmapUpdate,
    membership: WorkspaceMember = Depends(require_permission(PERM_PROJECTS_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> RoadmapOut:
    return await advanced_service.update_roadmap_item(db, workspace_id, item_id, data)


@router.delete("/workspaces/{workspace_id}/roadmap/{item_id}", response_model=MessageResponse)
async def delete_roadmap_item(
    workspace_id: UUID,
    item_id: UUID,
    membership: WorkspaceMember = Depends(require_permission(PERM_PROJECTS_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await advanced_service.delete_roadmap_item(db, workspace_id, item_id)
    return MessageResponse(message="مورد نقشه راه حذف شد.")


# ---------------------------------------------------------------------------
# OKRs
# ---------------------------------------------------------------------------


@router.get("/workspaces/{workspace_id}/okrs", response_model=list[OKROut])
async def list_okrs(
    workspace_id: UUID,
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> list[OKROut]:
    return await advanced_service.list_okrs(db, workspace_id)


@router.post("/workspaces/{workspace_id}/okrs", response_model=OKROut)
async def create_okr(
    workspace_id: UUID,
    data: OKRCreate,
    membership: WorkspaceMember = Depends(require_permission(PERM_PROJECTS_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> OKROut:
    return await advanced_service.create_okr(db, workspace_id, data)


@router.patch("/workspaces/{workspace_id}/okrs/{objective_id}", response_model=OKROut)
async def update_okr(
    workspace_id: UUID,
    objective_id: UUID,
    data: OKRUpdate,
    membership: WorkspaceMember = Depends(require_permission(PERM_PROJECTS_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> OKROut:
    return await advanced_service.update_okr(db, workspace_id, objective_id, data)


@router.delete("/workspaces/{workspace_id}/okrs/{objective_id}", response_model=MessageResponse)
async def delete_okr(
    workspace_id: UUID,
    objective_id: UUID,
    membership: WorkspaceMember = Depends(require_permission(PERM_PROJECTS_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await advanced_service.delete_okr(db, workspace_id, objective_id)
    return MessageResponse(message="هدف کلیدی حذف شد.")


# ---------------------------------------------------------------------------
# Time tracking
# ---------------------------------------------------------------------------


@router.get("/workspaces/{workspace_id}/time-entries", response_model=list[TimeEntryOut])
async def list_time_entries(
    workspace_id: UUID,
    user_id: UUID | None = Query(default=None, alias="userId"),
    task_id: UUID | None = Query(default=None, alias="taskId"),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> list[TimeEntryOut]:
    return await advanced_service.list_time_entries(db, workspace_id, user_id=user_id, task_id=task_id)


@router.post("/workspaces/{workspace_id}/time-entries", response_model=TimeEntryOut)
async def create_time_entry(
    workspace_id: UUID,
    data: TimeEntryCreate,
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> TimeEntryOut:
    return await advanced_service.create_time_entry(db, workspace_id, membership.user_id, data)


async def _time_entry_or_404(db: AsyncSession, entry_id: UUID, user_id: UUID) -> TimeEntry:
    entry = await db.get(TimeEntry, entry_id)
    if entry is None:
        raise NotFoundError("ورودی زمان یافت نشد.")
    membership = await _get_membership(db, entry.workspace_id, user_id)
    if membership is None:
        raise NotFoundError("ورودی زمان یافت نشد.")
    if entry.user_id != user_id and not has_permission(membership.role, PERM_PROJECTS_MANAGE):
        raise PermissionDeniedError("شما فقط می‌توانید ورودی‌های زمانی خودتان را ویرایش کنید.")
    return entry


@router.patch("/time-entries/{entry_id}", response_model=TimeEntryOut)
async def update_time_entry(
    entry_id: UUID,
    data: TimeEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TimeEntryOut:
    await _time_entry_or_404(db, entry_id, current_user.id)
    return await advanced_service.update_time_entry(db, entry_id, data)


@router.delete("/time-entries/{entry_id}", response_model=MessageResponse)
async def delete_time_entry(
    entry_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> MessageResponse:
    await _time_entry_or_404(db, entry_id, current_user.id)
    await advanced_service.delete_time_entry(db, entry_id)
    return MessageResponse(message="ورودی زمان حذف شد.")


# ---------------------------------------------------------------------------
# Approvals
# ---------------------------------------------------------------------------


@router.get("/workspaces/{workspace_id}/approvals", response_model=list[ApprovalOut])
async def list_approvals(
    workspace_id: UUID,
    status: str | None = None,
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> list[ApprovalOut]:
    return await advanced_service.list_approvals(db, workspace_id, status=status)


@router.post("/workspaces/{workspace_id}/approvals", response_model=ApprovalOut)
async def create_approval(
    workspace_id: UUID,
    data: ApprovalCreate,
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> ApprovalOut:
    return await advanced_service.create_approval(db, workspace_id, membership.user_id, data)


@router.post("/approvals/{approval_id}/decide", response_model=ApprovalOut)
async def decide_approval(
    approval_id: UUID,
    data: ApprovalDecision,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApprovalOut:
    approval = await db.get(ApprovalRequest, approval_id)
    if approval is None:
        raise NotFoundError("درخواست تأیید یافت نشد.")
    membership = await _get_membership(db, approval.workspace_id, current_user.id)
    if membership is None:
        raise NotFoundError("درخواست تأیید یافت نشد.")
    if current_user.id not in approval.approver_ids and not has_permission(membership.role, PERM_PROJECTS_MANAGE):
        raise PermissionDeniedError("شما در فهرست تأییدکنندگان این درخواست نیستید.")
    return await advanced_service.decide_approval(db, approval_id, data)


# ---------------------------------------------------------------------------
# Capacity
# ---------------------------------------------------------------------------


@router.get("/workspaces/{workspace_id}/capacity", response_model=list[CapacityOut])
async def list_capacity(
    workspace_id: UUID,
    week_start: date | None = Query(default=None, alias="weekStart"),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> list[CapacityOut]:
    return await advanced_service.list_capacity(db, workspace_id, week_start=week_start)


@router.patch("/workspaces/{workspace_id}/capacity/{user_id}", response_model=CapacityOut)
async def update_capacity(
    workspace_id: UUID,
    user_id: UUID,
    data: CapacityUpdate,
    week_start: date | None = Query(default=None, alias="weekStart"),
    membership: WorkspaceMember = Depends(require_permission(PERM_PROJECTS_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> CapacityOut:
    return await advanced_service.update_capacity(db, workspace_id, user_id, data, week_start=week_start)


# ---------------------------------------------------------------------------
# Estimation
# ---------------------------------------------------------------------------


@router.get("/workspaces/{workspace_id}/estimation", response_model=list[EstimationOut])
async def list_estimation(
    workspace_id: UUID,
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> list[EstimationOut]:
    return await advanced_service.list_estimation(db, workspace_id)


@router.patch("/tasks/{task_id}/estimation", response_model=EstimationOut)
async def update_estimation(
    task_id: UUID,
    data: EstimationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EstimationOut:
    task = await db.get(Task, task_id)
    if task is None:
        raise NotFoundError("وظیفه یافت نشد.")
    await _require_membership(db, task.workspace_id, current_user.id, "وظیفه یافت نشد.")
    return await advanced_service.update_estimation(db, task_id, current_user.id, data)


# ---------------------------------------------------------------------------
# Request forms
# ---------------------------------------------------------------------------


@router.get("/workspaces/{workspace_id}/request-forms", response_model=list[RequestFormOut])
async def list_request_forms(
    workspace_id: UUID,
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> list[RequestFormOut]:
    return await advanced_service.list_request_forms(db, workspace_id)


@router.post("/workspaces/{workspace_id}/request-forms", response_model=RequestFormOut)
async def create_request_form(
    workspace_id: UUID,
    data: RequestFormCreate,
    membership: WorkspaceMember = Depends(require_permission(PERM_PROJECTS_MANAGE)),
    db: AsyncSession = Depends(get_db),
) -> RequestFormOut:
    return await advanced_service.create_request_form(db, workspace_id, membership.user_id, data)


@router.get("/request-forms/{form_id}/submissions", response_model=list[RequestSubmissionOut])
async def list_submissions(
    form_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[RequestSubmissionOut]:
    return await advanced_service.list_submissions(db, form_id)


@router.post("/request-forms/{form_id}/submissions", response_model=RequestSubmissionOut)
async def submit_request_form(
    form_id: UUID,
    data: RequestSubmissionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RequestSubmissionOut:
    return await advanced_service.submit_request_form(db, form_id, current_user.id, data)


# ---------------------------------------------------------------------------
# Comments / mentions / my-work
# ---------------------------------------------------------------------------


@router.get("/workspaces/{workspace_id}/comments", response_model=list[CommentOut])
async def list_all_comments(
    workspace_id: UUID,
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> list[CommentOut]:
    return await advanced_service.list_all_comments(db, workspace_id)


@router.get("/workspaces/{workspace_id}/mentions", response_model=list[CommentOut])
async def list_mentions(
    workspace_id: UUID,
    membership: WorkspaceMember = Depends(get_workspace_membership),
    db: AsyncSession = Depends(get_db),
) -> list[CommentOut]:
    return await advanced_service.list_mentions(db, workspace_id, membership.user_id)

