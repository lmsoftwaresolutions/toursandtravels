# Deployment Instructions (Production)

These steps deploy the production stack and apply database migrations automatically.

## 1. PR 25 and 26
### Migration are already present then use this 
```
docker-compose down
git pull
docker-compose build backend
docker-compose up --build -d
```


