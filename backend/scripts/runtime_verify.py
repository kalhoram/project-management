"""Runtime verification harness — outputs sanitized JSON only (no secrets)."""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone

import httpx

BASE = os.environ.get("RUNTIME_VERIFY_BASE", "http://127.0.0.1:8000")
API = f"{BASE}/api/v1"

WS_ID = "326613e1-f483-5194-9a8a-fd95e5560352"
PROJ_ID = "98a5a175-72f0-514e-9ca3-bd9ae2a019d8"
TASK_ID = "9b772af7-2652-5474-b357-ef6dc27a137d"
LABEL = f"runtime-verify-{int(time.time())}"


def summarize(resp: httpx.Response) -> dict:
    out: dict = {"status": resp.status_code}
    try:
        data = resp.json()
    except Exception:
        out["body"] = resp.text[:200]
        return out
    if isinstance(data, dict):
        out["code"] = data.get("code")
        out["success"] = data.get("success")
        out["message"] = (data.get("message") or "")[:120]
        out["keys"] = sorted(data.keys())[:12]
        if "components" in data:
            out["components"] = data["components"]
        if "user" in data and isinstance(data["user"], dict):
            out["userId"] = data["user"].get("id")
            out["userEmail"] = data["user"].get("email")
        if "accessToken" in data:
            out["hasAccessToken"] = bool(data["accessToken"])
        if "refreshToken" in data:
            out["hasRefreshToken"] = bool(data["refreshToken"])
        if "id" in data:
            out["id"] = data["id"]
        if "items" in data:
            out["itemCount"] = len(data["items"])
        if isinstance(data.get("items"), list) and data["items"]:
            out["firstItemId"] = data["items"][0].get("id")
    elif isinstance(data, list):
        out["listCount"] = len(data)
        if data and isinstance(data[0], dict):
            out["firstId"] = data[0].get("id")
    return out


def main() -> int:
    results: dict = {"timestamp": datetime.now(timezone.utc).isoformat(), "tests": []}

    def record(name: str, resp: httpx.Response, verdict: str) -> None:
        results["tests"].append({"name": name, "verdict": verdict, **summarize(resp)})

    tokens: dict[str, str] = {}

    with httpx.Client(timeout=30.0) as client:
        # Core HTTP
        for path in ["/health", "/ready", "/docs", "/openapi.json"]:
            r = client.get(f"{BASE}{path}")
            v = "PASS" if r.status_code == 200 else "FAIL"
            if path == "/ready" and r.status_code == 200:
                v = "PASS"
            record(f"GET {path}", r, v)

        o = client.get(f"{BASE}/openapi.json").json()
        results["openapiPathCount"] = len(o.get("paths", {}))

        # Auth negative
        r = client.get(f"{API}/auth/me")
        record("GET /auth/me no token", r, "PASS" if r.status_code == 401 else "FAIL")
        r = client.post(f"{API}/auth/login", json={})
        record("POST /auth/login empty", r, "PASS" if r.status_code == 422 else "FAIL")
        r = client.post(f"{API}/auth/login", json={"email": "owner@yadbox.app", "password": "wrong-password-xyz"})
        record("POST /auth/login wrong password", r, "PASS" if r.status_code == 401 else "FAIL")
        r = client.post(f"{API}/auth/login", json={"email": "nobody-runtime@test.local", "password": "x"})
        record("POST /auth/login unknown user", r, "PASS" if r.status_code == 401 else "FAIL")

        # Login email form
        r = client.post(f"{API}/auth/login", json={"email": "owner@yadbox.app", "password": "demo"})
        record("POST /auth/login email valid", r, "PASS" if r.status_code == 200 and r.json().get("accessToken") else "FAIL")
        if r.status_code == 200:
            data = r.json()
            tokens["owner_access"] = data["accessToken"]
            tokens["owner_refresh"] = data["refreshToken"]

        # Login identifier form
        r2 = client.post(f"{API}/auth/login", json={"identifier": "admin", "password": "123/321"})
        record("POST /auth/login identifier valid", r2, "PASS" if r2.status_code == 200 else "FAIL")
        if r2.status_code == 200:
            tokens["admin_access"] = r2.json()["accessToken"]
            tokens["admin_refresh"] = r2.json()["refreshToken"]

        # Guest login
        rg = client.post(f"{API}/auth/login", json={"email": "guest@yadbox.app", "password": "demo"})
        record("POST /auth/login guest", rg, "PASS" if rg.status_code == 200 else "FAIL")
        if rg.status_code == 200:
            tokens["guest_access"] = rg.json()["accessToken"]
            tokens["guest_refresh"] = rg.json()["refreshToken"]

        owner_h = {"Authorization": f"Bearer {tokens.get('owner_access', '')}"}
        admin_h = {"Authorization": f"Bearer {tokens.get('admin_access', '')}"}
        guest_h = {"Authorization": f"Bearer {tokens.get('guest_access', '')}"}

        # /auth/me
        r = client.get(f"{API}/auth/me", headers=owner_h)
        record("GET /auth/me owner", r, "PASS" if r.status_code == 200 and r.json().get("email") == "owner@yadbox.app" else "FAIL")

        # Refresh rotation
        old_refresh = tokens.get("owner_refresh", "")
        r = client.post(f"{API}/auth/refresh", json={"refreshToken": old_refresh})
        record("POST /auth/refresh", r, "PASS" if r.status_code == 200 and r.json().get("accessToken") else "FAIL")
        new_refresh = r.json().get("refreshToken") if r.status_code == 200 else ""
        new_access = r.json().get("accessToken") if r.status_code == 200 else tokens.get("owner_access", "")
        owner_h = {"Authorization": f"Bearer {new_access}"}

        r_old = client.post(f"{API}/auth/refresh", json={"refreshToken": old_refresh})
        record("POST /auth/refresh old token rejected", r_old, "PASS" if r_old.status_code == 401 else "FAIL")

        # Logout
        r = client.post(f"{API}/auth/logout", headers=owner_h)
        record("POST /auth/logout", r, "PASS" if r.status_code == 200 else "FAIL")
        r_rev = client.post(f"{API}/auth/refresh", json={"refreshToken": new_refresh})
        record("POST /auth/refresh after logout rejected", r_rev, "PASS" if r_rev.status_code == 401 else "FAIL")

        # Re-login for smoke
        r = client.post(f"{API}/auth/login", json={"email": "owner@yadbox.app", "password": "demo"})
        tokens["owner_access"] = r.json().get("accessToken", "") if r.status_code == 200 else ""
        owner_h = {"Authorization": f"Bearer {tokens['owner_access']}"}

        # Invalid token
        r = client.get(f"{API}/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
        record("GET /auth/me invalid token", r, "PASS" if r.status_code == 401 else "FAIL")

        # Smoke flow
        r = client.get(f"{API}/workspaces", headers=owner_h)
        record("GET /workspaces", r, "PASS" if r.status_code == 200 and isinstance(r.json(), list) and len(r.json()) >= 1 else "FAIL")

        r = client.get(f"{API}/workspaces/{WS_ID}", headers=owner_h)
        record("GET /workspaces/{id}", r, "PASS" if r.status_code == 200 and r.json().get("slug") == "acme-product" else "FAIL")

        r = client.get(f"{API}/workspaces/{WS_ID}/projects", headers=owner_h)
        record("GET /workspaces/{id}/projects", r, "PASS" if r.status_code == 200 else "FAIL")

        r = client.get(f"{API}/projects/{PROJ_ID}", headers=owner_h)
        record("GET /projects/{id}", r, "PASS" if r.status_code == 200 else "FAIL")

        r = client.get(f"{API}/projects/{PROJ_ID}/kanban", headers=owner_h)
        record("GET /projects/{id}/kanban", r, "PASS" if r.status_code == 200 else "FAIL")

        r = client.get(f"{API}/tasks/{TASK_ID}", headers=owner_h)
        record("GET /tasks/{id}", r, "PASS" if r.status_code == 200 else "FAIL")

        task_payload = {"title": LABEL, "projectId": PROJ_ID, "status": "backlog"}
        r = client.post(f"{API}/tasks", headers=owner_h, json=task_payload)
        created_task_id = r.json().get("id") if r.status_code in (200, 201) else None
        record("POST /tasks create", r, "PASS" if r.status_code in (200, 201) else "FAIL")
        results["createdTaskId"] = created_task_id

        if created_task_id:
            r = client.patch(f"{API}/tasks/{created_task_id}", headers=owner_h, json={"title": LABEL + "-updated"})
            record("PATCH /tasks/{id}", r, "PASS" if r.status_code == 200 else "FAIL")

            r = client.post(f"{API}/tasks/{created_task_id}/comments", headers=owner_h, json={"body": "runtime verify comment"})
            comment_id = r.json().get("id") if r.status_code in (200, 201) else None
            record("POST /tasks/{id}/comments", r, "PASS" if r.status_code in (200, 201) else "FAIL")
            results["createdCommentId"] = comment_id

        r = client.get(f"{API}/notifications", headers=owner_h)
        record("GET /notifications", r, "PASS" if r.status_code == 200 else "FAIL")

        # Saved filters CRUD
        sf_payload = {"name": LABEL, "scope": "workspace", "workspaceId": WS_ID, "conditions": [], "visibility": "private"}
        r = client.post(f"{API}/saved-filters", headers=owner_h, json=sf_payload)
        sf_id = r.json().get("id") if r.status_code in (200, 201) else None
        record("POST /saved-filters", r, "PASS" if r.status_code in (200, 201) else "FAIL")
        results["createdSavedFilterId"] = sf_id

        if sf_id:
            r = client.get(f"{API}/saved-filters/{sf_id}", headers=owner_h)
            record("GET /saved-filters/{id}", r, "PASS" if r.status_code == 200 else "FAIL")
            r = client.patch(f"{API}/saved-filters/{sf_id}", headers=owner_h, json={"name": LABEL + "-upd"})
            record("PATCH /saved-filters/{id}", r, "PASS" if r.status_code == 200 else "FAIL")
            r = client.get(f"{API}/saved-filters?workspaceId={WS_ID}", headers=owner_h)
            record("GET /saved-filters list", r, "PASS" if r.status_code == 200 else "FAIL")

        # RBAC guest create project forbidden
        r = client.post(f"{API}/workspaces/{WS_ID}/projects", headers=guest_h, json={"name": LABEL, "workspaceId": WS_ID})
        record("POST /workspaces/{id}/projects guest", r, "PASS" if r.status_code == 403 else "FAIL")

        # Cross-workspace fake UUID
        fake_ws = "00000000-0000-0000-0000-000000000099"
        r = client.get(f"{API}/workspaces/{fake_ws}", headers=owner_h)
        record("GET /workspaces fake uuid isolation", r, "PASS" if r.status_code in (403, 404) else "FAIL")

        # Guest cannot read saved filter owned by owner (create owner filter first if needed)
        if sf_id:
            r = client.get(f"{API}/saved-filters/{sf_id}", headers=guest_h)
            record("GET /saved-filters cross-user private", r, "PASS" if r.status_code in (403, 404) else "FAIL")

        # File upload small test
        files = {"file": ("runtime-verify.txt", b"runtime verification content", "text/plain")}
        r = client.post(f"{API}/files/upload", headers=owner_h, files=files, data={"workspace_id": WS_ID})
        file_id = r.json().get("id") if r.status_code in (200, 201) else None
        record("POST /files/upload", r, "PASS" if r.status_code in (200, 201) else "FAIL")
        results["createdFileId"] = file_id

        if file_id:
            r = client.get(f"{API}/files/{file_id}", headers=owner_h)
            record("GET /files/{id}", r, "PASS" if r.status_code == 200 else "FAIL")
            r = client.get(f"{API}/files/{file_id}", headers=guest_h)
            record("GET /files/{id} guest access", r, "PASS" if r.status_code == 200 else "FAIL")

        # Rate limit probe (nonexistent user)
        rl_results = []
        for _ in range(12):
            rr = client.post(f"{API}/auth/login", json={"email": "ratelimit-same@test.local", "password": "x"})
            rl_results.append(rr.status_code)
        got_429 = 429 in rl_results
        record("POST /auth/login rate limit", httpx.Response(429 if got_429 else 200), "PASS" if got_429 else "PARTIAL")

        # Cleanup
        cleanup = []
        if sf_id:
            rd = client.delete(f"{API}/saved-filters/{sf_id}", headers=owner_h)
            cleanup.append({"delete_saved_filter": rd.status_code})
        if created_task_id:
            rd = client.delete(f"{API}/tasks/{created_task_id}", headers=owner_h)
            cleanup.append({"delete_task": rd.status_code})
        if file_id:
            rd = client.delete(f"{API}/files/{file_id}", headers=owner_h)
            cleanup.append({"delete_file": rd.status_code})
        results["cleanup"] = cleanup

        # Seed re-run check counts via API list sizes
        pass_count = sum(1 for t in results["tests"] if t["verdict"] == "PASS")
        fail_count = sum(1 for t in results["tests"] if t["verdict"] == "FAIL")
        results["summary"] = {"pass": pass_count, "fail": fail_count, "partial": sum(1 for t in results["tests"] if t["verdict"] == "PARTIAL")}

    output = json.dumps(results, ensure_ascii=False, indent=2)
    from pathlib import Path
    Path("runtime_verify_out.json").write_text(output, encoding="utf-8")
    fail_count = results["summary"]["fail"]
    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
