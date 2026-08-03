from __future__ import annotations


from app.permissions.rbac import ROLE_PERMISSIONS, has_permission
from app.utils.persian import contains_normalized, normalize_persian


def test_normalize_persian_yeh_kaf() -> None:
    assert normalize_persian("كتاب") == normalize_persian("کتاب")
    assert normalize_persian("علي") == normalize_persian("علی")


def test_contains_normalized() -> None:
    assert contains_normalized("طراحی API", "api")
    assert contains_normalized("یادباکس", "یاد")


def test_owner_has_billing() -> None:
    assert has_permission("owner", "billing.manage")


def test_admin_no_billing() -> None:
    assert not has_permission("admin", "billing.manage")
    assert has_permission("admin", "projects.manage")


def test_member_permissions() -> None:
    perms = ROLE_PERMISSIONS["member"]
    assert "tasks.create" in perms
    assert "billing.manage" not in perms
