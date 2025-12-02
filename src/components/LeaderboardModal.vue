<template>
  <div class="leaderboard-modal">
    <h2>Leaderboard</h2>
    <div v-if="loading">Loading...</div>
    <div v-else>
      <div class="leaderboard-summary">
        <p><strong>Total Players:</strong> {{ summary.totalPlayers }}</p>
        <p><strong>Total Games:</strong> {{ summary.totalGames }}</p>
        <p><strong>Fastest Time:</strong> {{ formatTime(summary.fastestTime) }}</p>
        <p><strong>Slowest Time:</strong> {{ formatTime(summary.slowestTime) }}</p>
      </div>
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Username</th>
            <th>Word</th>
            <th>Tries</th>
            <th>Time to Complete</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in leaderboard" :key="entry.id">
            <td>{{ entry.rank }}</td>
            <td>{{ entry.username }}</td>
            <td>{{ entry.word }}</td>
            <td>{{ entry.tries }}</td>
            <td>{{ formatTime(entry.timeTaken) }}</td>
            <td>{{ entry.date }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import ApiService from '../services/api.js';

export default {
  name: 'LeaderboardModal',
  data() {
    return {
      leaderboard: [],
      summary: {
        totalPlayers: 0,
        totalGames: 0,
        fastestTime: 0,
        slowestTime: 0,
      },
      loading: true,
    };
  },
  methods: {
    async fetchLeaderboard() {
      this.loading = true;
      try {
        const result = await ApiService.getLeaderboard(20);
        this.leaderboard = result.leaderboard;
        this.summary = {
          totalPlayers: result.totalPlayers,
          totalGames: result.totalGames,
          fastestTime: result.fastestTime,
          slowestTime: result.slowestTime,
        };
      } catch (e) {
        // handle error
      }
      this.loading = false;
    },
    formatTime(seconds) {
      if (seconds == null) return '-';
      const min = Math.floor(seconds / 60);
      const sec = seconds % 60;
      return `${min}m ${sec}s`;
    },
  },
  mounted() {
    this.fetchLeaderboard();
  },
};
</script>

<style scoped>
.leaderboard-modal {
  padding: 2em;
  background: #fff;
  border-radius: 12px;
  max-width: 600px;
  margin: 2em auto;
}
.leaderboard-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1em;
}
.leaderboard-table th, .leaderboard-table td {
  border: 1px solid #ddd;
  padding: 0.5em;
  text-align: center;
}
.leaderboard-summary {
  margin-bottom: 1em;
}
</style>
