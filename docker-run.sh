#!/bin/bash

# Docker run script
# Used to quickly start MGX-Demo container

set -e

echo "🚀 Starting MGX-Demo container (bridge network - compatible with all platforms)..."
echo ""

# Stop and remove old container (if exists)
if docker ps -a | grep -q "mgx-demo-app"; then
    echo "🛑 Stopping old container..."
    docker-compose down || true
fi

# Start with docker-compose (will auto-build image if not exists)
echo "🐳 Starting services with docker-compose (bridge network mode)..."
echo "   Image name: mgx-demo:latest"
echo ""
docker-compose up -d --build

echo ""
echo "✅ Container started successfully!"
echo ""
echo "📋 Service information (bridge network mode - port mapping):"
echo "  - Frontend app: http://localhost:5173"
echo "  - Backend API: http://localhost:8000"
echo "  - API docs: http://localhost:8000/docs"
echo "  - Dynamic projects: http://localhost:5174-5180"
echo ""
echo "💡 Tip: Using bridge network mode, compatible with macOS/Windows/Linux"
echo ""
echo "📝 Common commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop services: docker-compose down"
echo "  - Restart services: docker-compose restart"
echo "  - Enter container: docker exec -it mgx-demo-app bash"
echo ""

