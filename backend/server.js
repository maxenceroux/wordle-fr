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

// Create tables if they don't exist
db.exec(`
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
    date TEXT UNIQUE NOT NULL,
    word TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_scores_username ON scores(username);
  CREATE INDEX IF NOT EXISTS idx_scores_date ON scores(date);
  CREATE INDEX IF NOT EXISTS idx_word_of_day_date ON word_of_day(date);
`);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running" });
});

// Get word of the day
app.get("/api/word-of-day/:date", (req, res) => {
  try {
    const { date } = req.params;
    const stmt = db.prepare("SELECT word FROM word_of_day WHERE date = ?");
    const result = stmt.get(date);

    if (result) {
      res.json({ word: result.word, date });
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
    const { date, word } = req.body;

    if (!date || !word) {
      return res.status(400).json({ error: "Date and word are required" });
    }

    const stmt = db.prepare(`
      INSERT INTO word_of_day (date, word) 
      VALUES (?, ?)
      ON CONFLICT(date) DO UPDATE SET word = excluded.word
    `);

    stmt.run(date, word);
    res.json({ success: true, date, word });
  } catch (error) {
    console.error("Error setting word of the day:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Save score
app.post("/api/scores", (req, res) => {
  try {
    const { username, word, tries, timeTaken, date } = req.body;

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
      INSERT INTO scores (username, word, tries, time_taken, date)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(username, word, tries, timeTaken, date);

    res.json({
      success: true,
      id: result.lastInsertRowid,
      username,
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

    const stmt = db.prepare(`
      SELECT word, tries, time_taken as timeTaken, date, created_at as createdAt
      FROM scores
      WHERE username = ?
      ORDER BY tries ASC, time_taken ASC
      LIMIT ?
    `);

    const scores = stmt.all(username, limit);
    res.json({ username, scores });
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

    let leaderboard;
    if (date) {
      // Get scores for a specific date
      const stmt = db.prepare(`
        SELECT id, username, word, tries, time_taken as timeTaken, date, created_at
        FROM scores
        WHERE date = ?
        ORDER BY tries ASC, time_taken ASC
        LIMIT ?
      `);
      leaderboard = stmt.all(date, limit);
    } else {
      // Get all scores ordered by best performance
      const stmt = db.prepare(`
        SELECT id, username, word, tries, time_taken as timeTaken, date, created_at
        FROM scores
        ORDER BY tries ASC, time_taken ASC
        LIMIT ?
      `);
      leaderboard = stmt.all(limit);
    }

    // Add ranking and other metrics
    leaderboard.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    // Aggregate stats (filtered by date if provided)
    let totalPlayers, totalGames, fastestTime, slowestTime;

    if (date) {
      const totalPlayersStmt = db.prepare(
        `SELECT COUNT(DISTINCT username) as totalPlayers FROM scores WHERE date = ?`
      );
      const totalGamesStmt = db.prepare(
        `SELECT COUNT(*) as totalGames FROM scores WHERE date = ?`
      );
      const fastestTimeStmt = db.prepare(
        `SELECT MIN(time_taken) as fastestTime FROM scores WHERE date = ?`
      );
      const slowestTimeStmt = db.prepare(
        `SELECT MAX(time_taken) as slowestTime FROM scores WHERE date = ?`
      );

      totalPlayers = totalPlayersStmt.get(date).totalPlayers;
      totalGames = totalGamesStmt.get(date).totalGames;
      fastestTime = fastestTimeStmt.get(date).fastestTime;
      slowestTime = slowestTimeStmt.get(date).slowestTime;
    } else {
      const totalPlayersStmt = db.prepare(
        `SELECT COUNT(DISTINCT username) as totalPlayers FROM scores`
      );
      const totalGamesStmt = db.prepare(
        `SELECT COUNT(*) as totalGames FROM scores`
      );
      const fastestTimeStmt = db.prepare(
        `SELECT MIN(time_taken) as fastestTime FROM scores`
      );
      const slowestTimeStmt = db.prepare(
        `SELECT MAX(time_taken) as slowestTime FROM scores`
      );

      totalPlayers = totalPlayersStmt.get().totalPlayers;
      totalGames = totalGamesStmt.get().totalGames;
      fastestTime = fastestTimeStmt.get().fastestTime;
      slowestTime = slowestTimeStmt.get().slowestTime;
    }

    res.json({
      leaderboard,
      totalPlayers,
      totalGames,
      fastestTime,
      slowestTime,
      date: date || null,
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

    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as totalPlays,
        AVG(tries) as avgTries,
        MIN(tries) as bestTries,
        AVG(time_taken) as avgTime
      FROM scores
      WHERE date = ?
    `);

    const stats = stmt.get(date);
    res.json({ date, stats });
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
