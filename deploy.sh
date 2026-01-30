#!/bin/bash
set -e

echo "🚀 Nathkrupa Travels - Docker Deployment"
echo "========================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update the .env file with your production credentials!"
    echo ""
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true
echo ""

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Initialize database
echo ""
echo "💾 Initializing database..."
./init-db.sh

echo ""
echo "======================================"
echo "✅ Deployment complete!"
echo "======================================"
echo ""
echo "🌐 Services are running:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8000"
echo "   Database:  localhost:5432"
echo ""
echo "👤 Login with:"
echo "   Admin:    Nathkrupa_1 / admin123"
echo "   Limited:  Nathkrupa_3 / admin123"
echo ""
echo "📊 View logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Stop services:"
echo "   docker-compose down"
echo ""
