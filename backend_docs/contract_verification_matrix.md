# Contract Verification Matrix

Generated: 2026-08-02  
Legend: **Pass** = verified working | **Partial** = exists but contract/runtime gap | **Fail** = missing/broken | **NT** = not tested (blocked)

Verification methods: `[C]` code inspection, `[R]` runtime HTTP (ASGI), `[O]` OpenAPI, `[M]` model/schema compare, `[E]` execution blocked

---

## Platform / Infrastructure

| Module | Item | Status | Evidence | Notes |
|--------|------|--------|----------|-------|
| Boot | App import | **Pass** [C][R] | `from app.main import app` OK; 185 HTTP routes | |
| Boot | Router wiring | **Pass** [C] | `router.py` mounts 14 route groups incl. settings | |
| Config | `.env.example` completeness | **Partial** [C] | Has DB/Redis/JWT/MinIO/CORS; no `SENTRY_DSN` usage verified | |
| Config | JWT secret naming | **Partial** [C][R] | `.env.example`: `JWT_SECRET`; code: `jwt_secret`; default used without `.env` | |
| Config | CORS for Next.js | **Pass** [C] | `localhost:3000`, credentials allowed | |
| Migration | `alembic upgrade head` | **NT** [E] | Postgres port closed | Blocked |
| Migration | Schema 61 tables | **Pass** [C] | `import app.models` → 61 tables | |
| Seed | `scripts/seed.py` | **NT** [E] | Requires Postgres | Blocked |
| Health | `GET /health` | **Pass** [R] | 200 `{"status":"ok","service":"yadbox-api"}` | |
| Readiness | `GET /ready` | **Partial** [R] | 200 always; no DB probe | Superficial |
| OpenAPI | `/openapi.json` | **Pass** [O] | 133 paths, 14 tags, HTTPBearer | |
| Docker | compose stack | **NT** [E] | Docker engine not running | Blocked |

---

## Auth & Sessions

| Endpoint / Capability | Status | Evidence | Notes |
|----------------------|--------|----------|-------|
| POST `/auth/signup` | **Partial** [C] | Implemented; not runtime-tested | Signup password rules stricter than frontend |
| POST `/auth/login` | **Partial** [C][R] | Implemented; 422 on empty body (Persian envelope); 500 if DB down | Field `identifier` not `email` |
| POST `/auth/refresh` | **Partial** [C] | Rotation in `auth_service.refresh` | NT runtime |
| POST `/auth/logout` | **Partial** [C] | Revokes session by JWT sid | NT runtime |
| GET `/auth/me` | **Partial** [R] | 401 Persian without token ✓ | NT with valid token |
| POST `/auth/forgot-password` | **Partial** [C] | Silent success pattern | NT |
| POST `/auth/reset-password` | **Partial** [C] | Token hash + expiry | NT |
| POST `/auth/verify-email` | **Partial** [C] | | NT |
| POST `/auth/two-factor/verify` | **Partial** [C] | pyotp TOTP | NT |
| GET/DELETE `/auth/sessions` | **Partial** [C] | Duplicate with `/settings/sessions` | NT |
| Password hashing Argon2 | **Pass** [C] | `passlib` schemes argon2 in `security.py` | |
| JWT issued by backend | **Pass** [C] | HS256, `jwt_secret` local | No external API key |
| Rate limiting | **Fail** [C] | Config only; not wired | ISS-006 |
| Persian auth errors | **Partial** [R] | 401/422 Persian envelope; inner validation English | |

---

## Workspaces

| Capability | Status | Evidence | Notes |
|------------|--------|----------|-------|
| List/create/detail/update | **Partial** [C][O] | Routes exist | NT runtime |
| Members CRUD | **Partial** [C][O] | `/members`, role patch, delete | |
| Invites | **Partial** [C][O] | list/create/delete/accept | |
| Teams CRUD | **Partial** [C][O] | | |
| Roles CRUD | **Partial** [C][O] | | |
| Permissions catalog | **Partial** [C][O] | `GET /permissions` | |
| Security settings page | **Fail** [C] | No dedicated route | Use PATCH workspace? |
| Workspace notifications settings | **Fail** [C] | No dedicated route | |
| Onboarding complete | **Partial** [C][O] | `POST /onboarding/complete` | NT |

---

## Projects

| Capability | Status | Evidence | Notes |
|------------|--------|----------|-------|
| List active | **Partial** [C][O] | `GET .../projects?scope=active` | |
| List archived/deleted | **Partial** [C][O] | `?scope=archived\|deleted` | Adapter vs separate FE functions |
| CRUD | **Partial** [C][O] | | |
| Archive/restore/permanent delete | **Partial** [C][O] | | |
| Categories CRUD | **Partial** [C][O] | | |
| Members | **Partial** [C] | Via project create memberIds + project members in service | No dedicated `/projects/{id}/members` route |
| Dashboard metrics | **Partial** [C] | Via reports module | Shape mismatch |

---

## Tasks

| Capability | Status | Evidence | Notes |
|------------|--------|----------|-------|
| List by project/workspace | **Partial** [C][O] | | |
| CRUD | **Partial** [C][O] | | |
| Bulk update | **Partial** [C][O] | `POST /tasks/bulk-update` | |
| Comments CRUD | **Partial** [C][O] | | |
| Checklist | **Partial** [C][O] | | |
| Dependencies | **Partial** [C][O] | PATCH dependencies | |
| Labels | **Partial** [C][O] | Workspace-scoped | FE global |
| My/overdue/upcoming | **Partial** [C][O] | `/tasks/my`, `/tasks/overdue` | |
| Recurring | **Partial** [C] | Model + jobs stub | NT |

---

## Views (Kanban/List/Calendar/Timeline/Gantt)

| Capability | Status | Evidence | Notes |
|------------|--------|----------|-------|
| Kanban board payload | **Partial** [C][O] | `GET .../kanban` → `{columns, tasks}` | |
| Column CRUD/reorder | **Partial** [C][O] | | |
| Move task | **Partial** [C][O] | `POST .../kanban/move` | |
| List view + pagination | **Partial** [C][O] | `GET .../list` → `Page` | Only list view paginated |
| Calendar | **Partial** [C][O] | Date range query params | |
| Timeline/Gantt | **Partial** [C][O] | Routes exist | NT payload review |
| Schedule update | **Partial** [C][O] | `PATCH .../schedule` | |

---

## Files

| Capability | Status | Evidence | Notes |
|------------|--------|----------|-------|
| Upload | **Partial** [C][O] | `POST /files/upload` multipart | NT storage |
| List workspace/project/task | **Partial** [C][O] | | |
| Deleted/trash | **Partial** [C][O] | | |
| Folders CRUD | **Partial** [C][O] | | |
| Versions | **Partial** [C][O] | | |
| Storage persistence | **NT** [E] | Local/MinIO in `files/storage.py` | Blocked |
| Access control | **Partial** [C] | Membership checks in routes | NT cross-tenant |

---

## Collaboration

| Capability | Status | Evidence | Notes |
|------------|--------|----------|-------|
| Notifications list/read | **Partial** [C][O] | | Current user scoped |
| Activities | **Partial** [C][O] | Global + workspace + project | |
| Mentions | **Partial** [C][O] | `/workspaces/{id}/mentions` | |
| Comments global | **Partial** [C][O] | `/workspaces/{id}/comments` | |

---

## Search & Filters

| Capability | Status | Evidence | Notes |
|------------|--------|----------|-------|
| Workspace search | **Partial** [C][O] | 5-bucket response | |
| Persian normalize | **Pass** [C] | `utils/persian.py` + search_service | NT runtime |
| Saved filters CRUD | **Fail** [C] | Model only, no routes | ISS-008 |

---

## Reports

| Capability | Status | Evidence | Notes |
|------------|--------|----------|-------|
| Workspace dashboard | **Partial** [C][M] | Route exists; field mismatch vs FE | ISS-009 |
| Task status | **Partial** [C][M] | Adds `percentage` vs FE | |
| Member performance | **Partial** [C][M] | Field names differ | ISS-010 |
| Time tracking | **Partial** [C][M] | Richer shape than FE mock | Adapter |
| Progress trend | **Partial** [C][M] | Different shape | ISS-011 |
| Export jobs | **Partial** [C] | Model + celery job stub | No route |

---

## Advanced

| Module | Status | Evidence |
|--------|--------|----------|
| Sprints | **Partial** [C][O] | Full CRUD routes |
| Roadmap | **Partial** [C][O] | |
| OKR | **Partial** [C][O] | |
| Time entries | **Partial** [C][O] | |
| Capacity | **Partial** [C][O] | |
| Approvals | **Partial** [C][O] | |
| Estimation | **Partial** [C][O] | |
| Request forms | **Partial** [C][O] | |

---

## Admin

| Capability | Status | Evidence | Notes |
|------------|--------|----------|-------|
| Dashboard | **Partial** [C][O] | Requires `is_system_admin` | NT |
| Users/workspaces/projects | **Partial** [C][O] | | |
| Plans CRUD | **Partial** [C][O] | | |
| Payments/logs/reports | **Partial** [C][O] | | |
| Settings/feature flags | **Partial** [C][O] | | |

---

## Billing

| Capability | Status | Evidence | Notes |
|------------|--------|----------|-------|
| Plans list | **Partial** [C][O] | | |
| Subscription | **Partial** [C][O] | `SubscriptionDetailOut` matches intent | NT |
| Invoices | **Partial** [C][O] | | |
| Select plan / cancel | **Partial** [C][O] | | |
| Payment flow | **Fail** [C] | No payment/result/webhook routes | ISS-014 |
| Payment history | **Fail** [C] | FE `/billing/history` | |

---

## User Settings

| Capability | Status | Evidence | Notes |
|------------|--------|----------|-------|
| Profile/account | **Partial** [C][O] | `/settings/*` + `/auth/me` | |
| Password | **Partial** [C][O] | | |
| Sessions | **Partial** [C][O] | | |
| Notification prefs | **Partial** [C][O] | Persisted to DB | |
| Language | **Partial** [C][O] | | |
| Appearance | **Partial** [C] | In-memory cache | ISS-020 |
| Google connect | **Partial** [C] | URL stub only | |

---

## Cross-cutting

| Concern | Status | Evidence | Notes |
|---------|--------|----------|-------|
| Tenant isolation reads | **NT** [E] | Code uses workspace_id filters | Needs 2-user test |
| Tenant isolation writes | **NT** [E] | `get_workspace_membership` | Needs runtime |
| RBAC enforcement | **Partial** [C] | `require_permission` factory | NT per role |
| Pagination consistency | **Partial** [C] | `Page` on list view only; most lists unpaginated | ISS |
| camelCase JSON | **Pass** [C][R] | `jsonable_encoder` uses aliases | |
| Structured errors Persian | **Partial** [R] | AppError handler ✓ | Pydantic inner English |
| Request ID | **Pass** [C] | `X-Request-ID` middleware | |
| WebSocket | **Partial** [C] | `ws/routes.py` exists | NT |

---

## Summary counts

| Status | Count (approx.) |
|--------|-----------------|
| Pass | 8 |
| Partial | 95+ |
| Fail | 6 |
| Not Tested (env) | All runtime DB/auth/data paths |

**Interpretation:** Route surface is broad (185 endpoints) but **runtime verification is blocked** without PostgreSQL. Most modules are **Partial** — implemented in code/OpenAPI but not proven against frontend contract or live data.
