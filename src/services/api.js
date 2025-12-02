// API service for communicating with the backend
const API_BASE_URL = process.env.VUE_APP_API_URL || "http://localhost:3001/api";

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: "Request failed" }));
        throw new Error(
          error.error || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  // Get word of the day
  async getWordOfDay(date) {
    return this.request(`/word-of-day/${date}`);
  }

  // Set word of the day
  async setWordOfDay(date, word) {
    return this.request("/word-of-day", {
      method: "POST",
      body: JSON.stringify({ date, word }),
    });
  }

  // Save a score
  async saveScore(username, word, tries, timeTaken, date) {
    return this.request("/scores", {
      method: "POST",
      body: JSON.stringify({ username, word, tries, timeTaken, date }),
    });
  }

  // Get scores for a user
  async getUserScores(username, limit = 10) {
    return this.request(`/scores/${username}?limit=${limit}`);
  }

  // Get leaderboard
  async getLeaderboard(limit = 20, date = null) {
    const dateParam = date ? `&date=${date}` : "";
    return this.request(`/leaderboard?limit=${limit}${dateParam}`);
  }

  // Get stats for a date
  async getStatsForDate(date) {
    return this.request(`/stats/${date}`);
  }

  // Health check
  async healthCheck() {
    return this.request("/health");
  }
}

export default new ApiService();
