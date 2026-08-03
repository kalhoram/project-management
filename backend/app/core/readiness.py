"""Runtime dependency probes for the `/ready` endpoint."""

from __future__ import annotations

import asyncio
from typing import Literal

from sqlalchemy import text

from app.core.config import Settings, get_settings
from app.db.session import engine

ComponentStatus = Literal["ok", "unavailable", "not_configured", "optional"]

_PROBE_TIMEOUT_SECONDS = 2.0


async def _probe_database() -> ComponentStatus:
    try:
        async with asyncio.timeout(_PROBE_TIMEOUT_SECONDS):
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
        return "ok"
    except Exception:
        return "unavailable"


async def _probe_redis(settings: Settings) -> ComponentStatus:
    if not settings.redis_url:
        return "not_configured"
    try:
        import redis.asyncio as aioredis

        async with asyncio.timeout(_PROBE_TIMEOUT_SECONDS):
            client = aioredis.from_url(settings.redis_url, decode_responses=True)
            try:
                pong = await client.ping()
                return "ok" if pong else "unavailable"
            finally:
                await client.aclose()
    except Exception:
        return "unavailable"


async def _probe_storage(settings: Settings) -> ComponentStatus:
    if settings.s3_endpoint_url:
        try:
            import boto3
            from botocore.config import Config

            async with asyncio.timeout(_PROBE_TIMEOUT_SECONDS):
                client = boto3.client(
                    "s3",
                    endpoint_url=settings.s3_endpoint_url,
                    aws_access_key_id=settings.minio_access_key,
                    aws_secret_access_key=settings.minio_secret_key,
                    config=Config(connect_timeout=2, read_timeout=2, retries={"max_attempts": 1}),
                )
                await asyncio.to_thread(client.head_bucket, Bucket=settings.minio_bucket)
            return "ok"
        except Exception:
            return "unavailable"

    if settings.minio_endpoint and settings.app_env in {"staging", "production"}:
        try:
            import boto3
            from botocore.config import Config

            scheme = "https" if settings.minio_secure else "http"
            endpoint = f"{scheme}://{settings.minio_endpoint}"
            async with asyncio.timeout(_PROBE_TIMEOUT_SECONDS):
                client = boto3.client(
                    "s3",
                    endpoint_url=endpoint,
                    aws_access_key_id=settings.minio_access_key,
                    aws_secret_access_key=settings.minio_secret_key,
                    config=Config(connect_timeout=2, read_timeout=2, retries={"max_attempts": 1}),
                )
                await asyncio.to_thread(client.head_bucket, Bucket=settings.minio_bucket)
            return "ok"
        except Exception:
            return "unavailable"

    return "optional"


async def check_readiness() -> tuple[bool, dict[str, ComponentStatus]]:
    settings = get_settings()
    db_status, redis_status, storage_status = await asyncio.gather(
        _probe_database(),
        _probe_redis(settings),
        _probe_storage(settings),
    )
    components: dict[str, ComponentStatus] = {
        "database": db_status,
        "redis": redis_status,
        "storage": storage_status,
    }
    required_ok = db_status == "ok" and redis_status in {"ok", "not_configured"}
    if settings.app_env in {"staging", "production"} and redis_status == "unavailable":
        required_ok = False
    if settings.app_env in {"staging", "production"} and storage_status == "unavailable":
        required_ok = False
    return required_ok, components
