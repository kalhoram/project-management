from __future__ import annotations

from typing import Any

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import DBAPIError, OperationalError
from starlette.exceptions import HTTPException as StarletteHTTPException

_DATABASE_UNAVAILABLE_MESSAGE = (
    "سرویس پایگاه داده در حال حاضر در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید."
)


class AppError(Exception):
    def __init__(
        self,
        message: str,
        *,
        code: str = "APP_ERROR",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, message: str = "مورد درخواستی یافت نشد.", *, code: str = "NOT_FOUND") -> None:
        super().__init__(message, code=code, status_code=status.HTTP_404_NOT_FOUND)


class AuthError(AppError):
    def __init__(
        self,
        message: str = "احراز هویت نامعتبر است.",
        *,
        code: str = "AUTH_INVALID",
    ) -> None:
        super().__init__(message, code=code, status_code=status.HTTP_401_UNAUTHORIZED)


class PermissionDeniedError(AppError):
    def __init__(
        self,
        message: str = "شما اجازه انجام این عملیات را ندارید.",
        *,
        code: str = "PERMISSION_DENIED",
    ) -> None:
        super().__init__(message, code=code, status_code=status.HTTP_403_FORBIDDEN)


class ConflictError(AppError):
    def __init__(self, message: str = "تعارض در داده‌ها.", *, code: str = "CONFLICT") -> None:
        super().__init__(message, code=code, status_code=status.HTTP_409_CONFLICT)


class RateLimitError(AppError):
    def __init__(
        self,
        message: str = "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد تلاش کنید.",
        *,
        retry_after_seconds: int | None = None,
    ) -> None:
        details: dict[str, Any] = {}
        if retry_after_seconds is not None:
            details["retry_after_seconds"] = retry_after_seconds
        super().__init__(
            message,
            code="RATE_LIMIT_EXCEEDED",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details=details,
        )


def error_body(
    code: str,
    message: str,
    details: dict[str, Any] | None = None,
    *,
    request_id: str | None = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {"success": False, "code": code, "message": message, "details": details or {}}
    if request_id:
        body["requestId"] = request_id
    return body


def _request_id_from(request: Request) -> str | None:
    return getattr(getattr(request, "state", None), "request_id", None)


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    headers: dict[str, str] = {}
    if exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS and exc.details.get("retry_after_seconds"):
        headers["Retry-After"] = str(exc.details["retry_after_seconds"])
    return JSONResponse(
        status_code=exc.status_code,
        content=error_body(exc.code, exc.message, exc.details, request_id=_request_id_from(request)),
        headers=headers,
    )


def _is_database_connectivity_error(exc: BaseException) -> bool:
    if isinstance(exc, ConnectionRefusedError | TimeoutError):
        return True
    if isinstance(exc, OperationalError | DBAPIError):
        return True
    cause = getattr(exc, "__cause__", None) or getattr(exc, "orig", None)
    if cause is not None and cause is not exc:
        return _is_database_connectivity_error(cause)
    return False


async def database_error_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content=error_body(
            "DATABASE_UNAVAILABLE",
            _DATABASE_UNAVAILABLE_MESSAGE,
            request_id=_request_id_from(request),
        ),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    if _is_database_connectivity_error(exc):
        return await database_error_handler(request, exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_body(
            "INTERNAL_ERROR",
            "خطای داخلی سرور رخ داد.",
            request_id=_request_id_from(request),
        ),
    )


async def http_error_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    message = exc.detail if isinstance(exc.detail, str) else "خطای درخواست"
    code = "HTTP_ERROR"
    if exc.status_code == 401:
        code = "AUTH_REQUIRED"
        message = message if isinstance(exc.detail, str) else "ورود به سیستم الزامی است."
    elif exc.status_code == 403:
        code = "PERMISSION_DENIED"
    elif exc.status_code == 404:
        code = "NOT_FOUND"
        message = message if isinstance(exc.detail, str) else "مورد درخواستی یافت نشد."
    elif exc.status_code == 503:
        code = "MAINTENANCE"
    return JSONResponse(
        status_code=exc.status_code,
        content=error_body(code, str(message), request_id=_request_id_from(request)),
    )


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    details: dict[str, Any] = {"errors": []}
    for err in exc.errors():
        loc = ".".join(str(x) for x in err.get("loc", []) if x != "body")
        details["errors"].append({"field": loc, "message": err.get("msg"), "type": err.get("type")})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_body(
            "VALIDATION_ERROR",
            "اطلاعات ارسال‌شده نامعتبر است. لطفاً فیلدها را بررسی کنید.",
            details,
            request_id=_request_id_from(request),
        ),
    )
