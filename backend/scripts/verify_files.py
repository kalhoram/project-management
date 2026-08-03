"""Print seeded demo file counts via API."""

from __future__ import annotations

import json

import httpx

from scripts.ids import seed_id

WS = str(seed_id("ws-1"))
P1 = str(seed_id("proj-1"))
P2 = str(seed_id("proj-2"))
BASE = "http://127.0.0.1:8000/api/v1"


def main() -> None:
    with httpx.Client(timeout=20) as client:
        login = client.post(
            f"{BASE}/auth/login",
            json={"email": "owner@yadbox.app", "password": "demo"},
        )
        login.raise_for_status()
        headers = {"Authorization": f"Bearer {login.json()['accessToken']}"}
        ws_files = client.get(f"{BASE}/workspaces/{WS}/files", headers=headers).json()
        p1_files = client.get(f"{BASE}/projects/{P1}/files", headers=headers).json()
        p2_files = client.get(f"{BASE}/projects/{P2}/files", headers=headers).json()
    out = {
        "workspace_files": len(ws_files),
        "workspace_names": [item["name"] for item in ws_files],
        "proj1_count": len(p1_files),
        "proj1_names": [item["name"] for item in p1_files],
        "proj2_count": len(p2_files),
        "proj2_names": [item["name"] for item in p2_files],
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
