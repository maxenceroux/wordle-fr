#!/bin/bash

echo "🎮 Starting Wordle-FR with Docker..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose up -d --build

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check backend health
echo "🔍 Checking backend..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Backend is healthy"
else
    echo "⚠️  Backend may not be ready yet, check logs with: docker-compose logs backend"
fi

# Check frontend
echo "🔍 Checking frontend..."
if curl -s http://localhost/health > /dev/null; then
    echo "✅ Frontend is healthy"
else
    echo "⚠️  Frontend may not be ready yet, check logs with: docker-compose logs frontend"
fi

echo ""
echo "🎉 Wordle-FR is ready!"
echo ""
echo "📍 Access the application at: http://localhost"
echo "📍 Backend API at: http://localhost:3001/api"
echo ""
echo "📋 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart: docker-compose restart"
echo ""
