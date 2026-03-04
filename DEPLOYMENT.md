# Deployment Guide

## 1. Prerequisites
- Docker Desktop installed and running
- Docker Compose v2 (`docker compose`)

## 2. Environment Files
This repo currently uses two compose files with different env paths:

- `docker-compose.yml` (production-style): uses root `.env`
- `docker-compose.local.yml` (local dev): uses `backend/.env`

Create files as needed:

```powershell
Copy-Item .env.example .env
Copy-Item .env.example backend/.env
```

Then update real values in both files (at least `POSTGRES_*`, `DATABASE_URL`, `SECRET_KEY`).

## 3. Run Production-Style Stack
Uses `docker-compose.yml` and root `.env`.

```powershell
docker compose --env-file .env -f docker-compose.yml up -d --build
```

Check:

```powershell
docker compose -f docker-compose.yml ps
docker compose -f docker-compose.yml logs -f
```

Stop:

```powershell
docker compose -f docker-compose.yml down
```

Note: this file uses `expose`, not `ports`, so services are internal unless you run a reverse proxy.

## 4. Run Local Dev Stack
Uses `docker-compose.local.yml` and `backend/.env`.

Use a separate project name to avoid mixing containers with production-style stack:

```powershell
docker compose -p tours_local -f docker-compose.local.yml up -d --build
```

Check:

```powershell
docker compose -p tours_local -f docker-compose.local.yml ps
docker compose -p tours_local -f docker-compose.local.yml logs -f
```

Open in browser:
- Frontend: `http://localhost:8080`
- Backend health: `http://localhost:8000/health`

Stop:

```powershell
docker compose -p tours_local -f docker-compose.local.yml down
```

## 5. Common Issues

### `env file ... not found`
- `docker-compose.yml` requires root `.env`
- `docker-compose.local.yml` requires `backend/.env`

### Non-fast-forward push
Sync first:

```powershell
git pull --rebase origin <branch>
git push origin <branch>
```

### Postgres error: `type "datetime" does not exist`
For PostgreSQL, use `TIMESTAMP`, not `DATETIME` in raw SQL migrations.

## 6. Clean Reset (Optional)

```powershell
docker compose -f docker-compose.yml down -v --remove-orphans
docker compose -p tours_local -f docker-compose.local.yml down -v --remove-orphans
docker system prune -f
```

## 7. Recent Production Updates (2026-03-04)

### Backend / Database (Production-grade schema control)
- Added Alembic migration framework under `backend/alembic/`.
- Added migration config: `backend/alembic.ini`.
- Added baseline migration: `20260304_01_baseline_schema_bootstrap.py`.
- Added schema-sync/backfill migration: `20260304_02_sync_trip_payment_driver_schema_and_backfill.py`.
- Updated `backend/alembic/env.py` to load `DATABASE_URL` from env and use `Base.metadata`.
- Updated `backend/app/models/__init__.py` to import all models for migration discovery.
- Removed runtime schema mutation from app startup (`Base.metadata.create_all` / manual ALTER path removed from `backend/app/main.py`).
- Backend container now runs migrations before app start:
  - `alembic upgrade head && gunicorn ...` (in `docker-compose.yml`).

### Frontend Functional Fixes
- Fixed double-counting during trip creation:
  - `frontend/src/pages/trips/TripForm.jsx`
  
- Print cleanup updates:
  - Removed placeholder contact text and empty contact lines from invoice/payment print templates.
  - Added print-specific hiding for app shell components (`Sidebar`/`Navbar`).
  - Reports page print now opens a dedicated print window containing only report content.

### Deploy Steps After Merge
Run from repo root:

```powershell
# Rebuild and restart services

docker compose -f docker-compose.yml up -d --build

# Verify backend migration + startup logs

docker compose -f docker-compose.yml logs -f backend
```

Expected in backend logs:
- Alembic applies/validates revisions up to head (`20260304_02`)
- Gunicorn starts after migration step

### One-time Note for Existing Production DB
If production database already has schema/data but Alembic version table is missing:

```powershell
docker compose -f docker-compose.yml exec backend alembic stamp head
```

Use `stamp head` only when DB schema is already aligned and you only need to register migration state.

### Quick Post-Deploy Validation
- Open `http://localhost:8000/health` (or your public health endpoint): should return `{"status":"ok"}`.
- Create trip with advance payments: should not show overpayment error due to double-count.
- Open Reports page and use in-app **Print Report** button: header/menu/logout must not appear.
- Open payment/invoice print view: no placeholder `Contact Number: ________` and no empty contact rows.
