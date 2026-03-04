# Docker Deployment Guide

## Prerequisites
- Docker (v20.10+)
- Docker Compose (v2.0+)

## Quick Start

### 1. Build and Run with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

The services will be available at:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **PostgreSQL**: localhost:5432

### 2. Initialize Database

Migrations are applied automatically on backend startup:

```bash
docker-compose up -d --build
```

Manual migration commands (if needed):

```bash
# Access backend container
docker-compose exec backend bash

# Apply all pending migrations
alembic upgrade head
```

If production database already has schema/data and you only need Alembic to start tracking current state:

```bash
alembic stamp head
```

### 3. Create Initial Users

```bash
# Access database container
docker-compose exec db psql -U travel_user -d travel_db


```

## Docker Commands

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Restart Services
```bash
docker-compose restart
```

### Rebuild Services
```bash
docker-compose up -d --build
```

### Remove Everything (including volumes)
```bash
docker-compose down -v
```

## Production Deployment

### 1. Environment Variables

Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

Update the values:
- Change `POSTGRES_PASSWORD` to a secure password
- Set `SECRET_KEY` to a random secure string
- Update `VITE_API_URL` to your production API URL

### 2. Build for Production

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Database Backup

```bash
# Backup
docker-compose exec db pg_dump -U travel_user travel_db > backup.sql

# Restore
docker-compose exec -T db psql -U travel_user travel_db < backup.sql
```

## Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
lsof -ti:8000 | xargs kill -9  # Kill backend
lsof -ti:80 | xargs kill -9    # Kill frontend
```

### Database Connection Issues
```bash
# Check database health
docker-compose exec db pg_isready -U travel_user

# Check database logs
docker-compose logs db
```

### Backend Issues
```bash
# Access backend shell
docker-compose exec backend bash

# Check Python path
echo $PYTHONPATH

# Test database connection
python -c "from app.database.session import SessionLocal; db = SessionLocal(); print('DB Connected')"
```

### Frontend Build Issues
```bash
# Rebuild frontend only
docker-compose build frontend
docker-compose up -d frontend
```

## Development with Docker

For development, you can mount volumes to enable hot-reload:

```bash
# Already configured in docker-compose.yml
# Backend hot-reload is enabled with --reload flag
# Frontend uses nginx so rebuild is needed for changes
```

## Scaling

```bash
# Scale backend instances
docker-compose up -d --scale backend=3
```

## Health Checks

```bash
# Backend health
curl http://localhost:8000/

# Database health
docker-compose exec db pg_isready -U travel_user
```


