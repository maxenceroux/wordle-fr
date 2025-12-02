# Migration Guide

## Migrating from Cache-based to Database-based System

### What Changed?

**Before:**
- Scores stored in browser's localStorage
- No persistence across devices
- No leaderboard or comparison with other users

**After:**
- Scores stored in SQLite database on server
- Access scores from any device (with username)
- Global leaderboard and statistics
- Username-based tracking

### For End Users

#### First Time After Update
1. You'll be prompted to enter a username when you complete a game
2. Your username is cached locally - you won't be asked again on this device
3. Your future scores will be saved to the database automatically

#### Accessing Your Scores
- Your historical localStorage data remains intact
- New scores are saved to both localStorage (for backward compatibility) and database
- Use the same username on other devices to track all your scores

#### Changing Username
If you want to use a different username:
1. Clear your browser's localStorage for this site
2. Or edit localStorage manually: `localStorage.removeItem('username')`
3. Reload the page

### For Developers

#### Running the New Version

**Development Mode:**
```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
npm install
npm run serve
```

**Production Mode (Docker):**
```bash
docker-compose up -d
```

#### Environment Variables

Create `.env.development` for local development:
```
VUE_APP_API_URL=http://localhost:3001/api
```

For production (Docker), this is handled automatically.

#### Database Location

- **Development**: `backend/data/wordle.db`
- **Docker**: Stored in Docker volume `wordle-fr_backend-data`

#### API Integration

The frontend now calls these API methods:
- `ApiService.saveScore()` - After game completion
- `ApiService.setWordOfDay()` - On component mount
- `ApiService.getUserScores()` - For viewing user history (future feature)
- `ApiService.getLeaderboard()` - For leaderboard (future feature)

#### Backward Compatibility

The application maintains backward compatibility:
- localStorage is still used for local game state
- Existing localStorage data is not affected
- Users without usernames can still play (scores just won't be saved globally)

### Testing the Migration

1. **Start the services:**
   ```bash
   docker-compose up -d
   ```

2. **Play a game:**
   - Complete a word in 1-6 tries
   - Enter username when prompted
   - Check that score is saved

3. **Verify database:**
   ```bash
   # Run test script
   ./test-api.sh
   
   # Or manually check
   docker-compose exec backend sh
   cd data
   sqlite3 wordle.db "SELECT * FROM scores;"
   ```

4. **Test on another device:**
   - Use same username
   - Verify scores accumulate for that user

### Rollback Plan

If you need to rollback:

1. **Stop Docker services:**
   ```bash
   docker-compose down -v
   ```

2. **Restore original frontend:**
   ```bash
   git checkout src/components/Game.vue
   ```

3. **Remove new files:**
   ```bash
   rm -rf backend/
   rm docker-compose.yml Dockerfile nginx.conf
   rm src/services/api.js
   ```

4. **Run original version:**
   ```bash
   npm run serve
   ```

### Common Issues

#### "Cannot connect to backend"
- Ensure backend is running: `docker-compose ps`
- Check backend logs: `docker-compose logs backend`
- Verify port 3001 is available

#### "Username not being saved"
- Check localStorage in browser DevTools
- Clear cache and try again
- Verify API is receiving requests (Network tab in DevTools)

#### "Database not persisting"
- Check volume exists: `docker volume ls | grep wordle`
- Ensure you're not using `-v` flag when stopping: use `docker-compose down` not `docker-compose down -v`

#### "Frontend can't reach backend"
- Verify nginx proxy config in `nginx.conf`
- Check docker network: `docker network inspect wordle-fr_wordle-network`
- Ensure both containers are on same network

### Data Privacy Note

The username and scores are stored on your server. If deploying publicly:
- Consider adding authentication
- Implement privacy policy
- Add GDPR compliance if in EU
- Consider rate limiting to prevent abuse

### Performance Considerations

- SQLite is single-threaded - for high traffic, consider PostgreSQL
- Database is in Docker volume - backup regularly
- Consider adding Redis for caching if scaling

### Future Enhancements

Potential additions:
- User authentication (OAuth, JWT)
- Public user profiles
- Historical statistics graphs
- Social sharing with scores
- Daily/weekly challenges
- Multi-language support for scores
