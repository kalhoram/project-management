"""Payment provider abstraction.

`PaymentProvider` is intentionally tiny -- enough to drive `billing_service`
without coupling it to a specific gateway (Zarinpal/Stripe/IDPay/...).
`FakePaymentProvider` always succeeds and is what local/dev/tests use; a real
gateway adapter can be dropped in later behind the same protocol.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol, runtime_checkable


@dataclass(slots=True)
class PaymentIntent:
    id: str
    amount: Decimal
    currency: str
    redirect_url: str
    status: str = "pending"


@dataclass(slots=True)
class PaymentResult:
    success: bool
    external_payment_id: str
    status: str
    message: str | None = None


@runtime_checkable
class PaymentProvider(Protocol):
    """Minimal payment gateway contract used by `app.services.billing_service`."""

    async def create_intent(
        self, *, amount: Decimal, currency: str, description: str
    ) -> PaymentIntent: ...

    async def verify_webhook(self, payload: dict) -> PaymentResult: ...

    async def cancel(self, external_subscription_id: str) -> bool: ...


class FakePaymentProvider:
    """Always-succeeds provider for local development and automated tests."""

    async def create_intent(
        self, *, amount: Decimal, currency: str, description: str
    ) -> PaymentIntent:
        intent_id = f"fake_{uuid.uuid4().hex[:16]}"
        return PaymentIntent(
            id=intent_id,
            amount=amount,
            currency=currency,
            redirect_url=f"/billing/result?intent={intent_id}&status=success",
            status="pending",
        )

    async def verify_webhook(self, payload: dict) -> PaymentResult:
        return PaymentResult(
            success=True,
            external_payment_id=str(payload.get("intent_id") or uuid.uuid4().hex),
            status="paid",
        )

    async def cancel(self, external_subscription_id: str) -> bool:
        return True


_provider_instance: PaymentProvider | None = None


def get_payment_provider() -> PaymentProvider:
    global _provider_instance
    if _provider_instance is None:
        _provider_instance = FakePaymentProvider()
    return _provider_instance
