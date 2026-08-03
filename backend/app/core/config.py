from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

UNSAFE_JWT_SECRETS: frozenset[str] = frozenset(
    {
        "change-me-in-production-yadbox-secret-key-32chars",
        "dev-change-me-yadbox-jwt-secret-key-32chars-min",
    }
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "یادباکس API"
    app_env: Literal["local", "development", "staging", "production"] = "local"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
    frontend_url: str = "http://localhost:3000"

    database_url: str = "postgresql+asyncpg://yadbox:yadbox@localhost:5432/yadbox"
    database_url_sync: str = "postgresql://yadbox:yadbox@localhost:5432/yadbox"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str = "change-me-in-production-yadbox-secret-key-32chars"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    password_min_length: int = 8
    default_timezone: str = "Asia/Tehran"
    default_locale: str = "fa"

    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "yadbox"
    minio_secure: bool = False
    s3_endpoint_url: str | None = None
    max_upload_mb: int = 50

    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "یادباکس <noreply@yadbox.local>"
    email_enabled: bool = False

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:3000/auth/google"

    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    rate_limit_login: int = 10
    rate_limit_window_seconds: int = 60

    sentry_dsn: str = ""
    maintenance_mode: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        if self.app_env == "production":
            if self.jwt_secret in UNSAFE_JWT_SECRETS or len(self.jwt_secret) < 32:
                raise ValueError(
                    "JWT_SECRET باید در محیط production مقدار امن و حداقل ۳۲ کاراکتری داشته باشد. "
                    "با `openssl rand -hex 32` یک کلید تولید کنید."
                )
        return self


def validate_jwt_secret_for_boot(settings: Settings) -> None:
    """Fail fast at application startup in production when JWT secret is unsafe."""
    if settings.app_env == "production" and (
        settings.jwt_secret in UNSAFE_JWT_SECRETS or len(settings.jwt_secret) < 32
    ):
        raise RuntimeError(
            "JWT_SECRET in production must be a secure value (min 32 chars). "
            "Generate one with: openssl rand -hex 32"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
