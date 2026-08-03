"""Plan catalog, subscription, invoice and payment business logic.

Aligned with the real ORM models (app.models.billing):

- Plan: id, name, description, price_monthly, price_yearly, features[],
  limit_workspaces/members/projects/storage_gb, is_popular, status. `PlanOut`
  nests those four `limit_*` columns under `limits` and renames `is_popular`
  -> `popular`, so it needs an explicit mapper (`_to_plan_out`) rather than
  `model_validate`.
- BillingCustomer / Subscription: one (lazily created) subscription per
  workspace. `SubscriptionDetailOut` (`getSubscription`) additionally reports
  live usage counters (members/projects/storage) computed from
  `WorkspaceMember` / `Project` / `Attachment`.
- Invoice / Payment: straightforward, workspace-scoped ledgers.

`FakePaymentProvider` (app.billing.provider) is used for the local/dev/test
checkout flow: `select_plan` "pays" immediately and records a paid
invoice+payment so the UI has something to show right away.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.billing.provider import get_payment_provider
from app.core.exceptions import NotFoundError
from app.models.billing import BillingCustomer, Invoice, Payment, Plan, Subscription
from app.models.file import Attachment
from app.models.project import Project
from app.models.workspace import Workspace, WorkspaceMember
from app.schemas.billing import (
    InvoiceOut,
    PaymentOut,
    PlanCreate,
    PlanLimits,
    PlanOut,
    PlanUpdate,
    SelectPlanRequest,
    SubscriptionDetailOut,
    SubscriptionUsage,
)


def _to_plan_out(plan: Plan) -> PlanOut:
    return PlanOut(
        id=str(plan.id),
        name=plan.name,
        description=plan.description,
        price_monthly=float(plan.price_monthly),
        price_yearly=float(plan.price_yearly),
        features=list(plan.features),
        limits=PlanLimits(
            workspaces=plan.limit_workspaces,
            members=plan.limit_members,
            projects=plan.limit_projects,
            storage_gb=plan.limit_storage_gb,
        ),
        popular=plan.is_popular,
        status=plan.status,
    )


async def list_plans(db: AsyncSession, *, include_inactive: bool = False) -> list[PlanOut]:
    stmt = select(Plan)
    if not include_inactive:
        stmt = stmt.where(Plan.status == "active")
    stmt = stmt.order_by(Plan.price_monthly.asc())
    plans = (await db.execute(stmt)).scalars().all()
    return [_to_plan_out(p) for p in plans]


async def get_plan(db: AsyncSession, plan_id: UUID) -> PlanOut:
    plan = await db.get(Plan, plan_id)
    if plan is None:
        raise NotFoundError("طرح یافت نشد.")
    return _to_plan_out(plan)


async def create_plan(db: AsyncSession, data: PlanCreate) -> PlanOut:
    plan = Plan(
        name=data.name,
        description=data.description,
        price_monthly=Decimal(str(data.price_monthly)),
        price_yearly=Decimal(str(data.price_yearly)),
        features=data.features,
        limit_workspaces=data.limits.workspaces,
        limit_members=data.limits.members,
        limit_projects=data.limits.projects,
        limit_storage_gb=data.limits.storage_gb,
        is_popular=data.popular,
        status="active",
    )
    db.add(plan)
    await db.flush()
    return _to_plan_out(plan)


async def update_plan(db: AsyncSession, plan_id: UUID, data: PlanUpdate) -> PlanOut:
    plan = await db.get(Plan, plan_id)
    if plan is None:
        raise NotFoundError("طرح یافت نشد.")

    updates = data.model_dump(exclude_unset=True, exclude={"limits", "popular"})
    for field, value in updates.items():
        if field in ("price_monthly", "price_yearly"):
            value = Decimal(str(value))
        setattr(plan, field, value)

    if data.limits is not None:
        plan.limit_workspaces = data.limits.workspaces
        plan.limit_members = data.limits.members
        plan.limit_projects = data.limits.projects
        plan.limit_storage_gb = data.limits.storage_gb
    if data.popular is not None:
        plan.is_popular = data.popular

    await db.flush()
    return _to_plan_out(plan)


async def delete_plan(db: AsyncSession, plan_id: UUID) -> None:
    plan = await db.get(Plan, plan_id)
    if plan is None:
        raise NotFoundError("طرح یافت نشد.")
    plan.status = "deprecated"


async def list_invoices(db: AsyncSession, workspace_id: UUID) -> list[InvoiceOut]:
    stmt = (
        select(Invoice).where(Invoice.workspace_id == workspace_id).order_by(Invoice.issued_at.desc())
    )
    invoices = (await db.execute(stmt)).scalars().all()
    return [InvoiceOut.model_validate(i) for i in invoices]


async def list_payments(db: AsyncSession, workspace_id: UUID | None = None) -> list[PaymentOut]:
    stmt = select(Payment)
    if workspace_id is not None:
        stmt = stmt.where(Payment.workspace_id == workspace_id)
    stmt = stmt.order_by(Payment.created_at.desc())
    payments = (await db.execute(stmt)).scalars().all()
    return [PaymentOut.model_validate(p) for p in payments]


async def _get_or_create_customer(db: AsyncSession, workspace_id: UUID) -> BillingCustomer:
    stmt = select(BillingCustomer).where(
        BillingCustomer.workspace_id == workspace_id, BillingCustomer.provider == "internal"
    )
    customer = (await db.execute(stmt)).scalar_one_or_none()
    if customer is None:
        customer = BillingCustomer(
            workspace_id=workspace_id, provider="internal", external_customer_id=f"cus_{workspace_id.hex}"
        )
        db.add(customer)
        await db.flush()
    return customer


async def _get_default_plan(db: AsyncSession) -> Plan | None:
    stmt = select(Plan).where(Plan.status == "active").order_by(Plan.price_monthly.asc()).limit(1)
    return (await db.execute(stmt)).scalars().first()


async def _get_or_create_subscription(db: AsyncSession, workspace_id: UUID) -> Subscription:
    stmt = select(Subscription).where(Subscription.workspace_id == workspace_id)
    subscription = (await db.execute(stmt)).scalar_one_or_none()
    if subscription is not None:
        return subscription

    workspace = await db.get(Workspace, workspace_id)
    plan_id = workspace.plan_id if workspace else None
    if plan_id is None:
        default_plan = await _get_default_plan(db)
        plan_id = default_plan.id if default_plan else None

    customer = await _get_or_create_customer(db, workspace_id)
    now = datetime.now(UTC)
    subscription = Subscription(
        workspace_id=workspace_id,
        plan_id=plan_id,
        customer_id=customer.id,
        status="trialing",
        interval="monthly",
        current_period_start=now,
        current_period_end=now + timedelta(days=30),
        trial_ends_at=now + timedelta(days=14),
    )
    db.add(subscription)
    await db.flush()
    return subscription


async def _usage(db: AsyncSession, workspace_id: UUID) -> SubscriptionUsage:
    members = (
        await db.execute(
            select(func.count(WorkspaceMember.id)).where(
                WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.is_active.is_(True)
            )
        )
    ).scalar_one()
    projects = (
        await db.execute(
            select(func.count(Project.id)).where(
                Project.workspace_id == workspace_id, Project.status != "deleted"
            )
        )
    ).scalar_one()
    storage_bytes = (
        await db.execute(
            select(func.coalesce(func.sum(Attachment.size_bytes), 0)).where(
                Attachment.workspace_id == workspace_id, Attachment.deleted_at.is_(None)
            )
        )
    ).scalar_one()
    return SubscriptionUsage(members=members, projects=projects, storage_gb=round(storage_bytes / 1_000_000_000, 3))


async def get_subscription(db: AsyncSession, workspace_id: UUID) -> SubscriptionDetailOut:
    subscription = await _get_or_create_subscription(db, workspace_id)
    plan = await db.get(Plan, subscription.plan_id) if subscription.plan_id else await _get_default_plan(db)
    if plan is None:
        raise NotFoundError("طرح فعالی برای این فضای کاری یافت نشد.")

    usage = await _usage(db, workspace_id)
    return SubscriptionDetailOut(
        workspace_id=workspace_id,
        plan=_to_plan_out(plan),
        renewal_date=subscription.current_period_end,
        status=subscription.status,
        cancel_at_period_end=subscription.cancel_at_period_end,
        usage=usage,
    )


async def select_plan(db: AsyncSession, workspace_id: UUID, data: SelectPlanRequest) -> SubscriptionDetailOut:
    plan = await db.get(Plan, UUID(data.plan_id)) if _looks_like_uuid(data.plan_id) else None
    if plan is None:
        stmt = select(Plan).where(Plan.status == "active")
        plans = (await db.execute(stmt)).scalars().all()
        plan = next((p for p in plans if str(p.id) == data.plan_id), None)
    if plan is None:
        raise NotFoundError("طرح یافت نشد.")

    subscription = await _get_or_create_subscription(db, workspace_id)
    provider = get_payment_provider()
    amount = plan.price_yearly if data.interval == "yearly" else plan.price_monthly
    intent = await provider.create_intent(amount=amount, currency="IRR", description=f"اشتراک {plan.name}")
    result = await provider.verify_webhook({"intent_id": intent.id})

    now = datetime.now(UTC)
    period_days = 365 if data.interval == "yearly" else 30
    subscription.plan_id = plan.id
    subscription.interval = data.interval
    subscription.status = "active" if result.success else "past_due"
    subscription.current_period_start = now
    subscription.current_period_end = now + timedelta(days=period_days)
    subscription.cancel_at_period_end = False
    subscription.canceled_at = None

    workspace = await db.get(Workspace, workspace_id)
    if workspace is not None:
        workspace.plan_id = plan.id
        if workspace.status == "trial":
            workspace.status = "active"

    if result.success:
        invoice = Invoice(
            workspace_id=workspace_id,
            subscription_id=subscription.id,
            number=f"INV-{now.strftime('%Y%m%d')}-{intent.id[-6:]}",
            amount=amount,
            currency="IRR",
            status="paid",
            issued_at=now,
            due_at=now,
        )
        db.add(invoice)
        await db.flush()
        db.add(
            Payment(
                workspace_id=workspace_id,
                invoice_id=invoice.id,
                amount=amount,
                currency="IRR",
                status="paid",
                method="fake_gateway",
                customer_name=workspace.name if workspace else "فضای کاری",
                external_payment_id=result.external_payment_id,
            )
        )

    await db.flush()
    return await get_subscription(db, workspace_id)


async def cancel_subscription(db: AsyncSession, workspace_id: UUID) -> SubscriptionDetailOut:
    subscription = await _get_or_create_subscription(db, workspace_id)
    provider = get_payment_provider()
    if subscription.external_subscription_id:
        await provider.cancel(subscription.external_subscription_id)

    subscription.cancel_at_period_end = True
    subscription.canceled_at = datetime.now(UTC)
    subscription.status = "canceled"
    await db.flush()
    return await get_subscription(db, workspace_id)


def _looks_like_uuid(value: str) -> bool:
    try:
        UUID(value)
        return True
    except (ValueError, AttributeError):
        return False
