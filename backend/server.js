const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize SQLite database
const dbPath = process.env.DB_PATH || path.join(__dirname, "data", "wordle.db");
const db = new Database(dbPath);

// Function to check if column exists
function columnExists(tableName, columnName) {
  const result = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return result.some((col) => col.name === columnName);
}

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS communities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS community_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    community_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(community_id, username),
    FOREIGN KEY (community_id) REFERENCES communities(id)
  );

  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    word TEXT NOT NULL,
    tries INTEGER NOT NULL,
    time_taken INTEGER NOT NULL,
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS word_of_day (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    word TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Add community_id columns if they don't exist (migration)
if (!columnExists("scores", "community_id")) {
  console.log("Migrating scores table: adding community_id column...");
  db.exec(
    `ALTER TABLE scores ADD COLUMN community_id INTEGER REFERENCES communities(id);`
  );
}

if (!columnExists("word_of_day", "community_id")) {
  console.log("Migrating word_of_day table: adding community_id column...");
  db.exec(
    `ALTER TABLE word_of_day ADD COLUMN community_id INTEGER REFERENCES communities(id);`
  );
}

// Create indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_communities_code ON communities(code);
  CREATE INDEX IF NOT EXISTS idx_community_members_community ON community_members(community_id);
  CREATE INDEX IF NOT EXISTS idx_community_members_username ON community_members(username);
  CREATE INDEX IF NOT EXISTS idx_scores_username ON scores(username);
  CREATE INDEX IF NOT EXISTS idx_scores_date ON scores(date);
  CREATE INDEX IF NOT EXISTS idx_scores_community ON scores(community_id);
  CREATE INDEX IF NOT EXISTS idx_word_of_day_date ON word_of_day(date);
  CREATE INDEX IF NOT EXISTS idx_word_of_day_community ON word_of_day(community_id);
`);

// Drop old unique constraint on word_of_day if exists, then create new one
try {
  db.exec(`DROP INDEX IF EXISTS idx_word_of_day_date;`);
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_word_of_day_date_community 
    ON word_of_day(date, community_id);
  `);
} catch (error) {
  console.log(
    "Note: Could not update word_of_day unique index (may already exist)"
  );
}

// Helper function to generate unique community code
function generateCommunityCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running" });
});

// ===== COMMUNITY ENDPOINTS =====

// Create a new community
app.post("/api/communities", (req, res) => {
  try {
    const { name, createdBy } = req.body;

    if (!name || !createdBy) {
      return res.status(400).json({ error: "Name and createdBy are required" });
    }

    // Generate unique code
    let code;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      code = generateCommunityCode();
      const existing = db
        .prepare("SELECT id FROM communities WHERE code = ?")
        .get(code);
      if (!existing) break;
      attempts++;
    }

    if (attempts === maxAttempts) {
      return res
        .status(500)
        .json({ error: "Failed to generate unique community code" });
    }

    const stmt = db.prepare(`
      INSERT INTO communities (code, name, created_by)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(code, name, createdBy);
    const communityId = result.lastInsertRowid;

    // Automatically add creator as member
    const memberStmt = db.prepare(`
      INSERT INTO community_members (community_id, username)
      VALUES (?, ?)
    `);
    memberStmt.run(communityId, createdBy);

    res.json({
      success: true,
      community: {
        id: communityId,
        code,
        name,
        createdBy,
      },
    });
  } catch (error) {
    console.error("Error creating community:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get community by code
app.get("/api/communities/:code", (req, res) => {
  try {
    const { code } = req.params;

    const stmt = db.prepare(`
      SELECT id, code, name, created_by as createdBy, created_at as createdAt
      FROM communities
      WHERE code = ?
    `);

    const community = stmt.get(code.toUpperCase());

    if (!community) {
      return res.status(404).json({ error: "Community not found" });
    }

    // Get member count
    const countStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM community_members
      WHERE community_id = ?
    `);
    const memberCount = countStmt.get(community.id).count;

    res.json({
      community: {
        ...community,
        memberCount,
      },
    });
  } catch (error) {
    console.error("Error fetching community:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Join a community
app.post("/api/communities/:code/join", (req, res) => {
  try {
    const { code } = req.params;
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Get community
    const communityStmt = db.prepare(
      "SELECT id FROM communities WHERE code = ?"
    );
    const community = communityStmt.get(code.toUpperCase());

    if (!community) {
      return res.status(404).json({ error: "Community not found" });
    }

    // Check if already a member
    const checkStmt = db.prepare(`
      SELECT id FROM community_members
      WHERE community_id = ? AND username = ?
    `);
    const existing = checkStmt.get(community.id, username);

    if (existing) {
      return res.json({ success: true, alreadyMember: true });
    }

    // Add member
    const stmt = db.prepare(`
      INSERT INTO community_members (community_id, username)
      VALUES (?, ?)
    `);

    stmt.run(community.id, username);

    res.json({ success: true, alreadyMember: false });
  } catch (error) {
    console.error("Error joining community:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get community members
app.get("/api/communities/:code/members", (req, res) => {
  try {
    const { code } = req.params;

    // Get community
    const communityStmt = db.prepare(
      "SELECT id FROM communities WHERE code = ?"
    );
    const community = communityStmt.get(code.toUpperCase());

    if (!community) {
      return res.status(404).json({ error: "Community not found" });
    }

    // Get members
    const stmt = db.prepare(`
      SELECT username, joined_at as joinedAt
      FROM community_members
      WHERE community_id = ?
      ORDER BY joined_at ASC
    `);

    const members = stmt.all(community.id);

    res.json({ members, count: members.length });
  } catch (error) {
    console.error("Error fetching community members:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get communities for a user
app.get("/api/users/:username/communities", (req, res) => {
  try {
    const { username } = req.params;

    const stmt = db.prepare(`
      SELECT c.id, c.code, c.name, c.created_by as createdBy, c.created_at as createdAt
      FROM communities c
      JOIN community_members cm ON c.id = cm.community_id
      WHERE cm.username = ?
      ORDER BY cm.joined_at DESC
    `);

    const communities = stmt.all(username);

    res.json({ communities });
  } catch (error) {
    console.error("Error fetching user communities:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ===== WORD OF THE DAY ENDPOINTS =====

// Get word of the day
app.get("/api/word-of-day/:date", (req, res) => {
  try {
    const { date } = req.params;
    const communityId = req.query.communityId
      ? parseInt(req.query.communityId)
      : null;

    const stmt = db.prepare(`
      SELECT word FROM word_of_day 
      WHERE date = ? AND (community_id = ? OR (community_id IS NULL AND ? IS NULL))
    `);
    const result = stmt.get(date, communityId, communityId);

    if (result) {
      res.json({ word: result.word, date, communityId });
    } else {
      res
        .status(404)
        .json({ error: "Word of the day not found for this date" });
    }
  } catch (error) {
    console.error("Error fetching word of the day:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Set word of the day
app.post("/api/word-of-day", (req, res) => {
  try {
    const { date, word, communityId } = req.body;

    if (!date || !word) {
      return res.status(400).json({ error: "Date and word are required" });
    }

    const stmt = db.prepare(`
      INSERT INTO word_of_day (date, word, community_id) 
      VALUES (?, ?, ?)
      ON CONFLICT(date, community_id) DO UPDATE SET word = excluded.word
    `);

    stmt.run(date, word, communityId || null);
    res.json({ success: true, date, word, communityId });
  } catch (error) {
    console.error("Error setting word of the day:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Save score
app.post("/api/scores", (req, res) => {
  try {
    const { username, word, tries, timeTaken, date, communityId } = req.body;

    if (
      !username ||
      !word ||
      tries === undefined ||
      timeTaken === undefined ||
      !date
    ) {
      return res.status(400).json({
        error: "Username, word, tries, timeTaken, and date are required",
      });
    }

    const stmt = db.prepare(`
      INSERT INTO scores (username, word, tries, time_taken, date, community_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      username,
      word,
      tries,
      timeTaken,
      date,
      communityId || null
    );

    res.json({
      success: true,
      id: result.lastInsertRowid,
      username,
      communityId,
    });
  } catch (error) {
    console.error("Error saving score:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get best scores for a user
app.get("/api/scores/:username", (req, res) => {
  try {
    const { username } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const communityId = req.query.communityId
      ? parseInt(req.query.communityId)
      : null;

    let stmt;
    let scores;

    if (communityId !== null) {
      stmt = db.prepare(`
        SELECT word, tries, time_taken as timeTaken, date, created_at as createdAt
        FROM scores
        WHERE username = ? AND community_id = ?
        ORDER BY tries ASC, time_taken ASC
        LIMIT ?
      `);
      scores = stmt.all(username, communityId, limit);
    } else {
      stmt = db.prepare(`
        SELECT word, tries, time_taken as timeTaken, date, created_at as createdAt
        FROM scores
        WHERE username = ? AND community_id IS NULL
        ORDER BY tries ASC, time_taken ASC
        LIMIT ?
      `);
      scores = stmt.all(username, limit);
    }

    res.json({ username, scores, communityId });
  } catch (error) {
    console.error("Error fetching scores:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get leaderboard (best scores across all users)
app.get("/api/leaderboard", (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const date = req.query.date;
    const communityId = req.query.communityId
      ? parseInt(req.query.communityId)
      : null;

    let leaderboard;
    if (date) {
      // Get scores for a specific date
      let stmt;
      if (communityId !== null) {
        stmt = db.prepare(`
          SELECT id, username, word, tries, time_taken as timeTaken, date, created_at
          FROM scores
          WHERE date = ? AND community_id = ?
          ORDER BY tries ASC, time_taken ASC
          LIMIT ?
        `);
        leaderboard = stmt.all(date, communityId, limit);
      } else {
        stmt = db.prepare(`
          SELECT id, username, word, tries, time_taken as timeTaken, date, created_at
          FROM scores
          WHERE date = ? AND community_id IS NULL
          ORDER BY tries ASC, time_taken ASC
          LIMIT ?
        `);
        leaderboard = stmt.all(date, limit);
      }
    } else {
      // Get all scores ordered by best performance
      let stmt;
      if (communityId !== null) {
        stmt = db.prepare(`
          SELECT id, username, word, tries, time_taken as timeTaken, date, created_at
          FROM scores
          WHERE community_id = ?
          ORDER BY tries ASC, time_taken ASC
          LIMIT ?
        `);
        leaderboard = stmt.all(communityId, limit);
      } else {
        stmt = db.prepare(`
          SELECT id, username, word, tries, time_taken as timeTaken, date, created_at
          FROM scores
          WHERE community_id IS NULL
          ORDER BY tries ASC, time_taken ASC
          LIMIT ?
        `);
        leaderboard = stmt.all(limit);
      }
    }

    // Add ranking and other metrics
    leaderboard.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    // Aggregate stats (filtered by date and/or community if provided)
    let totalPlayers, totalGames, fastestTime, slowestTime;
    let whereClause = [];
    let params = [];

    if (date) {
      whereClause.push("date = ?");
      params.push(date);
    }

    if (communityId !== null) {
      whereClause.push("community_id = ?");
      params.push(communityId);
    } else {
      whereClause.push("community_id IS NULL");
    }

    const where =
      whereClause.length > 0 ? `WHERE ${whereClause.join(" AND ")}` : "";

    const totalPlayersStmt = db.prepare(
      `SELECT COUNT(DISTINCT username) as totalPlayers FROM scores ${where}`
    );
    const totalGamesStmt = db.prepare(
      `SELECT COUNT(*) as totalGames FROM scores ${where}`
    );
    const fastestTimeStmt = db.prepare(
      `SELECT MIN(time_taken) as fastestTime FROM scores ${where}`
    );
    const slowestTimeStmt = db.prepare(
      `SELECT MAX(time_taken) as slowestTime FROM scores ${where}`
    );

    totalPlayers = totalPlayersStmt.get(...params).totalPlayers;
    totalGames = totalGamesStmt.get(...params).totalGames;
    fastestTime = fastestTimeStmt.get(...params).fastestTime;
    slowestTime = slowestTimeStmt.get(...params).slowestTime;

    res.json({
      leaderboard,
      totalPlayers,
      totalGames,
      fastestTime,
      slowestTime,
      date: date || null,
      communityId,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get stats for a specific date
app.get("/api/stats/:date", (req, res) => {
  try {
    const { date } = req.params;
    const communityId = req.query.communityId
      ? parseInt(req.query.communityId)
      : null;

    let stmt;
    let stats;

    if (communityId !== null) {
      stmt = db.prepare(`
        SELECT 
          COUNT(*) as totalPlays,
          AVG(tries) as avgTries,
          MIN(tries) as bestTries,
          AVG(time_taken) as avgTime
        FROM scores
        WHERE date = ? AND community_id = ?
      `);
      stats = stmt.get(date, communityId);
    } else {
      stmt = db.prepare(`
        SELECT 
          COUNT(*) as totalPlays,
          AVG(tries) as avgTries,
          MIN(tries) as bestTries,
          AVG(time_taken) as avgTime
        FROM scores
        WHERE date = ? AND community_id IS NULL
      `);
      stats = stmt.get(date);
    }

    res.json({ date, stats, communityId });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing database connection");
  db.close();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing database connection");
  db.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Database: ${dbPath}`);
});
