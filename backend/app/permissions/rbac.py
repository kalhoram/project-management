"""Role-based access control matching lib/permissions.ts (source of truth on the frontend).

Keep `ROLE_PERMISSIONS` and the permission key constants in sync with
`lib/permissions.ts` and `lib/mock/data.ts` (`mockPermissions`).
"""

from __future__ import annotations

from app.schemas.enums import WorkspaceRole

PERM_WORKSPACE_MANAGE = "workspace.manage"
PERM_MEMBERS_INVITE = "members.invite"
PERM_MEMBERS_MANAGE = "members.manage"
PERM_PROJECTS_CREATE = "projects.create"
PERM_PROJECTS_MANAGE = "projects.manage"
PERM_TASKS_CREATE = "tasks.create"
PERM_TASKS_DELETE = "tasks.delete"
PERM_BILLING_MANAGE = "billing.manage"
PERM_REPORTS_VIEW = "reports.view"
PERM_FILES_UPLOAD = "files.upload"

ALL_PERMISSION_KEYS: list[str] = [
    PERM_WORKSPACE_MANAGE,
    PERM_MEMBERS_INVITE,
    PERM_MEMBERS_MANAGE,
    PERM_PROJECTS_CREATE,
    PERM_PROJECTS_MANAGE,
    PERM_TASKS_CREATE,
    PERM_TASKS_DELETE,
    PERM_BILLING_MANAGE,
    PERM_REPORTS_VIEW,
    PERM_FILES_UPLOAD,
]

_NON_BILLING_KEYS = [k for k in ALL_PERMISSION_KEYS if k != PERM_BILLING_MANAGE]

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "owner": list(ALL_PERMISSION_KEYS),
    "admin": list(_NON_BILLING_KEYS),
    "member": [
        PERM_PROJECTS_CREATE,
        PERM_TASKS_CREATE,
        PERM_REPORTS_VIEW,
        PERM_FILES_UPLOAD,
    ],
    "guest": [],
    "viewer": [PERM_REPORTS_VIEW],
}


def get_permissions_for_role(role: WorkspaceRole | str | None) -> list[str]:
    if not role:
        return []
    return ROLE_PERMISSIONS.get(role, [])


def has_permission(role: WorkspaceRole | str | None, permission_key: str) -> bool:
    return permission_key in get_permissions_for_role(role)


def has_any_permission(role: WorkspaceRole | str | None, permission_keys: list[str]) -> bool:
    if not permission_keys:
        return True
    granted = set(get_permissions_for_role(role))
    return any(key in granted for key in permission_keys)
