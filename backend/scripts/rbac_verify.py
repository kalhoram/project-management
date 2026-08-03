"""Expanded RBAC / tenant isolation runtime checks — sanitized output only."""

from __future__ import annotations

import json
import os
import sys

import httpx

BASE = os.environ.get("RUNTIME_VERIFY_BASE", "http://127.0.0.1:8000")
API = f"{BASE}/api/v1"
WS_ID = "326613e1-f483-5194-9a8a-fd95e5560352"
PROJ_ID = "98a5a175-72f0-514e-9ca3-bd9ae2a019d8"
TASK_ID = "9b772af7-2652-5474-b357-ef6dc27a137d"
FAKE_WS = "00000000-0000-0000-0000-000000000099"
FAKE_PROJ = "00000000-0000-0000-0000-000000000098"
FAKE_TASK = "00000000-0000-0000-0000-000000000097"


def login(client: httpx.Client, email: str, password: str = "demo") -> dict[str, str]:
    r = client.post(f"{API}/auth/login", json={"email": email, "password": password})
    if r.status_code != 200:
        return {}
    data = r.json()
    return {"Authorization": f"Bearer {data['accessToken']}"}


def main() -> int:
    checks: list[dict] = []
    multi_workspace: dict = {"workspaceBId": None, "taskBId": None, "verified": False}

    def check(name: str, status: int, expected: set[int], note: str = "") -> None:
        verdict = "PASS" if status in expected else "FAIL"
        checks.append({"name": name, "status": status, "expected": sorted(expected), "verdict": verdict, "note": note})

    with httpx.Client(timeout=30.0, limits=httpx.Limits(max_keepalive_connections=0, max_connections=10)) as client:
        owner_h = login(client, "owner@yadbox.app")
        member_h = login(client, "member@yadbox.app")
        guest_h = login(client, "guest@yadbox.app")
        viewer_h = login(client, "viewer@yadbox.app")
        admin_h = login(client, "administrator@yadbox.app", "123/321")

        # Workspace isolation
        r = client.get(f"{API}/workspaces/{FAKE_WS}", headers=owner_h)
        check("owner GET fake workspace", r.status_code, {403, 404})

        r = client.get(f"{API}/workspaces/{WS_ID}", headers=guest_h)
        check("guest GET real workspace (member)", r.status_code, {200})

        r = client.get(f"{API}/workspaces/{FAKE_WS}", headers=guest_h)
        check("guest GET fake workspace", r.status_code, {403, 404})

        # Project isolation
        r = client.get(f"{API}/projects/{PROJ_ID}", headers=owner_h)
        check("owner GET project", r.status_code, {200})

        r = client.get(f"{API}/projects/{FAKE_PROJ}", headers=owner_h)
        check("owner GET fake project", r.status_code, {404})

        r = client.get(f"{API}/projects/{PROJ_ID}", headers=guest_h)
        check("guest GET project (workspace member)", r.status_code, {200})

        r = client.post(
            f"{API}/workspaces/{WS_ID}/projects",
            headers=guest_h,
            json={"name": "rbac-guest-project", "workspaceId": WS_ID},
        )
        check("guest POST create project", r.status_code, {403})

        r = client.post(
            f"{API}/workspaces/{WS_ID}/projects",
            headers=member_h,
            json={"name": "rbac-member-project", "workspaceId": WS_ID},
        )
        check("member POST create project", r.status_code, {200, 201}, "members have projects.create")

        created_proj_id = r.json().get("id") if r.status_code in (200, 201) else None

        # Task isolation
        r = client.get(f"{API}/tasks/{TASK_ID}", headers=owner_h)
        check("owner GET task", r.status_code, {200})

        r = client.get(f"{API}/tasks/{FAKE_TASK}", headers=owner_h)
        check("owner GET fake task", r.status_code, {404})

        r = client.patch(f"{API}/tasks/{TASK_ID}", headers=guest_h, json={"title": "guest-edit-attempt"})
        check("guest PATCH task", r.status_code, {403})

        r = client.patch(f"{API}/tasks/{TASK_ID}", headers=viewer_h, json={"title": "viewer-edit-attempt"})
        check("viewer PATCH task", r.status_code, {403})

        r = client.patch(f"{API}/tasks/{TASK_ID}", headers=member_h, json={"title": f"rbac-member-{int(__import__('time').time())}"})
        check("member PATCH task", r.status_code, {200})

        r = client.patch(f"{API}/tasks/{TASK_ID}", json={"title": "unauth-edit"})
        check("unauthenticated PATCH task", r.status_code, {401})

        r = client.post(
            f"{API}/tasks",
            headers=guest_h,
            json={"title": "guest-task", "projectId": PROJ_ID, "status": "backlog"},
        )
        check("guest POST create task", r.status_code, {403})

        # Saved filters isolation
        sf = client.post(
            f"{API}/saved-filters",
            headers=owner_h,
            json={
                "name": "rbac-owner-private",
                "scope": "workspace",
                "workspaceId": WS_ID,
                "conditions": [],
                "visibility": "private",
            },
        )
        sf_id = sf.json().get("id") if sf.status_code in (200, 201) else None
        check("owner POST saved filter", sf.status_code, {200, 201})

        if sf_id:
            r = client.get(f"{API}/saved-filters/{sf_id}", headers=guest_h)
            check("guest GET owner private saved filter", r.status_code, {403, 404})

            r = client.patch(f"{API}/saved-filters/{sf_id}", headers=guest_h, json={"name": "stolen"})
            check("guest PATCH owner saved filter", r.status_code, {403, 404})

            r = client.delete(f"{API}/saved-filters/{sf_id}", headers=owner_h)
            check("owner DELETE saved filter cleanup", r.status_code, {200, 204})

        r = client.get(f"{API}/saved-filters?workspaceId={FAKE_WS}", headers=owner_h)
        check("owner list saved filters fake workspace", r.status_code, {403, 404})

        # File access (guest is workspace member — read allowed by current policy)
        files = {"file": ("rbac.txt", b"rbac probe", "text/plain")}
        up = client.post(f"{API}/files/upload", headers=owner_h, files=files, data={"workspace_id": WS_ID})
        file_id = up.json().get("id") if up.status_code in (200, 201) else None
        check("owner upload file", up.status_code, {200, 201})

        if file_id:
            r = client.get(f"{API}/files/{file_id}", headers=guest_h)
            check("guest GET file in shared workspace", r.status_code, {200}, "workspace member read")

            r = client.get(f"{API}/files/{file_id}", headers=viewer_h)
            check("viewer GET file in shared workspace", r.status_code, {200})

            r = client.get(f"{API}/files/00000000-0000-0000-0000-000000000096", headers=owner_h)
            check("owner GET fake file id", r.status_code, {404})

            client.delete(f"{API}/files/{file_id}", headers=owner_h)

        # Admin vs workspace-scoped
        r = client.get(f"{API}/workspaces/{WS_ID}", headers=admin_h)
        check("system admin GET workspace", r.status_code, {200, 403, 404}, "depends on admin membership")

        # Multi-workspace isolation — owner creates Workspace B; guest (Workspace A only) denied
        import time as _time

        slug_b = f"rbac-verify-b-{_time.time():.0f}"
        ws_b = client.post(
            f"{API}/workspaces",
            headers=owner_h,
            json={"name": "RBAC Verify Workspace B", "slug": slug_b},
        )
        ws_b_id = ws_b.json().get("id") if ws_b.status_code in (200, 201) else None
        check("owner POST create workspace B", ws_b.status_code, {200, 201})

        task_b_id = None
        if ws_b_id:
            proj_b = client.post(
                f"{API}/workspaces/{ws_b_id}/projects",
                headers=owner_h,
                json={"name": "RBAC Verify Project B", "workspaceId": ws_b_id},
            )
            proj_b_id = proj_b.json().get("id") if proj_b.status_code in (200, 201) else None
            check("owner POST project in workspace B", proj_b.status_code, {200, 201})

            if proj_b_id:
                task_b = client.post(
                    f"{API}/tasks",
                    headers=owner_h,
                    json={"title": "RBAC Verify Task B", "projectId": proj_b_id, "status": "backlog"},
                )
                task_b_id = task_b.json().get("id") if task_b.status_code in (200, 201) else None
                check("owner POST task in workspace B", task_b.status_code, {200, 201})

                if task_b_id:
                    r = client.get(f"{API}/tasks/{task_b_id}", headers=guest_h)
                    check("guest GET task in workspace B", r.status_code, {403, 404}, f"workspaceB={ws_b_id}")

                    r = client.patch(
                        f"{API}/tasks/{task_b_id}",
                        headers=guest_h,
                        json={"title": "cross-workspace-edit"},
                    )
                    check("guest PATCH task in workspace B", r.status_code, {403, 404}, f"taskB={task_b_id}")

                    client.delete(f"{API}/tasks/{task_b_id}", headers=owner_h)

        multi_workspace = {
            "workspaceBId": ws_b_id,
            "taskBId": task_b_id,
            "verified": bool(ws_b_id and task_b_id),
        }

        if created_proj_id:
            client.delete(f"{API}/projects/{created_proj_id}", headers=member_h)

    summary = {
        "pass": sum(1 for x in checks if x["verdict"] == "PASS"),
        "fail": sum(1 for x in checks if x["verdict"] == "FAIL"),
    }
    out = {"base": BASE, "summary": summary, "checks": checks, "multiWorkspace": multi_workspace}
    path = "rbac_verify_out.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(json.dumps({"summary": summary, "output": path}, indent=2))
    return 0 if summary["fail"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
