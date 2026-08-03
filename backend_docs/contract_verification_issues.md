# Contract Verification — Prioritized Issue Log

Generated: 2026-08-02  
Verifier: automated + manual code/runtime inspection  
Environment: Windows, Python 3.12, **PostgreSQL/Redis/Docker unavailable at verification time**

---

## Critical

### ISS-001 — Runtime DB dependency returns HTTP 500 instead of controlled error
- **Severity:** Critical  
- **Area:** routing / observability  
- **Evidence:** `POST /api/v1/auth/login` with DB down → `ConnectionRefusedError` (500), stack trace in ASGI transport test  
- **Expected:** Structured Persian error or 503 service-unavailable when DB unreachable  
- **Actual:** Unhandled connection exception  
- **Impact:** Frontend integration fails opaquely; production outages expose internals  
- **Next action:** Add global DB connectivity handler; make `/ready` check Postgres; return `{ success:false, code:"SERVICE_UNAVAILABLE", message:"..." }`

### ISS-002 — End-to-end auth/data flows not runtime-verified (environment blocked)
- **Severity:** Critical (for sign-off)  
- **Area:** seed / auth / all modules  
- **Evidence:** `Test-NetConnection localhost:5432` → False; `docker compose up` → Docker Desktop engine pipe missing  
- **Expected:** `alembic upgrade head`, `python -m scripts.seed`, login smoke pass  
- **Actual:** Not executed  
- **Impact:** Cannot certify tenant isolation, RBAC enforcement, file persistence, billing, or E2E smoke  
- **Next action:** Start Docker Desktop → `cd backend/docker && docker compose up -d postgres redis` → migrate → seed → rerun verification suite

---

## High

### ISS-003 — JWT secret uses insecure in-repo default when `.env` absent
- **Severity:** High  
- **Area:** auth / config  
- **Evidence:** `get_settings().jwt_secret` starts with `change-me`; no `.env` file present; `.env.example` has placeholder  
- **Expected:** Production requires strong secret via env; boot warning if default  
- **Actual:** Silent use of default  
- **Impact:** Token forgery if deployed without env override  
- **Next action:** Fail boot in `production` if default secret; document `JWT_SECRET` rotation

### ISS-004 — Frontend auth contract mismatch (login payload + return shape)
- **Severity:** High  
- **Area:** frontend contract / auth  
- **Evidence:**  
  - Frontend: `login(email, password) → User` (`lib/api/auth.service.ts:42-52`)  
  - Backend: `POST /auth/login` body `{ identifier, password }` → `TokenResponse` (`schemas/auth.py`, `routes/auth.py:65-67`)  
- **Expected:** Drop-in replacement or documented adapter  
- **Actual:** Different field name + must store tokens + extract `user` from envelope  
- **Impact:** Direct swap of mock auth service will break login page  
- **Next action:** Create `lib/api/client.ts` + adapt auth service to map `identifier`/`TokenResponse`

### ISS-005 — Mock ID vs UUID incompatibility
- **Severity:** High  
- **Area:** frontend contract  
- **Evidence:** Frontend constants `DEFAULT_WORKSPACE_ID=ws-1`; seed UUID `326613e1-f483-5194-9a8a-fd95e5560352` (`scripts/ids.py`)  
- **Expected:** Workspace/project IDs in API are UUID strings  
- **Actual:** Zustand + routes may still use `ws-1`  
- **Impact:** All workspace-scoped API calls 404/422 until IDs updated post-login  
- **Next action:** After login, set `currentWorkspaceId` from `GET /workspaces[0].id`; remove hardcoded mock IDs

### ISS-006 — Rate limiting configured but not enforced on auth endpoints
- **Severity:** High  
- **Area:** auth / security  
- **Evidence:** `config.py: rate_limit_login`, `RateLimitError` in `exceptions.py`; **no usage** in `auth_service.py` or routes (grep)  
- **Expected:** Brute-force protection on login/forgot/reset  
- **Actual:** Unlimited attempts  
- **Impact:** Production auth surface vulnerable  
- **Next action:** Implement Redis sliding-window limiter in auth routes

### ISS-007 — `/ready` does not verify dependencies (superficial readiness)
- **Severity:** High  
- **Area:** observability  
- **Evidence:** `GET /ready` → `{"status":"ready"}` always (`main.py:59-61`); no DB/Redis/MinIO probe  
- **Expected:** Readiness fails when Postgres unavailable  
- **Actual:** Always 200  
- **Impact:** Orchestrator routes traffic to broken instances  
- **Next action:** Add dependency checks to `/ready`

### ISS-008 — Saved filters API entirely missing
- **Severity:** High  
- **Area:** routing / frontend contract  
- **Evidence:** Model `SavedFilter` exists (`models/activity.py`); **no routes** (grep `saved_filter` in `app/api` → 0)  
- **Frontend:** `SavedFilter` type in `lib/types/index.ts`; mock data present  
- **Impact:** Saved filter UI cannot integrate  
- **Next action:** Implement `GET/POST/PATCH/DELETE /api/v1/saved-filters`

---

## Medium

### ISS-009 — Dashboard metrics response shape mismatch
- **Severity:** Medium  
- **Area:** frontend contract / reports  
- **Evidence:**  
  - Frontend mock: `{ totalWorkspaces, totalProjects, openTasks, overdueTasks, completedTasks, members }`  
  - Backend: `{ totalProjects, activeProjects, totalTasks, completedTasks, overdueTasks, totalMembers, tasksDueThisWeek, completionRate }` (`schemas/report.py`)  
  - Path: frontend global optional vs backend `/workspaces/{id}/reports/dashboard` only  
- **Impact:** Dashboard page needs adapter or backend alias endpoint  
- **Next action:** Add `/api/v1/dashboard` alias or update frontend types

### ISS-010 — Member performance row field mismatch
- **Severity:** Medium  
- **Area:** reports  
- **Evidence:** Frontend `{ userId, name, completed, overdue, open, avgHours }` vs backend `{ userId, userName, tasksAssigned, tasksCompleted, avgCompletionHours, onTimeRate }`  
- **Impact:** Reports member table columns wrong without mapping  
- **Next action:** Align schema to frontend or add compatibility layer

### ISS-011 — Progress trend shape mismatch
- **Severity:** Medium  
- **Area:** reports  
- **Evidence:** Frontend `{ week, progress }[]` vs backend `{ date, created, completed, cumulativeCompleted }[]`  
- **Impact:** Project reports charts need transformation  
- **Next action:** Add frontend-compatible DTO or chart adapter

### ISS-012 — Global search path/scoping mismatch
- **Severity:** Medium  
- **Area:** search  
- **Evidence:** Frontend `globalSearch(query)` no workspace param; backend `GET /workspaces/{workspaceId}/search?q=`  
- **Impact:** Search page must pass active workspace UUID  
- **Next action:** Acceptable with adapter; document requirement

### ISS-013 — Labels endpoint scoping mismatch
- **Severity:** Medium  
- **Area:** tasks  
- **Evidence:** Frontend `getLabels()` global; backend `/workspaces/{workspaceId}/labels`  
- **Impact:** Task form label chips need workspace context  
- **Next action:** Update frontend hook to pass workspaceId

### ISS-014 — Billing payment/history/result/webhook routes missing
- **Severity:** Medium  
- **Area:** billing  
- **Evidence:** Frontend pages `/billing/payment`, `/billing/history`, `/billing/result`; backend has plans/subscription/invoices/cancel only (`routes/billing.py`)  
- **Impact:** Payment flow pages blocked  
- **Next action:** Implement payment intent + webhook stub per `billing/provider.py`

### ISS-015 — Workspace security & notification settings routes missing
- **Severity:** Medium  
- **Area:** workspaces  
- **Evidence:** Frontend routes `.../security`, `.../notifications`; backend has general workspace PATCH only  
- **Impact:** Dedicated settings pages need new endpoints or reuse PATCH  
- **Next action:** Add settings sub-resources or map UI to workspace PATCH fields

### ISS-016 — Alembic initial migration uses `create_all` not explicit DDL
- **Severity:** Medium  
- **Area:** schema  
- **Evidence:** `alembic/versions/001_initial_schema.py` calls `Base.metadata.create_all(bind)`  
- **Expected:** Versioned incremental migrations for production  
- **Actual:** Monolithic create/drop  
- **Impact:** Harder to evolve schema safely; downgrade drops everything  
- **Next action:** Generate proper autogenerate migration after first boot

### ISS-017 — FK cycle warning: `recurring_rules` ↔ `tasks`
- **Severity:** Medium  
- **Area:** schema  
- **Evidence:** SQLAlchemy warning during `Base.metadata.sorted_tables` inspection  
- **Impact:** Alembic autogenerate ordering issues; potential migration failures  
- **Next action:** Break cycle with deferred FK or reorder model definitions

### ISS-018 — Archived/deleted projects: different API surface
- **Severity:** Medium  
- **Area:** projects  
- **Evidence:** Frontend separate `getArchivedProjects` / `getDeletedProjects`; backend single list with `?scope=archived|deleted`  
- **Impact:** Requires query param adapter (low effort)  
- **Next action:** Document in frontend client mapping

### ISS-019 — Duplicate session/settings endpoints (auth vs settings)
- **Severity:** Medium  
- **Area:** routing  
- **Evidence:** Sessions at both `/auth/sessions` and `/settings/sessions`; profile at `/auth/me` and `/settings/profile`  
- **Impact:** Mapping doc ambiguity; not blocking if consistent  
- **Next action:** Pick canonical paths for frontend client

### ISS-020 — Appearance preferences in-memory only
- **Severity:** Medium  
- **Area:** settings  
- **Evidence:** `settings_service.py` `_appearance_cache` dict, not persisted  
- **Impact:** Theme lost on restart; acceptable if client persists (frontend does via next-themes)  
- **Next action:** Document as client-side primary store

---

## Low

### ISS-021 — Validation error field messages partially English
- **Severity:** Low  
- **Area:** i18n  
- **Evidence:** `POST /auth/login {}` → errors `"Field required"` (English) inside Persian envelope  
- **Next action:** Custom Pydantic error translator to Persian

### ISS-022 — Admin dashboard path prefix differs from mapping doc examples
- **Severity:** Low  
- **Area:** docs  
- **Evidence:** Actual `/api/v1/admin/dashboard`; mapping doc listed `/admin/dashboard` without prefix  
- **Next action:** Fix mapping doc (prefix already correct in OpenAPI)

### ISS-023 — `pytest` DB integration skipped by default
- **Severity:** Low  
- **Area:** tests  
- **Evidence:** `SKIP_DB_TESTS=1` default in `test_auth_db.py`  
- **Next action:** CI job with Postgres + `SKIP_DB_TESTS=0`

### ISS-024 — Redis configured but unused in request path
- **Severity:** Low  
- **Area:** infra  
- **Evidence:** `REDIS_URL` in config; no request-time Redis usage except Celery (not verified running)  
- **Next action:** Wire rate limit + cache when implementing ISS-006

---

## Issue count by severity

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 6 |
| Medium | 12 |
| Low | 4 |
