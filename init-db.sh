#!/bin/bash
set -e

echo "🚀 Starting database initialization..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
while ! docker-compose exec -T db pg_isready -U travel_user -d travel_db > /dev/null 2>&1; do
  sleep 1
done

echo "✅ Database is ready!"

# Create tables
echo "📋 Creating database tables..."
docker-compose exec -T backend python -c "
from app.database.base import Base
from app.database.session import engine
from app.models import customer, driver, vehicle, trip, fuel, maintenance, spare_part

Base.metadata.create_all(bind=engine)
print('✅ Tables created successfully!')
"

# Create default admin users
echo "👤 Creating default users..."
docker-compose exec -T db psql -U travel_user -d travel_db <<-EOSQL
-- Create admin user (username: Nathkrupa_1, password: admin123)
INSERT INTO users (username, password_hash, role, is_active)
VALUES 
  ('Nathkrupa_1', '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU5L5HFV5VEO', 'admin', true),
  ('Nathkrupa_2', '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU5L5HFV5VEO', 'admin', true),
  ('Nathkrupa_3', '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU5L5HFV5VEO', 'limited', true)
ON CONFLICT (username) DO NOTHING;
EOSQL

echo "✅ Default users created!"
echo ""
echo "🎉 Database initialization complete!"
echo ""
echo "Login credentials:"
echo "  Admin users: Nathkrupa_1 / admin123"
echo "               Nathkrupa_2 / admin123"
echo "  Limited user: Nathkrupa_3 / admin123"
