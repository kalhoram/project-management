"""Runtime JWT/auth verification — prints PASS/FAIL summary (no token values logged)."""

from __future__ import annotations

import json
import os
import sys

import httpx

BASE = os.environ.get("AUTH_VERIFY_BASE", "http://127.0.0.1:8000")
API = f"{BASE}/api/v1"

DEMO_EMAIL = os.environ.get("DEMO_EMAIL", "demo@yadbox.app")
DEMO_PASSWORD = os.environ.get("DEMO_PASSWORD", "Demo1234!")
WRONG_PASSWORD = "definitely-wrong-password-xyz"

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
            "detail": detail[:120],
        }
    )


def main() -> int:
    with httpx.Client(timeout=30.0) as client:
        r = client.get(f"{BASE}/health")
        record("GET /health", r.status_code, "200")

        r = client.get(f"{BASE}/ready")
        record("GET /ready", r.status_code, "200")

        r = client.get(f"{BASE}/openapi.json")
        record("GET /openapi.json", r.status_code, "200")

        r = client.post(
            f"{API}/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
        )
        token_received = False
        access_token = ""
        refresh_token = ""
        if r.status_code == 200:
            data = r.json()
            access_token = data.get("accessToken") or data.get("access_token") or ""
            refresh_token = data.get("refreshToken") or data.get("refresh_token") or ""
            token_received = bool(access_token)
            user = data.get("user") or {}
            has_hash = "password" in json.dumps(data).lower() and "passwordHash" in json.dumps(data)
            record(
                "POST /auth/login valid",
                r.status_code,
                "200",
                f"token={'yes' if token_received else 'no'} user={user.get('email', '?')}",
            )
            if has_hash:
                record("login response leak check", r.status_code, "401", "password hash in body")
        else:
            record("POST /auth/login valid", r.status_code, "200", r.text[:120])

        headers = {"Authorization": f"Bearer {access_token}"} if access_token else {}
        r = client.get(f"{API}/auth/me", headers=headers)
        record("GET /auth/me with token", r.status_code, "200")
        if r.status_code == 200:
            me = r.json()
            if me.get("email") != DEMO_EMAIL:
                record("GET /auth/me identity", r.status_code, "401", f"expected {DEMO_EMAIL}")

        r = client.get(f"{API}/auth/me")
        record("GET /auth/me without token", r.status_code, "401/403")

        r = client.get(
            f"{API}/auth/me",
            headers={"Authorization": "Bearer invalid.token.value"},
        )
        record("GET /auth/me invalid token", r.status_code, "401/403")

        r = client.post(
            f"{API}/auth/login",
            json={"email": DEMO_EMAIL, "password": WRONG_PASSWORD},
        )
        wrong_body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
        wrong_token = wrong_body.get("accessToken") or wrong_body.get("access_token")
        record(
            "POST /auth/login wrong password",
            r.status_code,
            "400/401",
            "no token" if not wrong_token else "token leaked",
        )

        if refresh_token:
            r = client.post(f"{API}/auth/refresh", json={"refreshToken": refresh_token})
            record("POST /auth/refresh valid", r.status_code, "200")
            r = client.post(f"{API}/auth/refresh", json={"refreshToken": "invalid.refresh.token"})
            record("POST /auth/refresh invalid", r.status_code, "401/403")

    passed = sum(1 for row in results if row["status"] == "PASS")
    failed = len(results) - passed
    summary = {
        "passed": passed,
        "failed": failed,
        "tokenReceived": token_received,
        "demoEmail": DEMO_EMAIL,
        "results": results,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
