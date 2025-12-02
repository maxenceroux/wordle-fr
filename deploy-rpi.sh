#!/bin/bash

# Wordle-FR Raspberry Pi Deployment Script
# Supports both direct deployment and Docker Hub push

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOCKER_USERNAME="${DOCKER_USERNAME:-yourusername}"
RPI_HOST="${RPI_HOST:-pi@raspberrypi.local}"
RPI_DIR="${RPI_DIR:-/home/pi/wordle-fr}"
USE_DOCKER_HUB="${USE_DOCKER_HUB:-false}"

echo "🎯 Wordle-FR Raspberry Pi Deployment"
echo "======================================"
echo ""

# Check if docker buildx is available
if ! docker buildx version &> /dev/null; then
    echo -e "${RED}❌ Docker buildx not found. Please install Docker Desktop with buildx support.${NC}"
    exit 1
fi

# Function to build and push to Docker Hub
deploy_via_dockerhub() {
    echo -e "${YELLOW}📦 Building multi-platform images for ARM...${NC}"
    
    # Create/use multiarch builder
    docker buildx create --name multiarch --use 2>/dev/null || docker buildx use multiarch
    docker buildx inspect --bootstrap
    
    # Login to Docker Hub
    echo -e "${YELLOW}🔐 Logging into Docker Hub...${NC}"
    docker login
    
    # Build and push backend
    echo -e "${YELLOW}🏗️  Building backend (ARM64 + ARMv7)...${NC}"
    docker buildx build \
        --platform linux/arm64,linux/arm/v7 \
        -t $DOCKER_USERNAME/wordle-fr-backend:latest \
        --push \
        ./backend
    
    # Build and push frontend
    echo -e "${YELLOW}🏗️  Building frontend (ARM64 + ARMv7)...${NC}"
    docker buildx build \
        --platform linux/arm64,linux/arm/v7 \
        -t $DOCKER_USERNAME/wordle-fr-frontend:latest \
        --push \
        .
    
    echo -e "${GREEN}✅ Images pushed to Docker Hub${NC}"
    
    # Deploy to Raspberry Pi
    echo -e "${YELLOW}🚀 Deploying to Raspberry Pi...${NC}"
    
    # Create docker-compose file on RPI
    ssh $RPI_HOST "mkdir -p $RPI_DIR"
    
    # Copy docker-compose.prod.yml or create it
    cat > /tmp/docker-compose.prod.yml <<EOF
version: '3.8'

services:
  backend:
    image: $DOCKER_USERNAME/wordle-fr-backend:latest
    container_name: wordle-fr-backend
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - DB_PATH=/app/data/wordle.db
      - NODE_ENV=production
    volumes:
      - backend-data:/app/data
    networks:
      - wordle-network
    restart: unless-stopped

  frontend:
    image: $DOCKER_USERNAME/wordle-fr-frontend:latest
    container_name: wordle-fr-frontend
    ports:
      - "80:80"
    environment:
      - VUE_APP_API_URL=/api
    depends_on:
      - backend
    networks:
      - wordle-network
    restart: unless-stopped

volumes:
  backend-data:
    driver: local

networks:
  wordle-network:
    driver: bridge
EOF
    
    scp /tmp/docker-compose.prod.yml $RPI_HOST:$RPI_DIR/docker-compose.yml
    rm /tmp/docker-compose.prod.yml
    
    # Pull and start on RPI
    ssh $RPI_HOST << EOF
        cd $RPI_DIR
        docker compose pull
        docker compose down 2>/dev/null || true
        docker compose up -d
        echo ""
        echo "Container status:"
        docker compose ps
EOF
}

# Function to deploy directly to RPI
deploy_direct() {
    echo -e "${YELLOW}📦 Syncing files to Raspberry Pi...${NC}"
    
    # Sync files (excluding node_modules and .git)
    rsync -avz \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'dist' \
        --exclude 'backend/data' \
        . $RPI_HOST:$RPI_DIR/
    
    echo -e "${YELLOW}🏗️  Building and starting on Raspberry Pi...${NC}"
    
    # Build and start on RPI
    ssh $RPI_HOST << EOF
        cd $RPI_DIR
        docker compose down 2>/dev/null || true
        docker compose up -d --build
        echo ""
        echo "Container status:"
        docker compose ps
EOF
}

# Main menu
echo "Select deployment method:"
echo "1) Direct deployment (build on RPi - slower)"
echo "2) Docker Hub (build on Mac, pull on RPi - recommended)"
echo ""
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        deploy_direct
        ;;
    2)
        if [ "$DOCKER_USERNAME" == "yourusername" ]; then
            echo -e "${RED}❌ Please set DOCKER_USERNAME environment variable${NC}"
            echo "Example: export DOCKER_USERNAME=yourdockerhubusername"
            exit 1
        fi
        deploy_via_dockerhub
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Get RPI IP
RPI_IP=$(ssh $RPI_HOST "hostname -I | awk '{print \$1}'")

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Access your application at:"
echo "  http://$RPI_IP"
echo "  http://raspberrypi.local"
echo ""
echo "Useful commands:"
echo "  View logs:    ssh $RPI_HOST 'cd $RPI_DIR && docker compose logs -f'"
echo "  Restart:      ssh $RPI_HOST 'cd $RPI_DIR && docker compose restart'"
echo "  Stop:         ssh $RPI_HOST 'cd $RPI_DIR && docker compose down'"
echo "  Status:       ssh $RPI_HOST 'cd $RPI_DIR && docker compose ps'"
echo ""
