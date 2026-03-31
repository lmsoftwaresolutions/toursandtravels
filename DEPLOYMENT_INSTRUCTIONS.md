# Deployment Instructions (Production)

These steps deploy the production stack and apply database migrations automatically.
## 1. PR  27 and 28
git pull 
docker compose down
docker compose build backend
docker compose up --build -d  

## 1. PR 25 and 26
### Migration are already present then use this 
git pull 
docker compose down
docker compose build backend
docker compose up --build -d  


