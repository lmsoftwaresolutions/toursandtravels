# Deployment Instructions (Production)

These steps deploy the production stack and apply database migrations automatically.
## 1. PR  27 and 28
```
git pull 
docker compose down
docker compose build backend
docker compose up --build -d  
```
## this is to clear db data 
```
docker-compose exec -T db psql -U travel_user -d travel_db -c "
DO \$\$ 
DECLARE stmt text;
BEGIN 
  SELECT 'TRUNCATE TABLE ' || string_agg(format('%I.%I', schemaname, tablename), ', ') || ' RESTART IDENTITY CASCADE'
  INTO stmt
  FROM pg_tables 
  WHERE schemaname = 'public' 
    AND tablename NOT IN ('alembic_version', 'users');

  IF stmt IS NOT NULL THEN 
    EXECUTE stmt; 
  END IF; 
END 
\$\$;
"
```

## 1. PR 25 and 26
### Migration are already present then use this 
```
git pull 
docker compose down
docker compose build backend
docker compose up --build -d
```

