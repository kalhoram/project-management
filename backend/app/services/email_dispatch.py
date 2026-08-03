"""Transactional email helpers for auth flows (verification, password reset)."""

from __future__ import annotations

from urllib.parse import quote

from app.core.config import get_settings
from app.integrations.email import EmailMessagePayload, get_email_sender


def build_verification_url(token: str, email: str) -> str:
    settings = get_settings()
    base = settings.frontend_url.rstrip("/")
    return f"{base}/verify-email?token={quote(token, safe='')}&email={quote(email, safe='')}"


async def send_verification_email(*, to: str, token: str) -> tuple[bool, str]:
    """Dispatch verification email. Returns (success, delivery_mode)."""
    settings = get_settings()
    verify_url = build_verification_url(token, to)
    subject = "تأیید ایمیل — یادباکس"
    body_text = (
        "سلام،\n\n"
        "برای تأیید ایمیل خود در یادباکس روی لینک زیر کلیک کنید:\n\n"
        f"{verify_url}\n\n"
        "اگر این درخواست را شما نداده‌اید، این پیام را نادیده بگیرید.\n"
    )
    body_html = (
        "<p>سلام،</p>"
        "<p>برای تأیید ایمیل خود در <strong>یادباکس</strong> "
        f'<a href="{verify_url}">اینجا کلیک کنید</a>.</p>'
        "<p>اگر این درخواست را شما نداده‌اید، این پیام را نادیده بگیرید.</p>"
    )

    sender = get_email_sender()
    ok = await sender.send(
        EmailMessagePayload(to=to, subject=subject, body_text=body_text, body_html=body_html)
    )
    mode = "smtp" if settings.email_enabled else "console"
    return ok, mode
