# Runtime E2E Smoke Report

**Date:** 2026-08-02 (ISS-013 re-verification)  
**Server:** `http://127.0.0.1:8000` — PID **8952** (PID 20676 stale; restarted)  
**Harness:** `python -m scripts.runtime_verify`  
**Overall:** **PASS — 38/38**

**Verification level:** RUNTIME-VERIFIED

---

## Runtime verification (port 8000)

All 38 checks pass including auth flow, smoke CRUD, saved filters PATCH, files, rate limit. No regressions from ISS-013 fix.

Output: `backend/runtime_verify_out.json` — `{ pass: 38, fail: 0, partial: 0 }`

---

## RBAC — expanded (30/30 PASS)

Harness: `python -m scripts.rbac_verify`

### ISS-013 task PATCH matrix — RUNTIME-VERIFIED

| Actor | Role | PATCH task | Status | Verdict |
|-------|------|------------|--------|---------|
| guest | guest | `9b772af7-2652-5474-b357-ef6dc27a137d` | 403 | PASS |
| viewer | viewer | same | 403 | PASS |
| member | member | same | 200 | PASS |
| (none) | — | same | 401 | PASS |

### Multi-workspace isolation — RUNTIME-VERIFIED

| Test | Actor | Resource | Status | Verdict |
|------|-------|----------|--------|---------|
| Create Workspace B | owner | POST `/workspaces` | 201 | PASS |
| Create Task B | owner | POST `/tasks` in WS B | 201 | PASS |
| Cross-workspace GET | guest (WS A only) | Task B `986af967-e14a-4c52-897a-4a9031fe4842` | 404 | PASS |
| Cross-workspace PATCH | guest | Task B | 404 | PASS |

**Workspace A:** `326613e1-f483-5194-9a8a-fd95e5560352`  
**Workspace B:** `d875a1b1-1f91-456b-981f-72a50728a16f`  
**Task B:** `12e5dda4-15da-492c-bf4d-a8ef8ec05bb5`

Output: `backend/rbac_verify_out.json` — `{ pass: 30, fail: 0 }`

---

## Saved filters / storage / auth

Unchanged from prior pass — all PASS on canonical 8000 instance.
