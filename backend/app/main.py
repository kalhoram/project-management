from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import DBAPIError, OperationalError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.router import api_router
from app.core.config import get_settings, validate_jwt_secret_for_boot
from app.core.exceptions import (
    AppError,
    app_error_handler,
    database_error_handler,
    error_body,
    http_error_handler,
    unhandled_exception_handler,
    validation_error_handler,
)
from app.core.logging import setup_logging
from app.core.readiness import check_readiness
from app.middleware.maintenance import MaintenanceMiddleware
from app.middleware.request_id import RequestIdMiddleware
from app.ws.routes import router as ws_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    setup_logging()
    validate_jwt_secret_for_boot(get_settings())
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(MaintenanceMiddleware)

    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(OperationalError, database_error_handler)
    app.add_exception_handler(DBAPIError, database_error_handler)
    app.add_exception_handler(ConnectionRefusedError, database_error_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)

    @app.get("/health")
    async def health() -> dict:
        return {"status": "ok", "service": "yadbox-api"}

    @app.get("/ready")
    async def ready(request: Request):
        is_ready, components = await check_readiness()
        request_id = getattr(request.state, "request_id", None)
        if is_ready:
            body: dict = {"success": True, "status": "ready", "components": components}
            if request_id:
                body["requestId"] = request_id
            return body
        content = {
            **error_body(
                "SERVICE_NOT_READY",
                "برخی سرویس‌های موردنیاز در دسترس نیستند.",
                details={"components": components},
                request_id=request_id,
            ),
            "status": "not_ready",
            "components": components,
        }
        return JSONResponse(status_code=503, content=content)

    app.include_router(api_router, prefix=settings.api_v1_prefix)
    app.include_router(ws_router)

    return app


app = create_app()
