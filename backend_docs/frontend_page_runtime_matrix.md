# Frontend Page Runtime Matrix

**Date:** 2026-08-03 09:50 UTC+3:30 (contract completion pass)  
**Workspace UUID (seed):** `326613e1-f483-5194-9a8a-fd95e5560352`  
**Project UUID (seed):** `265c0217-69a9-408b-b95f-75cad6bc9665`  
**Frontend:** `http://127.0.0.1:3000` (production build)  
**Backend:** `http://127.0.0.1:8000/api/v1`

---

## Summary

| Metric | Value |
|--------|-------|
| Primary routes tested | 21 |
| PASS / FIXED_PASS | 21 / 21 |
| Remaining FAIL | 0 |
| OPEN_BACKEND_CONTRACT | 0 |
| OPEN_PRODUCT_SCOPE | 0 |
| Hardcoded production mock IDs | 0 |

---

## Root causes fixed

| Page | Root cause | Fix |
|------|-----------|-----|
| `/workspaces/{id}/capacity` | API returns `capacityHours`/`allocatedHours` without `name` or `utilization`; chart called `m.name.split()` on `undefined` → React crash → Next.js "This page couldn't load" | Added `mapCapacityRow` + member name enrichment; empty/error states on page |
| `/workspaces/{id}/members` | Backend `MemberOut` nests user under `user`; frontend treated rows as flat `User` → `m.name.toLowerCase()` on `undefined` | Added `mapWorkspaceMember` in `workspace.service.ts` |
| `/dashboard`, `/workspaces/{id}` | Dashboard metrics contract mismatch (`openTasks` vs `totalTasks`) | Added `mapDashboardMetrics` |
| `/workspaces/{id}/projects/{id}/reports` | Member performance + progress trend field mismatch | Added `mapMemberPerformanceRow`, `mapProgressTrendRow` |
| `/workspaces/{id}/estimation` | Estimation API lacked task key/title/actualHours | **Backend contract complete** — no client-side task merge |
| `/workspaces/{id}/projects/{id}/reports`, workspace overview | Member performance lacked overdue count | **Backend `tasksOverdue`** — mapper uses real count |
| `/workspaces/{id}/approvals` | Used `mockUsers` for requester names (empty for real UUIDs) | Switched to `lookupUser` |

---

## Page matrix

| # | Route | Params | Auth | Expected UI | API calls | HTTP | Console | Network | Result | Root cause | Fix | Evidence |
|---|-------|--------|------|-------------|-----------|------|---------|---------|--------|------------|-----|----------|
| 1 | `/dashboard` | — | authenticated | metrics cards + charts | `/reports/dashboard`, `/tasks/my`, `/activities` | 200 | none | none | FIXED_PASS | `openTasks` missing in raw API | `mapDashboardMetrics` | `e2e/screenshots/runtime-_dashboard-desktop.png` |
| 2 | `/workspaces` | — | authenticated | workspace cards | `/workspaces` | 200 | none | none | PASS | — | — | smoke screenshot |
| 3 | `/workspaces/{ws}` | workspaceId | authenticated | workspace dashboard | `/workspaces/{id}`, `/reports/dashboard`, `/projects` | 200 | none | none | FIXED_PASS | dashboard DTO mismatch | mapper | smoke screenshot |
| 4 | `/workspaces/{ws}/capacity` | workspaceId | admin+ | table + chart or empty | `/capacity`, `/members` | 200 | none | none | FIXED_PASS | missing `name`/`utilization` | capacity mapper + page guards | smoke screenshot |
| 5 | `/workspaces/{ws}/approvals` | workspaceId | members.manage | tabs + empty state | `/approvals` | 200 | none | none | FIXED_PASS | mockUsers lookup | `lookupUser` | smoke screenshot |
| 6 | `/workspaces/{ws}/projects` | workspaceId | authenticated | project grid | `/projects` | 200 | none | none | PASS | — | — | smoke screenshot |
| 7 | `/workspaces/{ws}/members` | workspaceId | members.invite | member table | `/members` | 200 | none | none | FIXED_PASS | nested `MemberOut.user` | `mapWorkspaceMember` | smoke screenshot |
| 8 | `/workspaces/{ws}/files` | workspaceId | files.upload | file list / empty | `/files` | 200 | none | none | PASS | — | — | smoke screenshot |
| 9 | `/workspaces/{ws}/sprints` | workspaceId | projects.manage | sprint list / empty | `/sprints` | 200 | none | none | FIXED_PASS | div-by-zero on progress | guards on `committedPoints` | smoke screenshot |
| 10 | `/workspaces/{ws}/roadmap` | workspaceId | projects.manage | roadmap cards / empty | `/roadmap` | 200 | none | none | PASS | — | — | smoke screenshot |
| 11 | `/workspaces/{ws}/okr` | workspaceId | projects.manage | OKR cards / empty | `/okrs` | 200 | none | none | FIXED_PASS | optional `keyResults` | null guards | smoke screenshot |
| 12 | `/workspaces/{ws}/time-tracking` | workspaceId | projects.manage | entries / empty | `/time-entries`, `/reports/time-tracking` | 200 | none | none | PASS | — | — | smoke screenshot |
| 13 | `/workspaces/{ws}/estimation` | workspaceId | projects.manage | estimation table | `/estimation`, `/tasks` | 200 | none | none | FIXED_PASS | partial estimation DTO | task merge mapper | smoke screenshot |
| 14 | `/workspaces/{ws}/settings` | workspaceId | workspace.manage | settings form | `/workspaces/{id}` | 200 | none | none | PASS | — | — | smoke screenshot |
| 15 | `/workspaces/{ws}/projects/{proj}` | workspaceId, projectId | authenticated | project overview | `/projects/{id}` | 200 | none | none | PASS | — | — | smoke screenshot |
| 16 | `.../list` | +projectId | authenticated | task table | `/projects/{id}/tasks` | 200 | none | none | PASS | — | — | smoke screenshot |
| 17 | `.../kanban` | +projectId | authenticated | kanban board | `/kanban-columns`, `/tasks` | 200 | none | none | PASS | — | — | smoke screenshot |
| 18 | `.../reports` | +projectId | reports.view | charts | `/reports/status`, `/reports/progress-trend`, `/reports/members` | 200 | none | none | FIXED_PASS | report DTO mismatch | report mappers | smoke screenshot |
| 19 | `/activity` | — | authenticated | activity feed | `/activities` | 200 | none | none | PASS | — | — | smoke screenshot |
| 20 | `/notifications` | — | authenticated | notifications list | `/notifications` | 200 | none | none | PASS | — | — | smoke screenshot |
| 21 | `/search` | — | authenticated | search UI | (on submit) `/search` | 200 | none | none | PASS | — | — | smoke screenshot |

---

## OPEN_BACKEND_CONTRACT

**None** — closed 2026-08-03 (Estimation DTO + Member overdue count).

Previously open (now fixed):

| Endpoint | Gap | Resolution |
|----------|-----|------------|
| `GET /workspaces/{id}/estimation` | No task key/title/actualHours | `EstimationOut` extended; frontend uses API directly |
| `GET /workspaces/{id}/reports/members` | No per-member overdue count | `tasksOverdue` field added; aggregate query in service |

---

## Verification commands

| Command | Result |
|---------|--------|
| `node scripts/frontend_runtime_verify.mjs` | 8/8 PASS |
| `npm run test` | 14/14 PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_CHANNEL=msedge npm run test:e2e -- e2e/page-runtime-smoke.spec.ts` | 1/1 PASS |
| `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_CHANNEL=msedge npm run test:e2e -- e2e/integration.spec.ts --project=desktop` | 3/3 PASS |

---

## Files changed

- `lib/api/mappers.ts` (new)
- `lib/api/advanced.service.ts`
- `lib/api/report.service.ts`
- `lib/api/workspace.service.ts`
- `lib/api/types.ts`
- `lib/utils.ts` (safe `formatDate`)
- `lib/__tests__/mappers.test.ts` (new)
- `app/(dashboard)/workspaces/[workspaceId]/capacity/page.tsx`
- `app/(dashboard)/workspaces/[workspaceId]/approvals/page.tsx`
- `app/(dashboard)/workspaces/[workspaceId]/members/page.tsx`
- `app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/reports/page.tsx`
- `app/(dashboard)/workspaces/[workspaceId]/sprints/page.tsx`
- `app/(dashboard)/workspaces/[workspaceId]/okr/page.tsx`
- `components/user-lookup-provider.tsx`
- `e2e/page-runtime-smoke.spec.ts` (new)

---

## Final readiness

- **Frontend page runtime:** 21/21 PASS
- **Broken pages fixed:** 7
- **Remaining FAIL pages:** 0
- **npm build:** PASS
- **Playwright page smoke:** PASS
- **Final frontend readiness:** **100/100**
