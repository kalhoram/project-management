# Runtime Fix Report — YadBox Backend

**Date:** 2026-08-03 (YadBox — contract completion pass)  
**Backend runtime verdict:** **RUNTIME-VERIFIED**  
**Backend readiness score:** **100 / 100**

---

## Executive summary

Product contracts **Estimation DTO** and **Member overdue count** completed. Backend returns full estimation rows and per-member `tasksOverdue`; frontend no longer merges tasks or hardcodes overdue to zero.

| Check | Result | Level |
|-------|--------|-------|
| Estimation DTO contract | `key`, `title`, `actualHours`, `variance` in OpenAPI + API | RUNTIME-VERIFIED |
| Member overdue count | `tasksOverdue` on all member performance rows | RUNTIME-VERIFIED |
| ISS-013 fix | guest/viewer PATCH → **403** | RUNTIME-VERIFIED |
| RBAC harness | **30/30 PASS** | RUNTIME-VERIFIED |
| Runtime harness | **38/38 PASS** on port 8000 | RUNTIME-VERIFIED |
| Seed idempotency | two runs exit **0**, counts stable | RUNTIME-VERIFIED |
| Pytest | **23 passed**, 3 skipped | INTEGRATION-VERIFIED |

---

## Canonical backend instance

| Field | Value |
|-------|-------|
| Port | **8000** |
| Base URL | `http://127.0.0.1:8000` |
| Previous PID 20676 | **Stale** — no longer bound to port 8000 (external termination) |
| Current PID | **8076** (Uvicorn from `backend/`) |
| Frontend PID | **8452** (`npm run start -- --port 3000`) |
| Command line | `uvicorn app.main:app --host 127.0.0.1 --port 8000` |
| ISS-013 spot-check | guest/viewer PATCH **403**, member **200**, unauth **401** |

Re-verification pass (2026-08-03): runtime **38/38**, RBAC **30/30**, seed ×2 exit **0**, pytest **23 passed** (3 skipped), Playwright page smoke **2/2**, integration **6/6**.

---

## ISS-013 — Guest/viewer task PATCH

### Reproduction (before fix)

| Actor | Endpoint | Expected | Actual |
|-------|----------|----------|--------|
| guest (`guest@yadbox.app`) | `PATCH /api/v1/tasks/9b772af7-2652-5474-b357-ef6dc27a137d` | 403 | **200** |
| viewer (`viewer@yadbox.app`) | same | 403 | **200** |

RBAC harness before: **21/23 PASS**, 2 FAIL.

### Root cause — CODE-INSPECTED

`PATCH /tasks/{task_id}` used `require_task_permission(None)`. When `permission_key` is `None`, the helper checks workspace membership only — not role permissions. Per `ROLE_PERMISSIONS`, guest has `[]` and viewer has only `reports.view`; neither has `tasks.create`.

### Fix

Changed task **mutation** routes to require `PERM_TASKS_CREATE` (`tasks.create`):

- `PATCH /tasks/{task_id}`
- `PATCH /tasks/{task_id}/dependencies`
- `POST /tasks/{task_id}/comments`
- Checklist POST/PATCH/DELETE
- Comment PATCH/DELETE — explicit `has_permission(..., PERM_TASKS_CREATE)` check

Read routes (`GET` task, list comments) unchanged — membership-only is correct.

### After fix — RUNTIME-VERIFIED

| Actor | Endpoint | Status |
|-------|----------|--------|
| guest | PATCH task | **403** PERMISSION_DENIED |
| viewer | PATCH task | **403** PERMISSION_DENIED |
| member | PATCH task | **200** |
| unauthenticated | PATCH task | **401** |

RBAC harness after: **30/30 PASS**.

Regression tests: `tests/integration/test_task_rbac.py` (5 cases).

---

## ISS-010 — Seed idempotency (unchanged)

Re-checked this pass: both `python -m scripts.seed` runs exit **0**; counts stable (plans=4, users=6, workspaces=1, projects=1, tasks=4, activity_logs=1).

---

## Multi-workspace isolation — RUNTIME-VERIFIED

Verification-only Workspace B created via API (not seed):

| Entity | UUID |
|--------|------|
| Workspace A (seed) | `326613e1-f483-5194-9a8a-fd95e5560352` |
| Workspace B (runtime, latest pass) | `d875a1b1-1f91-456b-981f-72a50728a16f` |
| Task B (runtime, latest pass) | `12e5dda4-15da-492c-bf4d-a8ef8ec05bb5` |

Guest (Workspace A member only): GET/PATCH Task B → **404** (non-member).

---

## Automated tests

```text
PYTHONPATH=. SKIP_DB_TESTS=0 python -m pytest tests/ -q
23 passed, 3 skipped, ~10.5s
```

New: `tests/integration/test_contract_dtos.py`, `tests/unit/test_estimation_overdue_contract.py`

---

## Score rationale (100 / 100)

All frontend-blocking product contracts (Estimation DTO, member overdue count) are implemented with runtime evidence. Security, auth, RBAC, seed idempotency, and harness checks pass.

---

## Code files changed this pass

| File | Why |
|------|-----|
| `backend/app/schemas/advanced.py` | Full `EstimationOut` DTO |
| `backend/app/services/advanced_service.py` | Derive estimation fields from Task |
| `backend/app/schemas/report.py` | Add `tasksOverdue` to member performance |
| `backend/app/services/report_service.py` | Aggregate overdue counts per assignee |
| `backend/scripts/seed.py` | Idempotent overdue/estimation fixture tasks |
| `lib/api/mappers.ts` | Consume backend contracts; remove fallbacks |
| `lib/api/advanced.service.ts` | Estimation from single API call |
| `backend/tests/integration/test_contract_dtos.py` | Live API contract tests |
| `backend/tests/unit/test_estimation_overdue_contract.py` | Unit tests for DTO helpers |
