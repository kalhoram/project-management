# Backend Architecture — YadBox FastAPI

Aligned with `frontend_contract_audit.md`. Workspace is the primary tenant boundary. JSON uses **camelCase** aliases to match TypeScript types.

---

## 1. Domain Model (Bounded Contexts)

| Module | Responsibilities |
|--------|------------------|
| **identity** | User, profile, sessions, OAuth, 2FA, password/email tokens |
| **tenancy** | Workspace, members, invites, teams, roles/permissions |
| **projects** | Projects, categories, members, workflows, columns, custom fields |
| **work** | Tasks, checklists, dependencies, labels, recurring, comments |
| **collaboration** | Activity, notifications, preferences, mentions |
| **content** | Files, folders, versions, object storage |
| **views** | Kanban/list/calendar/timeline/gantt query + reorder |
| **planning** | Sprints, roadmap, OKR, estimation, capacity |
| **time** | Time entries, timers, timesheets |
| **intake** | Request forms, submissions, approval workflows |
| **insights** | Dashboards, reports, exports |
| **search** | Global/scoped search, saved filters, Persian normalization |
| **billing** | Plans, subscriptions, invoices, payments, usage limits |
| **admin** | System metrics, feature flags, maintenance, system logs |
| **platform** | Audit, jobs, realtime WS, health, observability |

---

## 2. Project Layout

```
backend/
  app/
    main.py
    api/v1/routes/          # thin HTTP adapters
    core/                   # config, security, logging, exceptions
    db/                     # session, base, mixins
    models/                 # SQLAlchemy models
    schemas/                # Pydantic v2 (camelCase)
    repositories/           # data access
    services/               # business rules
    permissions/            # RBAC helpers
    events/                 # domain events
    ws/                     # websocket hub
    tasks/                  # Celery tasks
    search/                 # normalization + query
    billing/                # provider abstraction
    files/                  # storage abstraction (MinIO/S3)
    notifications/
    reports/
    admin/
    middleware/
    dependencies/
    integrations/           # email, google oauth
  alembic/
  tests/
  scripts/                  # seed, bootstrap
  docker/
  backend_docs/             # (symlink / copy of root docs)
```

---

## 3. Tenancy Model

- **Tenant key:** `workspace_id` (UUID FK)
- Every domain table includes `workspace_id` except: User, system Plan catalog, FeatureFlag, MaintenanceState, SystemLog, global Permission catalog
- Membership via `workspace_members (user_id, workspace_id, role, status)`
- Project-level ACL via `project_members`
- **Rule:** repository methods always filter by tenant; services assert membership before mutate
- System admin routes bypass tenant but are gated by `users.is_system_admin`

---

## 4. Auth Architecture

| Piece | Design |
|-------|--------|
| Password | Argon2id (pwdlib/passlib) |
| Access JWT | 15m, HS256/RS256, claims: `sub`, `sid`, `typ=access` |
| Refresh | Opaque token hashed in DB (`user_sessions`), 30d, rotation on use |
| Transport | `Authorization: Bearer` for access; refresh in body or httpOnly cookie (`yb_refresh`) |
| Login | email **or** username (case-insensitive) |
| 2FA | TOTP + hashed recovery codes; login may return `requiresTwoFactor` |
| OAuth | Google OIDC; link via `oauth_accounts` |
| Rate limit | Redis sliding window on login/forgot/reset/OTP |
| Sessions | device, browser, IP, location, `current` flag |
| Audit | login success/fail, password change, 2FA, revoke |

Demo passwords for seed: `admin` → `123/321`; role demos → `demo`.

---

## 5. RBAC / ABAC

### RBAC
- System permission catalog (seed 10 keys matching frontend)
- Workspace roles (system + custom) → permission keys
- Effective permissions = role permissions ∪ project role overrides

### ABAC (light)
- Resource ownership (`owner_id`, `assignee_id`, `reporter_id`)
- Project membership for private projects
- Visibility: private / team / public within workspace

### Enforcement
Dependency: `require_permission("tasks.create")` resolves workspace from path, loads membership, checks key. Deny → `403` Persian message.

---

## 6. DB Schema Plan (PostgreSQL)

### Cross-cutting mixins
`id (UUID PK)`, `created_at`, `updated_at`, `deleted_at?`, `created_by_id?`, `updated_by_id?`, `version` (optimistic lock where needed)

### Tables (core)
`users`, `user_profiles`, `user_sessions`, `email_verification_tokens`, `password_reset_tokens`, `two_factor_methods`, `oauth_accounts`, `workspaces`, `workspace_members`, `workspace_invites`, `teams`, `team_members`, `permissions`, `roles`, `role_permissions`, `projects`, `project_categories`, `project_members`, `kanban_columns`, `project_status_workflows`, `custom_fields`, `custom_field_values`, `tasks`, `task_labels` / `labels`, `task_assignees`, `task_checklists`, `task_checklist_items`, `task_dependencies`, `task_comments`, `comment_reactions`, `attachments`, `file_objects`, `file_versions`, `folders`, `activity_logs`, `notifications`, `notification_preferences`, `saved_filters`, `sprints`, `sprint_tasks`, `roadmap_items`, `okr_objectives`, `okr_key_results`, `time_entries`, `capacity_plans`, `request_forms`, `request_submissions`, `approval_workflows`, `approval_requests`, `approval_steps`, `estimation_records`, `report_export_jobs`, `plans`, `subscriptions`, `invoices`, `payments`, `billing_customers`, `system_logs`, `feature_flags`, `maintenance_states`, `audit_logs`

Indexes: `(workspace_id, ...)`, unique `(workspace_id, slug)`, `(workspace_id, project.key)`, FTS/trigram on Persian-normalized columns where useful.

Collation: UTF8; use `unaccent`-style custom normalize for ی/ي، ک/ك، ZWNJ.

---

## 7. Event Model

Domain events published in-process → Redis pub/sub / Celery:

`user.registered`, `workspace.created`, `member.invited`, `task.created|updated|moved|completed`, `comment.created`, `file.uploaded`, `approval.decided`, `subscription.changed`, `export.ready`

Consumers: notifications, activity log, WS broadcast, webhooks (future), audit.

---

## 8. Search Model

1. Normalize query: Arabic→Persian chars, collapse whitespace/ZWNJ, lower English
2. Scoped ILIKE / pg_trgm on title, key, name, body
3. Global search returns same five buckets as frontend
4. Ranking: exact key > prefix > contains; recent boost

---

## 9. Notification Model

- Persist `notifications` rows (Persian title/body)
- Preferences: assignments, mentions, comments, deadlines, status, weekly digest
- Fanout via Celery; WS push to user channel
- Mark read / read-all

---

## 10. Billing Model

- `plans` catalog (admin mutable)
- `subscriptions` per workspace: status, period, renewal_at, plan_id
- Usage counters computed live + cached
- `PaymentProvider` protocol: create_intent, verify_webhook, cancel
- Local/dev: `FakePaymentProvider` for tests only; prod: injectable gateway
- Enforce plan limits on create member/project/upload

---

## 11. File Model

- Metadata in DB; bytes in MinIO (dev) / S3 (prod)
- Upload: multipart or presigned PUT
- Versioning: `file_versions`; restore prior version
- Soft delete → trash; permanent delete job
- ACL: workspace membership + project scope
- Hooks: content-type allowlist, size ≤ `maxUploadMb`, malware-scan stub

---

## 12. Background Jobs (Celery + Redis)

| Job | Purpose |
|-----|---------|
| `send_email` | verification, reset, invites |
| `fanout_notification` | multi-recipient |
| `generate_export` | CSV/XLSX/PDF |
| `process_file` | thumbnails/metadata |
| `generate_recurring_tasks` | daily |
| `deadline_reminders` | hourly |
| `cleanup_expired_tokens` | daily |
| `billing_webhook_retry` | as needed |
| `audit_compaction` | optional |

---

## 13. Observability

- Structured JSON logs (`structlog`) with `request_id`
- `/health`, `/ready`, `/metrics` (optional Prometheus)
- OpenTelemetry-ready middleware stubs
- Admin-visible `system_logs` for ops events
- AuditLog for sensitive mutations

---

## 14. Deployment

```
docker-compose:
  api (uvicorn)
  worker (celery)
  beat (celery beat)
  postgres:16
  redis:7
  minio
```

Env: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `MINIO_*`, `SMTP_*`, `GOOGLE_OAUTH_*`, `SENTRY_DSN`, `CORS_ORIGINS`

Alembic migrations on startup or `scripts/migrate.sh`. Seed: `python -m scripts.seed`.

---

## 15. API Envelope & Errors

- Entities returned as camelCase JSON matching TS interfaces
- Mutations that currently return `{success:boolean}` keep that shape
- Errors:
  - `400 VALIDATION_ERROR`
  - `401 AUTH_REQUIRED` / `AUTH_INVALID`
  - `403 PERMISSION_DENIED`
  - `404 NOT_FOUND`
  - `409 CONFLICT`
  - `429 RATE_LIMITED`
  - `503 MAINTENANCE`

All `message` fields in Persian.

---

## 16. View Endpoints Strategy

| View | Payload |
|------|---------|
| Kanban | columns + tasks grouped; move/reorder endpoints update `column_id`, `status`, `order` |
| List | flat tasks + filters; bulk-update |
| Calendar | tasks in `[from,to]` with due/start |
| Timeline/Gantt | bars `{id,start,end,progress,deps[]}`; schedule update with conflict checks |

---

## 17. Implementation Order

1. Core + DB + Auth
2. Workspaces / RBAC / Teams
3. Projects / Categories / Columns
4. Tasks / Comments / Checklists / Dependencies
5. Views
6. Files
7. Notifications / Search / Saved filters
8. Reports / Exports
9. Advanced (sprint…estimation)
10. Admin + Billing + Settings
11. WS + Celery
12. Tests + Docker + Seed + mapping doc

---

## 18. Frontend Integration

Replace each mock service method with `fetch`/`httpx` client calling `/api/v1/...` while preserving return types. See `frontend_to_backend_mapping.md`.
