# Frontend Integration Readiness

Generated: 2026-08-02  
References: `lib/api/*.service.ts`, `backend_docs/frontend_to_backend_mapping.md`, OpenAPI at `/openapi.json`

---

## Overall readiness verdict

**Not ready for blind mock replacement.**  
Route coverage is high (~185 endpoints vs ~80 mock operations), but **runtime verification is blocked** without PostgreSQL, and **multiple contract adapters are mandatory** before pages work without changes.

**Integration readiness score: 38 / 100** (see main report for formula)

---

## Ready now (after DB + seed only — minimal adapter)

These can connect once Postgres is running and auth client exists. Still require Bearer token + UUID IDs.

| Frontend file | Functions | Backend endpoints | Adapter needed |
|---------------|-----------|-------------------|----------------|
| `workspace.service.ts` | `getPermissions` | `GET /api/v1/permissions` | Auth header only |
| `workspace.service.ts` | `getWorkspaces` | `GET /api/v1/workspaces` | Auth header only |
| `workspace.service.ts` | `getWorkspace` | `GET /api/v1/workspaces/{id}` | UUID not `ws-1` |
| `workspace.service.ts` | `updateWorkspace` | `PATCH /api/v1/workspaces/{id}` | Field names OK (camelCase) |
| `workspace.service.ts` | `getWorkspaceTeams` | `GET .../teams` | Auth + UUID |
| `workspace.service.ts` | `getWorkspaceRoles` | `GET .../roles` | Auth + UUID |
| `project.service.ts` | `getProject` | `GET /api/v1/projects/{id}` | UUID |
| `project.service.ts` | `getKanbanColumns` | `GET .../kanban/columns` | UUID |
| `project.service.ts` | `createProject` / `updateProject` | POST/PATCH projects | UUID workspace |
| `task.service.ts` | `getTask` / `updateTask` | GET/PATCH `/tasks/{id}` | UUID |
| `task.service.ts` | `getTasks` | `GET /projects/{id}/tasks` | UUID |
| `notification.service.ts` | `markNotificationRead` | `POST /notifications/{id}/read` | Auth (ignore userId param) |
| `notification.service.ts` | `markAllNotificationsRead` | `POST /notifications/read-all` | Auth |
| `billing.service.ts` | `getPlans` | `GET /billing/plans` | Public |
| `admin.service.ts` | most list endpoints | `/api/v1/admin/*` | System admin user + token |

---

## Partial — adapter required

| Frontend file | Issue | Fix |
|---------------|-------|-----|
| **`auth.service.ts`** | `login(email,password)→User`; backend `{identifier}`→`TokenResponse` | New API client + token store; map response.user |
| **`auth.service.ts`** | `getCurrentUser()` uses localStorage id | Call `GET /auth/me` with Bearer |
| **`auth.service.ts`** | `signup` returns User not tokens | Handle TokenResponse like login |
| **`auth.service.ts`** | `verifyEmail` returns `{success,expired?}` | Map backend `MessageResponse` |
| **`workspace.service.ts`** | `getWorkspaceMembers` returns `User[]` | Backend returns `MemberOut[]` — map shape |
| **`project.service.ts`** | `getProjects` | Same; filter active by default OK |
| **`project.service.ts`** | `getArchivedProjects` / `getDeletedProjects` | Use `?scope=archived` / `?scope=deleted` |
| **`task.service.ts`** | `getLabels()` no workspace | `GET /workspaces/{wsId}/labels` |
| **`task.service.ts`** | `getWorkspaceTasks` | `GET /workspaces/{wsId}/tasks` |
| **`file.service.ts`** | Read-only mocks | Wire list endpoints; **upload** needs multipart client |
| **`search.service.ts`** | `globalSearch(q)` | `GET /workspaces/{wsId}/search?q=` |
| **`report.service.ts`** | All functions | Path + response field mapping (see ISS-009–011) |
| **`billing.service.ts`** | `getSubscription` | Path OK; verify `usage`/`renewalDate` fields at runtime |
| **`billing.service.ts`** | `getPayments` | `GET /admin/payments` or add workspace-scoped route |
| **`advanced.service.ts`** | All workspace lists | Paths under `/workspaces/{id}/...` — mostly aligned |
| **`advanced.service.ts`** | `getMyTasks(userId)` | `GET /tasks/my` — ignore userId (server uses current user) |
| **`advanced.service.ts`** | `getAdminSettings` | `GET /api/v1/admin/settings` not advanced route |
| **Kanban/List/Calendar pages** | Use task hooks | Prefer view endpoints: `/projects/{id}/kanban`, `/list`, etc. |

---

## Blocked — backend gap or not verified

| Frontend surface | Blocker |
|--------------------|---------|
| Saved filters UI | **No API routes** (ISS-008) |
| `/billing/payment`, `/billing/history`, `/billing/result` | **No payment/history/result endpoints** |
| `/workspaces/.../security` | **No dedicated API** |
| `/workspaces/.../notifications` (workspace) | **No dedicated API** |
| Report exports | No export route (job model only) |
| Realtime updates | No WebSocket client in FE; WS route NT |
| Full E2E smoke | **PostgreSQL not running** |
| Tenant/RBAC proof | **Requires seeded multi-user runtime tests** |
| File upload/download | **Storage not runtime-tested** |

---

## ID migration guide

| Mock ID | Seeded UUID (deterministic) |
|---------|----------------------------|
| `ws-1` | `326613e1-f483-5194-9a8a-fd95e5560352` |
| `user-admin` | `917a52cd-d3d0-51d5-8a7a-0818f040064e` |
| `proj-1` | `98a5a175-72f0-514e-9ca3-bd9ae2a019d8` |

Slug lookup: seeded workspace slug = **`acme-product`**

**Do not** hardcode these in frontend — resolve from `GET /workspaces` after login.

---

## Recommended integration sequence

1. **Infrastructure:** Docker Postgres + migrate + seed  
2. **Auth layer:** `lib/api/http-client.ts` (base URL, Bearer, refresh interceptor)  
3. **Auth service:** Replace mock login/signup/me/logout  
4. **Workspace context:** After login, set Zustand workspace from API list  
5. **Core CRUD:** projects → tasks → notifications  
6. **Views:** kanban/list endpoints  
7. **Reports/billing:** with response adapters  
8. **Advanced modules:** incremental  
9. **Blocked modules:** backend routes for saved filters + billing payment  

---

## Compatibility matrix (frontend service → backend)

| Service file | Mock ops | Backend coverage | Ready? |
|--------------|----------|------------------|--------|
| auth.service.ts | 14 | 14 routes | **Partial** — adapter |
| workspace.service.ts | 7 | 7+ | **Partial** |
| project.service.ts | 8 | 8+ | **Partial** |
| task.service.ts | 7 | 10+ | **Partial** |
| file.service.ts | 6 | 10+ (incl upload) | **Partial** |
| notification.service.ts | 5 | 5 | **Partial** |
| search.service.ts | 1 | 1 | **Partial** |
| report.service.ts | 5 | 5 | **Partial** — shape |
| billing.service.ts | 5 | 3 | **Blocked** partial |
| admin.service.ts | 11 | 11 | **Partial** — admin auth |
| advanced.service.ts | 14 | 14+ | **Partial** |

---

## Minimal HTTP client sketch (for integrators)

```typescript
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken() // from memory/storage
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? res.statusText)
  }
  return res.json()
}
```

Login adapter:

```typescript
export async function login(email: string, password: string) {
  const data = await api<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: email, password }),
  })
  if (data.requiresTwoFactor) redirectTo2FA(data.twoFactorToken)
  saveTokens(data.accessToken, data.refreshToken)
  return data.user!
}
```

---

## Sign-off checklist before production frontend cutover

- [ ] Postgres seed verified with demo login HTTP trace  
- [ ] All hooks use UUID from API not mock constants  
- [ ] Token refresh flow tested  
- [ ] RBAC spot-check: guest cannot create project (403 Persian)  
- [ ] Cross-workspace access returns 404/403 not foreign data  
- [ ] Dashboard/report field adapters in place  
- [ ] Billing payment routes or pages remain mock until backend complete  
- [ ] Saved filters deferred or backend implemented  
