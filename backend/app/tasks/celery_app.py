"""Celery application factory for background jobs (email, fanout, exports, recurring tasks)."""

from __future__ import annotations

from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "yadbox",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks.jobs"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone=settings.default_timezone,
    enable_utc=True,
    task_track_started=True,
    task_time_limit=15 * 60,
    beat_schedule={
        "generate-recurring-tasks-daily": {
            "task": "app.tasks.jobs.generate_recurring_tasks",
            "schedule": 24 * 60 * 60,
        },
        "deadline-reminders-hourly": {
            "task": "app.tasks.jobs.deadline_reminders",
            "schedule": 60 * 60,
        },
        "cleanup-expired-tokens-daily": {
            "task": "app.tasks.jobs.cleanup_expired_tokens",
            "schedule": 24 * 60 * 60,
        },
    },
)
