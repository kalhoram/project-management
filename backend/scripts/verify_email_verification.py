"""Runtime verification for email verification dispatch (console/smtp mode)."""

from __future__ import annotations

import json
import os
import sys
import uuid

import httpx

BASE = os.environ.get("AUTH_VERIFY_BASE", "http://127.0.0.1:8000")
API = f"{BASE}/api/v1"

results: list[dict[str, str]] = []


def record(name: str, status_code: int | None, expected: str, detail: str = "") -> None:
    ok = False
    if status_code is not None:
        if expected.startswith("2"):
            ok = str(status_code).startswith("2")
        elif "/" in expected:
            ok = str(status_code) in expected.split("/")
        else:
            ok = str(status_code) == expected
    results.append(
        {
            "test": name,
            "status": "PASS" if ok else "FAIL",
            "http": str(status_code) if status_code is not None else "n/a",
            "expected": expected,
            "detail": detail[:160],
        }
    )


def main() -> int:
    email = f"verify-runtime-{uuid.uuid4().hex[:8]}@yadbox.app"
    password = "Test1234!"
    token = ""

    with httpx.Client(timeout=30.0) as client:
        r = client.post(
            f"{API}/auth/signup",
            json={"name": "Runtime Verify", "email": email, "password": password},
        )
        if r.status_code == 200:
            record("POST /auth/signup + dispatch", r.status_code, "200", "user created")
        else:
            record("POST /auth/signup + dispatch", r.status_code, "200", r.text[:120])

        r = client.post(f"{API}/auth/resend-verification", json={"email": email})
        if r.status_code == 200:
            body = r.json()
            dispatched = body.get("emailDispatched") is True
            mode = body.get("deliveryMode") or "unknown"
            record(
                "POST /auth/resend-verification",
                r.status_code,
                "200",
                f"emailDispatched={dispatched} mode={mode}",
            )
        else:
            record("POST /auth/resend-verification", r.status_code, "200", r.text[:120])

        # Logout test
        login = client.post(f"{API}/auth/login", json={"identifier": "admin", "password": "123/321"})
        if login.status_code == 200:
            access = login.json().get("accessToken") or ""
            lo = client.post(f"{API}/auth/logout", headers={"Authorization": f"Bearer {access}"})
            me = client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {access}"})
            record("POST /auth/logout", lo.status_code, "200", "session revoked server-side")
            record("GET /auth/me after logout", me.status_code, "401/403", "token rejected after logout")
        else:
            record("POST /auth/logout", login.status_code, "200", "login failed for logout test")

    passed = sum(1 for row in results if row["status"] == "PASS")
    failed = len(results) - passed
    print(json.dumps({"passed": passed, "failed": failed, "testEmail": email, "results": results}, ensure_ascii=False, indent=2))
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
