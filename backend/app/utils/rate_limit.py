"""Redis-backed rate limiter with in-memory fallback for local dev/test."""

from __future__ import annotations

import asyncio
import time
from collections import defaultdict
from dataclasses import dataclass, field

from fastapi import Request

from app.core.config import get_settings
from app.core.exceptions import RateLimitError

_MEMORY_BUCKETS: dict[str, list[float]] = defaultdict(list)
_MEMORY_LOCK = asyncio.Lock()


@dataclass
class RateLimitResult:
    allowed: bool
    retry_after_seconds: int = 0


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _build_key(scope: str, request: Request, *, suffix: str = "") -> str:
    ip = _client_ip(request)
    suffix_part = f":{suffix}" if suffix else ""
    return f"rl:{scope}:{ip}{suffix_part}"


async def _check_memory(key: str, limit: int, window_seconds: int) -> RateLimitResult:
    now = time.monotonic()
    cutoff = now - window_seconds
    async with _MEMORY_LOCK:
        bucket = _MEMORY_BUCKETS[key]
        _MEMORY_BUCKETS[key] = [ts for ts in bucket if ts > cutoff]
        if len(_MEMORY_BUCKETS[key]) >= limit:
            oldest = min(_MEMORY_BUCKETS[key]) if _MEMORY_BUCKETS[key] else now
            retry_after = max(1, int(window_seconds - (now - oldest)))
            return RateLimitResult(allowed=False, retry_after_seconds=retry_after)
        _MEMORY_BUCKETS[key].append(now)
    return RateLimitResult(allowed=True)


async def _check_redis(key: str, limit: int, window_seconds: int) -> RateLimitResult | None:
    settings = get_settings()
    if not settings.redis_url:
        return None
    try:
        import redis.asyncio as aioredis

        client = aioredis.from_url(settings.redis_url, decode_responses=True)
        try:
            count = await client.incr(key)
            if count == 1:
                await client.expire(key, window_seconds)
            if count > limit:
                ttl = await client.ttl(key)
                retry_after = max(1, int(ttl)) if ttl and ttl > 0 else window_seconds
                return RateLimitResult(allowed=False, retry_after_seconds=retry_after)
            return RateLimitResult(allowed=True)
        finally:
            await client.aclose()
    except Exception:
        return None


async def enforce_rate_limit(request: Request, *, scope: str, suffix: str = "") -> None:
    settings = get_settings()
    key = _build_key(scope, request, suffix=suffix)
    limit = settings.rate_limit_login
    window = settings.rate_limit_window_seconds

    result = await _check_redis(key, limit, window)
    if result is None:
        result = await _check_memory(key, limit, window)

    if not result.allowed:
        raise RateLimitError(retry_after_seconds=result.retry_after_seconds)


def reset_memory_rate_limits() -> None:
    """Test helper — clears in-memory buckets."""
    _MEMORY_BUCKETS.clear()
