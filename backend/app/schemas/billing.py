from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.common import CamelModel
from app.schemas.enums import InvoiceStatus, PaymentStatus, PlanInterval


class PlanLimits(CamelModel):
    workspaces: int
    members: int
    projects: int
    storage_gb: int


class PlanOut(CamelModel):
    id: str
    name: str
    description: str
    price_monthly: float
    price_yearly: float
    features: list[str]
    limits: PlanLimits
    popular: bool | None = None
    status: str = "active"


class PlanCreate(CamelModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = ""
    price_monthly: float = Field(ge=0, default=0)
    price_yearly: float = Field(ge=0, default=0)
    features: list[str] = Field(default_factory=list)
    limits: PlanLimits
    popular: bool = False


class PlanUpdate(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = None
    price_monthly: float | None = Field(default=None, ge=0)
    price_yearly: float | None = Field(default=None, ge=0)
    features: list[str] | None = None
    limits: PlanLimits | None = None
    popular: bool | None = None
    status: str | None = None


class InvoiceOut(CamelModel):
    id: UUID
    workspace_id: UUID
    number: str
    amount: float
    currency: str
    status: InvoiceStatus
    issued_at: datetime
    due_at: datetime
    pdf_url: str | None = None


class PaymentOut(CamelModel):
    id: UUID
    workspace_id: UUID
    invoice_id: UUID | None = None
    amount: float
    currency: str
    status: PaymentStatus
    method: str
    created_at: datetime
    customer_name: str


class SubscriptionOut(CamelModel):
    id: UUID
    workspace_id: UUID
    plan_id: str
    interval: PlanInterval
    status: str
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool = False
    created_at: datetime


class SubscriptionUsage(CamelModel):
    members: int
    projects: int
    storage_gb: float


class SubscriptionDetailOut(CamelModel):
    """`getSubscription(workspaceId)` shape expected by `lib/api/billing.service.ts`."""

    workspace_id: UUID
    plan: PlanOut
    renewal_date: datetime | None = None
    status: str
    cancel_at_period_end: bool = False
    usage: SubscriptionUsage


class SelectPlanRequest(CamelModel):
    plan_id: str
    interval: PlanInterval = "monthly"
