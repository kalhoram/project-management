"""Deterministic UUIDs for demo seed data (maps mock IDs like ws-1 → stable UUID)."""

from __future__ import annotations

import uuid

_NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")


def seed_id(label: str) -> uuid.UUID:
    return uuid.uuid5(_NS, f"yadbox.{label}")
