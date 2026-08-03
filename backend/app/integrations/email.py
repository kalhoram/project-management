"""Outbound email abstraction.

`ConsoleEmailSender` (default for local/dev) just logs the message via
structlog so verification/reset/invite flows work without an SMTP server.
`SMTPEmailSender` is a real, minimal `smtplib` implementation gated by
`Settings.email_enabled`.
"""

from __future__ import annotations

import smtplib
from dataclasses import dataclass
from email.message import EmailMessage
from typing import Protocol, runtime_checkable

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass(slots=True)
class EmailMessagePayload:
    to: str
    subject: str
    body_text: str
    body_html: str | None = None


@runtime_checkable
class EmailSender(Protocol):
    """Minimal outbound email contract used by `app.tasks.jobs`."""

    async def send(self, message: EmailMessagePayload) -> bool: ...


class ConsoleEmailSender:
    """Logs the email instead of sending it. Safe default for local/dev/tests."""

    async def send(self, message: EmailMessagePayload) -> bool:
        logger.info(
            "email.console_send",
            to=message.to,
            subject=message.subject,
            body_preview=message.body_text[:200],
        )
        return True


class SMTPEmailSender:
    """Real SMTP sender used when `Settings.email_enabled` is true."""

    async def send(self, message: EmailMessagePayload) -> bool:
        import asyncio

        settings = get_settings()

        def _send_sync() -> bool:
            msg = EmailMessage()
            msg["Subject"] = message.subject
            msg["From"] = settings.smtp_from
            msg["To"] = message.to
            msg.set_content(message.body_text)
            if message.body_html:
                msg.add_alternative(message.body_html, subtype="html")

            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as client:
                if settings.smtp_user and settings.smtp_password:
                    client.starttls()
                    client.login(settings.smtp_user, settings.smtp_password)
                client.send_message(msg)
            return True

        try:
            return await asyncio.to_thread(_send_sync)
        except Exception:
            logger.exception("email.smtp_send_failed", to=message.to, subject=message.subject)
            return False


_sender_instance: EmailSender | None = None


def get_email_sender() -> EmailSender:
    global _sender_instance
    if _sender_instance is None:
        settings = get_settings()
        _sender_instance = SMTPEmailSender() if settings.email_enabled else ConsoleEmailSender()
    return _sender_instance
