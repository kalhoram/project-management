# Runtime Issue Log

**Updated:** 2026-08-03 (Contract completion pass — Estimation DTO + Member overdue count)

---

## ISS-CONTRACT-001 — Estimation DTO incomplete
- **Severity:** Medium (product contract)
- **Area:** advanced / estimation
- **Status:** **FIXED — RUNTIME-VERIFIED**
- **Root cause:** `EstimationOut` returned only `taskId`, `estimateHours`, `storyPoints`, `confidence`; frontend merged workspace tasks client-side for `key`, `title`, `actualHours`, `variance`
- **Fix:** Extended `EstimationOut` + `list_estimation`/`update_estimation` to include task fields and derived `variance`
- **Verification:** OpenAPI fields confirmed; `GET /workspaces/{id}/estimation` returns full DTO; estimation page smoke PASS; pytest contract test PASS

## ISS-CONTRACT-002 — Member overdue count missing
- **Severity:** Medium (product contract)
- **Area:** reports / members
- **Status:** **FIXED — RUNTIME-VERIFIED**
- **Root cause:** `MemberPerformanceRow` lacked overdue count; frontend mapper hardcoded `overdue: 0`
- **Fix:** Added `tasksOverdue` to schema; aggregate query in `report_service._overdue_counts_by_assignee`
- **Definition:** assigned task, `dueDate < today`, status not in (`done`, `cancelled`), workspace-scoped, not soft-deleted
- **Verification:** seed members with overdue > 0; workspace overview shows real counts; pytest contract test PASS

## ISS-013 — Guest/viewer can PATCH tasks
- **Severity:** Medium
- **Area:** RBAC / tasks
- **Status:** **FIXED**
- **Root cause:** `require_task_permission(None)` on PATCH — membership only, no `tasks.create` check
- **Fix:** `require_task_permission(PERM_TASKS_CREATE)` on task mutation routes; comment mutations get explicit permission check
- **Before:** guest/viewer PATCH → 200
- **After:** guest/viewer PATCH → 403 PERMISSION_DENIED; member PATCH → 200
- **Verification:** RUNTIME-VERIFIED (rbac_verify 30/30) + integration tests

## ISS-010 — Seed re-run duplicate plans
- **Status:** FIXED — RUNTIME-VERIFIED (unchanged this pass)

## ISS-005 — Mock ID `ws-1`
- **Status:** OPEN — frontend only; CODE-INSPECTED

## ISS-001 through ISS-012
- **Status:** FIXED (see prior entries)

---

## Summary

| Severity | Fixed | Open |
|----------|-------|------|
| Critical | 2 | 0 |
| High | 5 | 0 |
| Medium | 4 (ISS-010, ISS-013, ISS-CONTRACT-001, ISS-CONTRACT-002) | 0 product-contract blockers |
| Frontend mock IDs (ISS-005) | — | 0 in production paths |

---

## Port / instance (2026-08-03 verification)

| Item | Value |
|------|-------|
| Backend PID | **8076** (`uvicorn app.main:app --host 127.0.0.1 --port 8000`) |
| Frontend PID | **8452** (`npm run start -- --port 3000`) |
| Backend URL | `http://127.0.0.1:8000` |
| Frontend URL | `http://127.0.0.1:3000` |
| Latest verification | runtime **38/38**, RBAC **30/30**, seed ×2 ok, pytest **23 passed** (3 skipped), Playwright smoke **2/2**, integration **6/6** |
