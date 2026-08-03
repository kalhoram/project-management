"""Callable Celery jobs: email, notification fanout, exports, recurring tasks, reminders.

Every task is a thin, synchronous Celery entrypoint that drives an `async def`
implementation via `asyncio.run` against a fresh `AsyncSession` -- workers run
in a separate process from the API so they cannot reuse the app's request-scoped
session.
"""

from __future__ import annotations

import asyncio
from datetime import UTC, date, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import select

from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal
from app.integrations.email import EmailMessagePayload, get_email_sender
from app.tasks.celery_app import celery_app

logger = get_logger(__name__)


def _run(coro):
    return asyncio.run(coro)


async def _send_email_async(to: str, subject: str, body_text: str, body_html: str | None) -> bool:
    sender = get_email_sender()
    return await sender.send(EmailMessagePayload(to=to, subject=subject, body_text=body_text, body_html=body_html))


@celery_app.task(name="app.tasks.jobs.send_email")
def send_email(to: str, subject: str, body_text: str, body_html: str | None = None) -> bool:
    return _run(_send_email_async(to, subject, body_text, body_html))


async def _fanout_notification_async(
    user_ids: list[str],
    notification_type: str,
    title: str,
    body: str,
    entity_type: str | None,
    entity_id: str | None,
) -> int:
    from app.models.activity import Notification

    async with AsyncSessionLocal() as db:
        count = 0
        for raw_id in user_ids:
            db.add(
                Notification(
                    user_id=UUID(raw_id),
                    type=notification_type,
                    title=title,
                    body=body,
                    entity_type=entity_type,
                    entity_id=UUID(entity_id) if entity_id else None,
                    read=False,
                )
            )
            count += 1
        await db.commit()
        return count


@celery_app.task(name="app.tasks.jobs.fanout_notification")
def fanout_notification(
    user_ids: list[str],
    notification_type: str,
    title: str,
    body: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
) -> int:
    return _run(_fanout_notification_async(user_ids, notification_type, title, body, entity_type, entity_id))


async def _generate_export_async(export_job_id: str) -> str:
    from app.models.advanced import ReportExportJob

    async with AsyncSessionLocal() as db:
        job = await db.get(ReportExportJob, UUID(export_job_id))
        if job is None:
            return "missing"
        try:
            job.status = "processing"
            await db.flush()
            # Placeholder render step -- a real implementation renders CSV/XLSX/PDF
            # using openpyxl/reportlab based on job.report_type/job.filters.
            job.status = "completed"
            job.file_url = f"/exports/{job.id}.{job.format}"
            job.completed_at = datetime.now(UTC)
        except Exception as exc:  # pragma: no cover - defensive
            job.status = "failed"
            job.error_message = str(exc)
        await db.commit()
        return job.status


@celery_app.task(name="app.tasks.jobs.generate_export")
def generate_export(export_job_id: str) -> str:
    return _run(_generate_export_async(export_job_id))


async def _generate_recurring_tasks_async() -> int:
    from app.models.task import RecurringRule, Task

    created = 0
    async with AsyncSessionLocal() as db:
        now = datetime.now(UTC)
        stmt = select(RecurringRule).where(
            RecurringRule.next_run_at.is_not(None), RecurringRule.next_run_at <= now
        )
        rules = (await db.execute(stmt)).scalars().all()
        for rule in rules:
            if rule.end_date and date.today() > rule.end_date:
                continue
            source = await db.get(Task, rule.source_task_id) if rule.source_task_id else None
            if source is None:
                continue
            clone = Task(
                project_id=source.project_id,
                workspace_id=source.workspace_id,
                key=source.key,
                title=source.title,
                description=source.description,
                status="todo",
                priority=source.priority,
                assignee_id=source.assignee_id,
                reporter_id=source.reporter_id,
                due_date=rule.next_run_at.date() if rule.next_run_at else None,
                is_recurring=True,
                recurring_rule_id=rule.id,
            )
            db.add(clone)
            created += 1

            interval_days = {"daily": 1, "weekly": 7, "monthly": 30}.get(rule.frequency, 1) * rule.interval
            rule.next_run_at = now + timedelta(days=interval_days)
        await db.commit()
    return created


@celery_app.task(name="app.tasks.jobs.generate_recurring_tasks")
def generate_recurring_tasks() -> int:
    return _run(_generate_recurring_tasks_async())


async def _deadline_reminders_async() -> int:
    from app.models.activity import Notification
    from app.models.task import Task

    notified = 0
    async with AsyncSessionLocal() as db:
        now = datetime.now(UTC)
        soon = (now + timedelta(hours=24)).date()
        stmt = select(Task).where(
            Task.due_date.is_not(None),
            Task.due_date <= soon,
            Task.status.notin_(["done", "cancelled"]),
            Task.assignee_id.is_not(None),
        )
        tasks = (await db.execute(stmt)).scalars().all()
        for task in tasks:
            db.add(
                Notification(
                    user_id=task.assignee_id,
                    type="deadline",
                    title="یادآوری موعد انجام وظیفه",
                    body=f'وظیفه «{task.title}» تا تاریخ {task.due_date} باید تکمیل شود.',
                    entity_type="task",
                    entity_id=task.id,
                    read=False,
                )
            )
            notified += 1
        await db.commit()
    return notified


@celery_app.task(name="app.tasks.jobs.deadline_reminders")
def deadline_reminders() -> int:
    return _run(_deadline_reminders_async())


async def _cleanup_expired_tokens_async() -> dict[str, int]:
    from app.models.user import EmailVerificationToken, PasswordResetToken, UserSession

    now = datetime.now(UTC)
    async with AsyncSessionLocal() as db:
        removed: dict[str, int] = {}
        for model, name in (
            (EmailVerificationToken, "email_verification_tokens"),
            (PasswordResetToken, "password_reset_tokens"),
        ):
            stmt = select(model).where(model.expires_at < now)
            rows = (await db.execute(stmt)).scalars().all()
            for row in rows:
                await db.delete(row)
            removed[name] = len(rows)

        stmt = select(UserSession).where(UserSession.expires_at < now, UserSession.revoked_at.is_(None))
        rows = (await db.execute(stmt)).scalars().all()
        for row in rows:
            row.revoked_at = now
        removed["user_sessions_revoked"] = len(rows)

        await db.commit()
        return removed


@celery_app.task(name="app.tasks.jobs.cleanup_expired_tokens")
def cleanup_expired_tokens() -> dict[str, int]:
    return _run(_cleanup_expired_tokens_async())


async def _process_file_async(file_id: str) -> dict[str, Any]:
    from app.models.file import FileObject

    async with AsyncSessionLocal() as db:
        file_obj = await db.get(FileObject, UUID(file_id))
        if file_obj is None:
            return {"status": "missing"}
        # Placeholder hook for thumbnailing / metadata extraction / malware scan.
        return {"status": "processed", "mimeType": file_obj.mime_type, "sizeBytes": file_obj.size_bytes}


@celery_app.task(name="app.tasks.jobs.process_file")
def process_file(file_id: str) -> dict[str, Any]:
    return _run(_process_file_async(file_id))
