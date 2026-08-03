"""Aggregate all v1 API route modules."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.routes import (
    admin,
    advanced,
    auth,
    billing,
    files,
    notifications,
    onboarding,
    projects,
    reports,
    saved_filters,
    search,
    settings as settings_routes,
    tasks,
    views,
    workspaces,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(onboarding.router)
api_router.include_router(workspaces.router)
api_router.include_router(projects.router)
api_router.include_router(tasks.router)
api_router.include_router(views.router)
api_router.include_router(files.router)
api_router.include_router(notifications.router)
api_router.include_router(search.router)
api_router.include_router(reports.router)
api_router.include_router(advanced.router)
api_router.include_router(billing.router)
api_router.include_router(admin.router)
api_router.include_router(settings_routes.router)
api_router.include_router(saved_filters.router)
