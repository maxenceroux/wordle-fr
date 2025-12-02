# Wordle-FR Refactoring Summary

## Overview
Successfully refactored Wordle-FR to use SQLite database persistence with full Docker containerization.

## Changes Made

### Backend Service (NEW)
Created a complete Node.js/Express backend service:

**Files Created:**
- `backend/package.json` - Backend dependencies
- `backend/server.js` - Express API server with SQLite integration
- `backend/Dockerfile` - Container configuration for backend
- `backend/.gitignore` - Ignore patterns for backend
- `backend/.dockerignore` - Docker build optimization
- `backend/.env.example` - Environment variable template

**Features:**
- SQLite database with two tables: `scores` and `word_of_day`
- RESTful API endpoints for:
  - Health checks
  - Word of the day management
  - Score persistence (username, word, tries, time)
  - User score retrieval
  - Leaderboard
  - Date-based statistics
- Automatic database initialization
- Graceful shutdown handling
- CORS enabled for frontend communication

### Frontend Updates
Modified existing Vue.js application to integrate with backend:

**Files Modified:**
- `src/components/Game.vue` - Added API integration
  - Username prompt with local caching
  - Automatic score submission to backend
  - Word of the day sync
  - Game timing tracking

**Files Created:**
- `src/services/api.js` - API service layer for backend communication
- `.env.development` - Development environment config
- `.env.production` - Production environment config
- `Dockerfile` - Multi-stage build for frontend
- `nginx.conf` - Nginx configuration with API proxy
- `.dockerignore` - Build optimization

### Docker Infrastructure
Complete containerization setup:

**Files Created:**
- `docker-compose.yml` - Orchestration of frontend and backend
- `start.sh` - Helper script to launch application
- `test-api.sh` - API testing script

**Configuration:**
- Frontend runs on port 80 (Nginx)
- Backend runs on port 3001
- Persistent volume for SQLite database
- Bridge network for service communication
- Health checks for both services

### Documentation
Comprehensive documentation:

**Files Created/Modified:**
- `README_DOCKER.md` - Complete Docker setup guide
- `README.md` - Updated with Docker quick start
- Architecture diagrams and API documentation

## Database Schema

### scores table
```sql
CREATE TABLE scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    word TEXT NOT NULL,
    tries INTEGER NOT NULL,
    time_taken INTEGER NOT NULL,
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### word_of_day table
```sql
CREATE TABLE word_of_day (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    word TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/word-of-day/:date` | Get word for specific date |
| POST | `/api/word-of-day` | Set word for a date |
| POST | `/api/scores` | Save a game score |
| GET | `/api/scores/:username` | Get user's scores |
| GET | `/api/leaderboard` | Get top scores |
| GET | `/api/stats/:date` | Get statistics for date |

## Usage Flow

1. **User plays game**: Frontend tracks game state
2. **Game completes**: 
   - User prompted for username (if not cached)
   - Username stored in localStorage for future games
   - Score sent to backend API
3. **Backend stores**: Score saved in SQLite database
4. **Data persists**: Database survives container restarts via Docker volume

## Key Features Implemented

✅ SQLite database for persistence  
✅ Username system with local caching  
✅ Score tracking (tries + time)  
✅ Word of the day storage  
✅ RESTful API  
✅ Complete Docker containerization  
✅ Frontend/Backend separation  
✅ Nginx reverse proxy  
✅ Persistent volumes  
✅ Health checks  
✅ Comprehensive documentation  
✅ Testing scripts  

## How to Run

```bash
# Quick start
./start.sh

# Or manually
docker-compose up -d

# Test API
./test-api.sh
```

## Architecture

```
┌─────────────────┐
│   Browser       │
│  (localhost)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Nginx (80)    │  Frontend Service
│  Vue.js App     │  - Serves static files
│                 │  - Proxies /api to backend
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Express (3001)  │  Backend Service
│   Node.js API   │  - Handles API requests
│                 │  - Manages SQLite DB
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SQLite DB      │  Persistent Volume
│  wordle.db      │  - Stores scores
│                 │  - Stores word of day
└─────────────────┘
```

## Acceptance Criteria Status

✅ All data persistence handled via SQLite (no in-memory cache for scores)  
✅ Local cache only used for username after initial query  
✅ Word of the day stored and retrievable from database  
✅ Project starts with `docker-compose up`  
✅ Works end-to-end  

## Files Created (Summary)

### Backend (7 files)
- backend/package.json
- backend/server.js
- backend/Dockerfile
- backend/.gitignore
- backend/.dockerignore
- backend/.env.example

### Frontend (5 files)
- src/services/api.js
- Dockerfile
- nginx.conf
- .env.development
- .env.production
- .dockerignore

### Infrastructure (3 files)
- docker-compose.yml
- start.sh
- test-api.sh

### Documentation (2 files)
- README_DOCKER.md
- README.md (updated)

### Modified (1 file)
- src/components/Game.vue

**Total: 18 new files, 1 modified file**
