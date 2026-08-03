"""Object storage abstraction: local filesystem (dev) or MinIO/S3 (prod).

`StorageBackend` is a small protocol so `file_service` never has to know
whether bytes end up on disk or in a bucket. Selection is driven by
`Settings.s3_endpoint_url` / `Settings.minio_endpoint`: when boto3 talks
successfully to an endpoint we use `MinioStorage`, otherwise `LocalStorage`
writes under `backend/uploads/`.
"""

from __future__ import annotations

import asyncio
import uuid
from pathlib import Path
from typing import Protocol, runtime_checkable

from app.core.config import get_settings

_UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"


@runtime_checkable
class StorageBackend(Protocol):
    """Minimal storage contract used by `app.services.file_service`."""

    async def save(self, key: str, data: bytes, *, content_type: str | None = None) -> None: ...

    async def read(self, key: str) -> bytes: ...

    async def delete(self, key: str) -> None: ...

    def url(self, key: str) -> str: ...

    def build_key(self, workspace_id: str, filename: str) -> str: ...


class LocalStorage:
    """Writes bytes under `backend/uploads/<key>` on the local filesystem."""

    def __init__(self, base_dir: Path = _UPLOADS_DIR) -> None:
        self.base_dir = base_dir
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def build_key(self, workspace_id: str, filename: str) -> str:
        safe_name = filename.replace("/", "_").replace("\\", "_")
        return f"{workspace_id}/{uuid.uuid4().hex}-{safe_name}"

    def _path(self, key: str) -> Path:
        path = (self.base_dir / key).resolve()
        if self.base_dir.resolve() not in path.parents and path != self.base_dir.resolve():
            raise ValueError("مسیر فایل نامعتبر است.")
        return path

    async def save(self, key: str, data: bytes, *, content_type: str | None = None) -> None:
        path = self._path(key)

        def _write() -> None:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)

        await asyncio.to_thread(_write)

    async def read(self, key: str) -> bytes:
        path = self._path(key)
        return await asyncio.to_thread(path.read_bytes)

    async def delete(self, key: str) -> None:
        path = self._path(key)

        def _remove() -> None:
            if path.exists():
                path.unlink()

        await asyncio.to_thread(_remove)

    def url(self, key: str) -> str:
        return f"/uploads/{key}"


class MinioStorage:
    """S3-compatible storage backed by MinIO (or any S3 endpoint) via boto3."""

    def __init__(self) -> None:
        settings = get_settings()
        self._bucket = settings.minio_bucket
        self._endpoint = settings.s3_endpoint_url or (
            f"{'https' if settings.minio_secure else 'http'}://{settings.minio_endpoint}"
        )
        self._access_key = settings.minio_access_key
        self._secret_key = settings.minio_secure and settings.minio_secret_key or settings.minio_secret_key
        self._client = None

    def _get_client(self):
        if self._client is None:
            import boto3

            self._client = boto3.client(
                "s3",
                endpoint_url=self._endpoint,
                aws_access_key_id=self._access_key,
                aws_secret_access_key=self._secret_key,
            )
            try:
                self._client.head_bucket(Bucket=self._bucket)
            except Exception:
                self._client.create_bucket(Bucket=self._bucket)
        return self._client

    def build_key(self, workspace_id: str, filename: str) -> str:
        safe_name = filename.replace("/", "_").replace("\\", "_")
        return f"{workspace_id}/{uuid.uuid4().hex}-{safe_name}"

    async def save(self, key: str, data: bytes, *, content_type: str | None = None) -> None:
        def _put() -> None:
            client = self._get_client()
            extra = {"ContentType": content_type} if content_type else {}
            client.put_object(Bucket=self._bucket, Key=key, Body=data, **extra)

        await asyncio.to_thread(_put)

    async def read(self, key: str) -> bytes:
        def _get() -> bytes:
            client = self._get_client()
            obj = client.get_object(Bucket=self._bucket, Key=key)
            return obj["Body"].read()

        return await asyncio.to_thread(_get)

    async def delete(self, key: str) -> None:
        def _delete() -> None:
            client = self._get_client()
            client.delete_object(Bucket=self._bucket, Key=key)

        await asyncio.to_thread(_delete)

    def url(self, key: str) -> str:
        settings = get_settings()
        return f"{self._endpoint}/{settings.minio_bucket}/{key}"


_storage_instance: StorageBackend | None = None


def get_storage() -> StorageBackend:
    """Return the process-wide storage backend, selected from settings.

    Falls back to `LocalStorage` whenever MinIO/S3 isn't configured, so the
    API keeps working out of the box for local development and tests.
    """
    global _storage_instance
    if _storage_instance is not None:
        return _storage_instance

    settings = get_settings()
    if settings.s3_endpoint_url or settings.app_env in ("staging", "production"):
        try:
            _storage_instance = MinioStorage()
        except Exception:
            _storage_instance = LocalStorage()
    else:
        _storage_instance = LocalStorage()
    return _storage_instance
