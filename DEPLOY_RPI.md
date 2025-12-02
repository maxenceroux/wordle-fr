# Deploying Wordle-FR to Raspberry Pi

This guide covers deploying the Wordle-FR application with community features to a Raspberry Pi.

## Prerequisites

### On Raspberry Pi:
- Raspberry Pi 3B+ or newer (supports ARM64)
- Raspberry Pi OS (64-bit recommended)
- Docker and Docker Compose installed
- At least 2GB RAM recommended
- 2GB free disk space

### On Development Machine:
- Docker Desktop with buildx support
- Docker Hub account (or other container registry)

## Option 1: Direct Deployment (Recommended for Testing)

### 1. Transfer Files to Raspberry Pi

```bash
# On your development machine
cd /Users/maxenceroux/Documents/Projects/wordle-fr
rsync -avz --exclude 'node_modules' --exclude '.git' \
  . pi@raspberrypi.local:/home/pi/wordle-fr/
```

### 2. Build and Run on Raspberry Pi

```bash
# SSH into your Raspberry Pi
ssh pi@raspberrypi.local

# Navigate to project directory
cd ~/wordle-fr

# Build and start services
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### 3. Access Application

Open browser: `http://raspberrypi.local` or `http://<raspberry-pi-ip>`

## Option 2: Push Images to Docker Hub (Recommended for Production)

### 1. Set Up Multi-Platform Builder

```bash
# On your development machine
docker buildx create --name multiarch --use
docker buildx inspect --bootstrap
```

### 2. Build and Push Multi-Platform Images

```bash
# Login to Docker Hub
docker login

# Set your Docker Hub username
export DOCKER_USERNAME=yourusername

# Build and push backend (ARM64 + ARM/v7 + AMD64)
cd backend
docker buildx build --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t $DOCKER_USERNAME/wordle-fr-backend:latest \
  --push .

# Build and push frontend
cd ..
docker buildx build --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t $DOCKER_USERNAME/wordle-fr-frontend:latest \
  --push .
```

### 3. Create docker-compose.prod.yml on Raspberry Pi

```yaml
version: '3.8'

services:
  backend:
    image: yourusername/wordle-fr-backend:latest
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
    image: yourusername/wordle-fr-frontend:latest
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
```

### 4. Deploy on Raspberry Pi

```bash
# SSH into your Raspberry Pi
ssh pi@raspberrypi.local

# Create directory and save docker-compose.prod.yml
mkdir -p ~/wordle-fr
cd ~/wordle-fr

# Pull and start services
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Check logs
docker compose -f docker-compose.prod.yml logs -f
```

## Option 3: Use Automated Script

Save this as `deploy-rpi.sh`:

```bash
#!/bin/bash

# Configuration
RPI_HOST="pi@raspberrypi.local"
DOCKER_USERNAME="yourusername"
PROJECT_DIR="/home/pi/wordle-fr"

echo "🚀 Deploying Wordle-FR to Raspberry Pi..."

# Step 1: Build multi-platform images
echo "📦 Building multi-platform images..."
docker buildx build --platform linux/arm64,linux/arm/v7 \
  -t $DOCKER_USERNAME/wordle-fr-backend:latest \
  --push ./backend

docker buildx build --platform linux/arm64,linux/arm/v7 \
  -t $DOCKER_USERNAME/wordle-fr-frontend:latest \
  --push .

# Step 2: Deploy to Raspberry Pi
echo "🔄 Deploying to Raspberry Pi..."
ssh $RPI_HOST << EOF
  cd $PROJECT_DIR || mkdir -p $PROJECT_DIR
  docker compose pull
  docker compose up -d
  docker compose ps
EOF

echo "✅ Deployment complete!"
echo "Access your app at: http://raspberrypi.local"
```

Make it executable:
```bash
chmod +x deploy-rpi.sh
./deploy-rpi.sh
```

## Raspberry Pi Setup (First Time)

### Install Docker on Raspberry Pi

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose -y

# Reboot
sudo reboot
```

## Performance Optimization for Raspberry Pi

### 1. Enable Memory Cgroup (if needed)

Edit `/boot/cmdline.txt`:
```bash
sudo nano /boot/cmdline.txt
```

Add at the end of the line:
```
cgroup_enable=memory cgroup_memory=1
```

Reboot:
```bash
sudo reboot
```

### 2. Set Resource Limits

Update `docker-compose.yml` with memory limits:

```yaml
services:
  backend:
    # ... other config
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
  
  frontend:
    # ... other config
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M
```

## Monitoring

```bash
# Check container status
docker compose ps

# View logs
docker compose logs -f

# Check resource usage
docker stats

# Restart services
docker compose restart

# Stop services
docker compose down

# Update and restart
docker compose pull && docker compose up -d
```

## Troubleshooting

### Out of Memory

```bash
# Check memory
free -h

# Add swap space
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Set CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### Build Fails on ARM

```bash
# Use specific platform
docker buildx build --platform linux/arm64 -t image-name .
```

### Database Permission Issues

```bash
# Fix volume permissions
docker compose down
sudo chown -R 1000:1000 /var/lib/docker/volumes/wordle-fr_backend-data
docker compose up -d
```

## Backup Database

```bash
# Backup SQLite database
docker compose exec backend cp /app/data/wordle.db /app/data/backup-$(date +%Y%m%d).db

# Copy to host
docker cp wordle-fr-backend:/app/data/wordle.db ./wordle-backup.db
```

## Update Application

```bash
# Pull latest code
cd ~/wordle-fr
git pull origin main

# Rebuild and restart
docker compose down
docker compose up -d --build
```

## Production Recommendations

1. **Use Nginx Proxy Manager** or **Traefik** for HTTPS
2. **Set up automated backups** for the database
3. **Monitor with Portainer** for easy container management
4. **Use Watchtower** for automatic updates
5. **Configure firewall** (ufw) to only expose necessary ports

## DNS/Domain Setup

If you want to access via domain name:

1. Set up Dynamic DNS (DuckDNS, No-IP)
2. Configure port forwarding on your router (80, 443)
3. Use Caddy or Nginx Proxy Manager for automatic HTTPS

## Community Feature Notes

- Database is persisted in Docker volume `backend-data`
- Each community has a unique 6-character code
- Communities share different daily words
- All data is stored in SQLite database
- Backup the volume regularly for production use

---

**Need help?** Check logs: `docker compose logs -f backend`
