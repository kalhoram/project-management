# Frontend Mock Service → Backend API Mapping

Replace `lib/api/*.service.ts` implementations with HTTP calls to `NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api/v1`).

## Auth (`lib/api/auth.service.ts`)

| Mock function | HTTP |
|---------------|------|
| `login(email, password)` | `POST /auth/login` `{ identifier, password }` → `TokenResponse.user` |
| `logout()` | `POST /auth/logout` + clear tokens |
| `signup(data)` | `POST /auth/signup` |
| `getCurrentUser()` | `GET /auth/me` |
| `requestPasswordReset(email)` | `POST /auth/forgot-password` |
| `resetPassword(token, password)` | `POST /auth/reset-password` |
| `verifyEmail(token)` | `POST /auth/verify-email` |
| `resendVerificationEmail(email)` | `POST /auth/resend-verification` |
| `verifyTwoFactor(code)` | `POST /auth/two-factor/verify` |
| `connectGoogle(attempt)` | `POST /settings/google/connect` (OAuth URL) |
| `getSessions()` | `GET /settings/sessions` |
| `revokeSession(id)` | `DELETE /settings/sessions/{id}` |
| `updateProfile(data)` | `PATCH /settings/profile` |
| `changePassword(...)` | `POST /settings/password` |

Store `accessToken` + `refreshToken` from login; send `Authorization: Bearer {accessToken}`.

## Workspace (`lib/api/workspace.service.ts`)

| Mock | HTTP |
|------|------|
| `getWorkspaces()` | `GET /workspaces` |
| `getWorkspace(id)` | `GET /workspaces/{id}` |
| `getWorkspaceMembers(id)` | `GET /workspaces/{id}/members` |
| `getWorkspaceTeams(id)` | `GET /workspaces/{id}/teams` |
| `getWorkspaceRoles(id)` | `GET /workspaces/{id}/roles` |
| `getPermissions()` | `GET /permissions` |
| `updateWorkspace(id, data)` | `PATCH /workspaces/{id}` |

## Project / Task / File / Notification / Search / Report / Billing / Admin / Advanced

See OpenAPI at `http://localhost:8000/docs` — routes mirror mock service names under `/api/v1`.

## ID mapping (seed)

Demo entities use deterministic UUIDs from mock labels:

| Mock ID | Seed UUID source |
|---------|------------------|
| `user-admin` | `uuid5(..., "yadbox.user-admin")` |
| `ws-1` | `uuid5(..., "yadbox.ws-1")` |
| `proj-1` | `uuid5(..., "yadbox.proj-1")` |
| `task-1` | `uuid5(..., "yadbox.task-1")` |

Frontend Zustand defaults (`DEFAULT_WORKSPACE_ID=ws-1`) must be updated to real UUIDs after first login, or resolved via slug `acme-product`.

## Demo credentials (seed)

| Login | Password |
|-------|----------|
| `admin` | `123/321` |
| `owner@yadbox.app` | `demo` |
| `admin@yadbox.app` | `demo` |
| `member@yadbox.app` | `demo` |

## Response shape

- JSON field names: **camelCase** (matches `lib/types/index.ts`)
- Dates: ISO-8601 UTC strings
- Errors: `{ success: false, code, message, details }` in Persian
