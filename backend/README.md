# YadBox Backend

Production-grade FastAPI backend for the YadBox (یادباکس) project-management SaaS UI.

## Quick start (Docker)

```bash
cd backend/docker
docker compose up --build
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs  
Health: http://localhost:8000/health

## Local (without Docker)

1. **Start Docker Desktop**, then infrastructure:
   ```bash
   cd backend/docker
   docker compose up -d postgres redis minio
   ```
   Or start PostgreSQL 16 and Redis locally.
2. Copy env: `cp .env.example .env`
3. Generate a secure JWT secret (recommended even for local):
   ```bash
   openssl rand -hex 32
   ```
   Set `JWT_SECRET` in `.env`. In `APP_ENV=production`, the API **refuses to start** with an unsafe default secret.
4. Install: `pip install -r requirements.txt`
5. Migrate + seed:
   ```bash
   cd backend
   alembic upgrade head
   python -m scripts.seed
   ```
6. Run API: `uvicorn app.main:app --reload --port 8000`

## Health & readiness

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Liveness — always 200 when process is up |
| `GET /ready` | Readiness — probes PostgreSQL, Redis, optional storage; returns **503** if required deps are down |

## Auth notes

- Login accepts `{ \"identifier\", \"password\" }` **or** frontend-compatible `{ \"email\", \"password\" }`.
- Response is `TokenResponse` (access + refresh tokens + `user`). Frontend must store tokens and call `/auth/me`.
- Rate limiting is enforced on login, refresh, signup, forgot/reset password (Redis with in-memory fallback in local dev).

## Demo login

| User | Password |
|------|----------|
| `admin` | `123/321` (username login also works) |
| `owner@yadbox.app` | `demo` |
| `demo@yadbox.app` | `Demo1234!` (local demo account — `کاربر دمو یادباکس`) |

## Verification scripts

```bash
cd backend
python scripts/verify_auth.py    # JWT/login runtime checks
python scripts/verify_files.py   # demo file counts via API
```

Postman: import `postman_collection.json` + `postman_environment.json` from the repo root.

- `backend_docs/frontend_contract_audit.md` — UI contract inventory
- `backend_docs/backend_architecture.md` — architecture
- `backend_docs/frontend_to_backend_mapping.md` — mock → API mapping

## Stack

Python 3.12, FastAPI, SQLAlchemy 2 async, PostgreSQL, Redis, Celery, MinIO, JWT auth, Persian/RTL error messages.
