# Wordle-FR with Docker & SQLite Persistence

This project has been refactored to persist best scores and word of the day using a SQLite database, with full Docker support for easy deployment.

## Architecture

The application consists of two services:
- **Frontend**: Vue.js application served by Nginx
- **Backend**: Node.js/Express API with SQLite database

## Features

### Backend API
- **SQLite Database**: Persistent storage for scores and word of the day
- **Score Tracking**: Records username, word, number of tries, and time taken
- **Word of Day Management**: Stores and retrieves daily words
- **Leaderboard**: View top scores across all users
- **User Stats**: Get personal best scores by username

### Frontend Integration
- **Username Caching**: Prompts for username once, then caches locally
- **Automatic Sync**: Scores automatically saved to backend when game completes
- **Backward Compatible**: Maintains existing localStorage functionality

## Quick Start

### Prerequisites
- Docker
- Docker Compose

### Running the Application

1. **Start all services:**
   ```bash
   docker-compose up -d
   ```

2. **Access the application:**
   - Frontend: http://localhost
   - Backend API: http://localhost:3001/api

3. **Stop the services:**
   ```bash
   docker-compose down
   ```

4. **Stop and remove volumes (clears database):**
   ```bash
   docker-compose down -v
   ```

### View Logs

```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

## API Endpoints

### Health Check
```
GET /api/health
```

### Word of the Day
```
GET /api/word-of-day/:date
POST /api/word-of-day
Body: { date: "YYYY-MM-DD", word: "WORD" }
```

### Scores
```
POST /api/scores
Body: { username: "user", word: "WORD", tries: 3, timeTaken: 45, date: "YYYY-MM-DD" }

GET /api/scores/:username?limit=10
GET /api/leaderboard?limit=20
GET /api/stats/:date
```

## Development

### Local Development (without Docker)

1. **Backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Frontend:**
   ```bash
   npm install
   npm run serve
   ```

### Building Images

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build backend
docker-compose build frontend
```

## Database

The SQLite database is stored in a Docker volume (`backend-data`) and persists between container restarts.

### Database Schema

**scores table:**
- `id`: Primary key
- `username`: Player username
- `word`: The word that was guessed
- `tries`: Number of attempts taken
- `time_taken`: Time taken in seconds
- `date`: Date of the game (YYYY-MM-DD)
- `created_at`: Timestamp

**word_of_day table:**
- `id`: Primary key
- `date`: Date (YYYY-MM-DD, unique)
- `word`: The word for that day
- `created_at`: Timestamp

### Accessing Database Directly

```bash
# Open a shell in the backend container
docker-compose exec backend sh

# Navigate to data directory
cd data

# Open SQLite database (if sqlite3 is installed)
sqlite3 wordle.db
```

## Configuration

### Environment Variables

**Backend (.env or docker-compose.yml):**
- `PORT`: Backend server port (default: 3001)
- `DB_PATH`: SQLite database file path
- `NODE_ENV`: Environment (production/development)

**Frontend:**
- `VUE_APP_API_URL`: Backend API URL
- `VUE_APP_BUILD_ID`: Build identifier

## Volumes

- `backend-data`: Persistent storage for SQLite database

## Network

All services run on the `wordle-network` bridge network, allowing inter-service communication.

## Troubleshooting

### Port Already in Use
If port 80 or 3001 is already in use, modify the port mappings in `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "8080:80"  # Changed from 80:80
  backend:
    ports:
      - "3002:3001"  # Changed from 3001:3001
```

### Database Not Persisting
Ensure the volume is properly created:
```bash
docker volume ls
docker volume inspect wordle-fr_backend-data
```

### Backend Connection Issues
Check backend health:
```bash
curl http://localhost:3001/api/health
```

## Original Project

This is a French version of Wordle. For more information about the original project, see the [original README](README_ORIGINAL.md).

## License

See LICENSE file for details.
