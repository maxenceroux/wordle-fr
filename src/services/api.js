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

  // ===== COMMUNITY METHODS =====

  // Create a new community
  async createCommunity(name, createdBy) {
    return this.request("/communities", {
      method: "POST",
      body: JSON.stringify({ name, createdBy }),
    });
  }

  // Get community by code
  async getCommunityByCode(code) {
    return this.request(`/communities/${code}`);
  }

  // Join a community
  async joinCommunity(code, username) {
    return this.request(`/communities/${code}/join`, {
      method: "POST",
      body: JSON.stringify({ username }),
    });
  }

  // Get community members
  async getCommunityMembers(code) {
    return this.request(`/communities/${code}/members`);
  }

  // Get communities for a user
  async getUserCommunities(username) {
    return this.request(`/users/${username}/communities`);
  }

  // ===== WORD OF THE DAY METHODS =====

  // Get word of the day
  async getWordOfDay(date, communityId = null) {
    const communityParam = communityId ? `?communityId=${communityId}` : "";
    return this.request(`/word-of-day/${date}${communityParam}`);
  }

  // Set word of the day
  async setWordOfDay(date, word, communityId = null) {
    return this.request("/word-of-day", {
      method: "POST",
      body: JSON.stringify({ date, word, communityId }),
    });
  }

  // ===== SCORE METHODS =====

  // Save a score
  async saveScore(username, word, tries, timeTaken, date, communityId = null) {
    return this.request("/scores", {
      method: "POST",
      body: JSON.stringify({
        username,
        word,
        tries,
        timeTaken,
        date,
        communityId,
      }),
    });
  }

  // Get scores for a user
  async getUserScores(username, limit = 10, communityId = null) {
    const communityParam = communityId ? `&communityId=${communityId}` : "";
    return this.request(`/scores/${username}?limit=${limit}${communityParam}`);
  }

  // Get leaderboard
  async getLeaderboard(limit = 20, date = null, communityId = null) {
    const dateParam = date ? `&date=${date}` : "";
    const communityParam = communityId ? `&communityId=${communityId}` : "";
    return this.request(
      `/leaderboard?limit=${limit}${dateParam}${communityParam}`
    );
  }

  // Get stats for a date
  async getStatsForDate(date, communityId = null) {
    const communityParam = communityId ? `?communityId=${communityId}` : "";
    return this.request(`/stats/${date}${communityParam}`);
  }

  // Health check
  async healthCheck() {
    return this.request("/health");
  }
}

export default new ApiService();
