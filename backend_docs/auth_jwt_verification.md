# Auth & JWT Verification Report

Generated: 2026-08-02  
Scope: `backend/app/core/security.py`, `auth_service.py`, `dependencies/auth.py`, `routes/auth.py`, `routes/settings.py`, config

---

## 1. Executive verdict

| Question | Answer |
|----------|--------|
| Is JWT implemented? | **Yes** — backend-issued HS256 access JWT |
| External API key required for JWT? | **No** — only local `JWT_SECRET` / `jwt_secret` |
| Where is secret configured? | `JWT_SECRET` env var → `Settings.jwt_secret` (`core/config.py:20`) |
| Suitable for Next.js frontend? | **Partially** — Bearer header model works; frontend must adopt token storage + adapter |
| Production-ready auth? | **No** — default secret, no rate limit enforcement, E2E not verified |

---

## 2. Architecture summary

**Model:** Hybrid JWT access token + opaque refresh token stored server-side.

```
Login → verify password (Argon2) → create UserSession row (refresh hash)
     → return access JWT (15m) + refresh token (30d, rotatable)
     
API calls → Authorization: Bearer <access_jwt>
         → decode JWT → validate sid → load UserSession (not revoked)
         → load User

Refresh → hash(refresh) lookup → rotate refresh hash → new access JWT

Logout → set session.revoked_at
```

**2FA path:** If TOTP enabled → login returns `{ requiresTwoFactor: true, twoFactorToken }` → `POST /auth/two-factor/verify` → full tokens.

---

## 3. JWT implementation details

| Aspect | Implementation | File evidence |
|--------|----------------|---------------|
| Algorithm | HS256 (configurable) | `config.py: jwt_algorithm` |
| Secret | `Settings.jwt_secret` | `security.py: jwt.encode/decode` |
| Access claims | `sub` (user UUID), `sid` (session UUID), `typ=access`, `iat`, `exp` | `security.py:create_access_token` |
| Access TTL | 15 minutes default | `access_token_expire_minutes=15` |
| Refresh token | Opaque url-safe string, SHA-256 hashed in DB | `generate_refresh_token`, `hash_token` |
| Refresh TTL | 30 days | `refresh_token_expire_days=30` |
| Rotation | Yes — new refresh on each refresh call | `auth_service.refresh:243-245` |
| Transport | `Authorization: Bearer` (HTTPBearer) | `dependencies/auth.py` |

---

## 4. Password security

| Check | Status | Evidence |
|-------|--------|----------|
| Hashing algorithm | **Pass** | `CryptContext(schemes=["argon2"])` in `security.py` |
| Plaintext storage | **Pass** | Only `password_hash` on User model |
| Plaintext logging | **Pass** (code review) | No password logging found in auth_service |
| Signup rules | Stricter than FE | Requires letter+digit (`schemas/auth.py:28-31`) |
| Demo passwords in seed | Expected | `scripts/seed.py` hashes at insert |

---

## 5. Session management

| Capability | Status | Route | Notes |
|------------|--------|-------|-------|
| List sessions | Implemented | `GET /auth/sessions`, `GET /settings/sessions` | Duplicate paths |
| Revoke one | Implemented | `DELETE /auth/sessions/{id}`, `/settings/sessions/{id}` | |
| Revoke others | Implemented | `POST /auth/sessions/revoke-others` | Requires current sid from JWT |
| Device metadata | Implemented | device, browser, ip, user_agent on UserSession | |
| Current flag | Implemented | `SessionOut.current` | |

---

## 6. Runtime verification results

Environment: **No PostgreSQL** — login with credentials could not complete.

| Test | Method | Result | Evidence |
|------|--------|--------|----------|
| GET `/api/v1/auth/me` no token | ASGI HTTP | **Pass** | 401, Persian: «ورود به سیستم الزامی است...» |
| POST `/api/v1/auth/login` empty body | ASGI HTTP | **Pass** | 422, Persian envelope, `code: VALIDATION_ERROR` |
| POST `/api/v1/auth/login` with credentials | ASGI HTTP | **Fail** | 500 `ConnectionRefusedError` (Postgres down) |
| Login success + token issue | — | **NT** | Blocked |
| Refresh rotation | — | **NT** | Blocked |
| Logout invalidates session | — | **NT** | Blocked |
| Revoked token → 401 | — | **NT** | Blocked |
| 2FA flow | — | **NT** | Blocked |

---

## 7. Error behavior

| Scenario | Expected | Verified | Evidence |
|----------|----------|----------|----------|
| No token | 401 Persian | **Yes** | `/auth/me` test |
| Invalid body | 422 Persian envelope | **Yes** | login empty |
| Invalid credentials | 401 Persian | Code only | `AuthError("ایمیل/نام کاربری یا رمز عبور نامعتبر است.")` |
| Suspended account | 401 + code | Code only | `ACCOUNT_SUSPENDED` |
| Expired refresh | 401 Persian | Code only | `SESSION_EXPIRED` |
| Permission denied | 403 Persian | Code only | `PermissionDeniedError` |
| DB unavailable | 503 structured | **No** | Returns 500 unhandled |

---

## 8. Security controls gap analysis

| Control | Documented | Implemented | Verdict |
|---------|------------|-------------|---------|
| Argon2 passwords | Yes | Yes | Pass |
| JWT local secret | Yes | Yes (weak default) | Partial |
| Refresh rotation | Yes | Yes | Pass (unverified) |
| Session revocation | Yes | Yes | Pass (unverified) |
| Rate limiting login | Yes | **No** | **Fail** |
| Brute-force lockout | Implied | **No** | **Fail** |
| Security audit log | Architecture doc | Partial | Login audit not verified |
| Email verification gate | Model exists | Not enforced on login | Partial |
| CSRF | N/A for Bearer | N/A | OK for SPA Bearer |
| HttpOnly refresh cookie | Optional in arch | **Not used** — refresh in JSON body | Frontend must secure storage |

---

## 9. Frontend auth flow — required integration steps

Current frontend (`lib/api/auth.service.ts`):
- Stores only `userId` in localStorage
- `login(email, password)` returns `User` directly
- No token handling

**Required backend flow for frontend:**

1. `POST /api/v1/auth/login` with `{ "identifier": "<email or username>", "password": "..." }`
2. Response (camelCase):
   ```json
   {
     "accessToken": "...",
     "refreshToken": "...",
     "tokenType": "bearer",
     "expiresIn": 900,
     "user": { "id": "...", "name": "...", "role": "owner", ... }
   }
   ```
3. Store `accessToken` (memory or secure storage) + optionally `refreshToken`
4. Attach header: `Authorization: Bearer ${accessToken}`
5. On 401 → `POST /api/v1/auth/refresh` with `{ refreshToken }` → update tokens
6. `GET /api/v1/auth/me` for session restore (preferred over localStorage user id)
7. `POST /api/v1/auth/logout` with valid Bearer token

**2FA branch:** If `requiresTwoFactor: true`, call `/auth/two-factor/verify` with `{ twoFactorToken, code }`.

---

## 10. External credentials — what IS needed

| Integration | External credential? |
|-------------|---------------------|
| JWT auth | **No** — local `JWT_SECRET` only |
| Google OAuth | **Yes** — `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Email | **Yes** — SMTP settings if `EMAIL_ENABLED=true` |
| Payments | **Yes** — payment provider when wired (abstraction exists) |
| MinIO/S3 | **Yes** — storage keys for file uploads in prod |
| Redis | **Yes** — for Celery/rate limits (not enforced yet) |

---

## 11. Production readiness score (auth only)

**Score: 52 / 100**

| Factor | Weight | Score |
|--------|--------|-------|
| Core JWT/session design | 25 | 20 |
| Password security | 15 | 15 |
| Runtime verified | 20 | 5 |
| Rate limiting / abuse | 15 | 0 |
| Error handling / i18n | 10 | 7 |
| Frontend contract alignment | 15 | 5 |

**Blockers before production auth:** rotate secret, enforce rate limits, verify E2E, fix DB-down 500, ship frontend token client.

---

## 12. Recommended next actions (priority order)

1. Start Postgres → run seed → verify login/refresh/logout/me with HTTP evidence
2. Set strong `JWT_SECRET` in `.env`; fail boot if default in production
3. Implement Redis rate limiter on `/auth/login`, `/auth/forgot-password`
4. Add `/ready` Postgres check
5. Build frontend auth adapter (identifier + TokenResponse)
6. Add global exception handler for DB connection errors → 503 Persian
7. Translate Pydantic validation messages to Persian
