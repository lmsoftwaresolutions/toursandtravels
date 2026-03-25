# Deployment Instructions (Production)

These steps deploy the production stack and apply database migrations automatically.

## 1. Prerequisites
- Docker Desktop installed and running
- Docker Compose v2 (`docker compose`)

## 2. Environment Files
Create both env files and set real values:

```powershell
Copy-Item .env.example .env
Copy-Item .env.example backend/.env
```

Update in **both** files (at minimum):
- `POSTGRES_*`
- `DATABASE_URL`
- `SECRET_KEY`

## 3. Deploy (Build + Run)
From repo root:

```powershell
docker compose --env-file .env -f docker-compose.yml up -d --build
```  
### Migration are already present then use this 

```
docker compose down
docker compose build backend
docker compose up
```

## 4. Migrations (Automatic)
The backend container runs migrations before app start:

```text
alembic upgrade head && gunicorn ...
```

Check backend logs:

```powershell
docker compose -f docker-compose.yml logs -f backend
```

### One-time fix for existing prod DB without Alembic version table
Only if the schema already matches but migrations are not recorded:

```powershell
docker compose -f docker-compose.yml exec backend alembic stamp head
```

## 5. Health Check

```text
http://localhost:8000/health
```

Expected response:

```json
{"status":"ok"}
```

## 6. Stop / Restart

```powershell
docker compose -f docker-compose.yml down
docker compose -f docker-compose.yml up -d
```

## 7. Quick Post-Deploy Validation
- Create or edit a trip and confirm:
  - `number_of_vehicles`
  - `bus_type`
  - pricing fields
- Verify reports/invoice/print pages render correctly

