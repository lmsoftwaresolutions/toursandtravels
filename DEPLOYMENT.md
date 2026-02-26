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
