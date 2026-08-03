"""Plans, subscriptions, invoices and payments."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID as PyUUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import (
    InvoiceStatus,
    PaymentStatus,
    PlanInterval,
    PlanStatus,
    SubscriptionStatus,
    sa_enum,
)


class Plan(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "plans"

    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    price_monthly: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    price_yearly: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    features: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, nullable=False)
    limit_workspaces: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    limit_members: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    limit_projects: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    limit_storage_gb: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    is_popular: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[PlanStatus] = mapped_column(sa_enum(PlanStatus), default=PlanStatus.ACTIVE, nullable=False)


class BillingCustomer(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """Links a `Workspace` to an external payment provider customer record."""

    __tablename__ = "billing_customers"
    __table_args__ = (
        UniqueConstraint("workspace_id", "provider", name="uq_billing_customers_workspace_provider"),
    )

    provider: Mapped[str] = mapped_column(String(32), default="stripe", nullable=False)
    external_customer_id: Mapped[str] = mapped_column(String(128), nullable=False)
    billing_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    billing_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    tax_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    address: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class Subscription(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "subscriptions"

    plan_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("plans.id", ondelete="SET NULL"), nullable=True
    )
    customer_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("billing_customers.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        sa_enum(SubscriptionStatus), default=SubscriptionStatus.TRIALING, nullable=False
    )
    interval: Mapped[PlanInterval] = mapped_column(
        sa_enum(PlanInterval), default=PlanInterval.MONTHLY, nullable=False
    )
    current_period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    external_subscription_id: Mapped[str | None] = mapped_column(String(128), nullable=True)


class Invoice(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "invoices"

    subscription_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True
    )
    number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="IRR", nullable=False)
    status: Mapped[InvoiceStatus] = mapped_column(
        sa_enum(InvoiceStatus), default=InvoiceStatus.DRAFT, nullable=False
    )
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    pdf_url: Mapped[str | None] = mapped_column(Text, nullable=True)


class Payment(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "payments"

    invoice_id: Mapped[PyUUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="IRR", nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(
        sa_enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False
    )
    method: Mapped[str] = mapped_column(String(32), nullable=False)
    customer_name: Mapped[str] = mapped_column(Text, nullable=False)
    external_payment_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
