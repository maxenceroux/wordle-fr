#!/bin/bash

echo "🧪 Testing Wordle-FR Docker Setup"
echo "=================================="
echo ""

BASE_URL="http://localhost:3001/api"

# Test 1: Health Check
echo "Test 1: Backend Health Check"
response=$(curl -s -w "\n%{http_code}" $BASE_URL/health)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo "✅ PASS - Backend is healthy"
else
    echo "❌ FAIL - Backend health check failed (HTTP $http_code)"
fi
echo ""

# Test 2: Set Word of Day
echo "Test 2: Set Word of the Day"
response=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/word-of-day \
    -H "Content-Type: application/json" \
    -d '{"date":"2025-12-01","word":"TESTE"}')
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
    echo "✅ PASS - Word of day set successfully"
else
    echo "❌ FAIL - Failed to set word of day (HTTP $http_code)"
fi
echo ""

# Test 3: Get Word of Day
echo "Test 3: Get Word of the Day"
response=$(curl -s -w "\n%{http_code}" $BASE_URL/word-of-day/2025-12-01)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ] && echo "$body" | grep -q "TESTE"; then
    echo "✅ PASS - Retrieved word of day successfully"
else
    echo "❌ FAIL - Failed to get word of day (HTTP $http_code)"
fi
echo ""

# Test 4: Save Score
echo "Test 4: Save Score"
response=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/scores \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","word":"TESTE","tries":3,"timeTaken":45,"date":"2025-12-01"}')
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
    echo "✅ PASS - Score saved successfully"
else
    echo "❌ FAIL - Failed to save score (HTTP $http_code)"
fi
echo ""

# Test 5: Get User Scores
echo "Test 5: Get User Scores"
response=$(curl -s -w "\n%{http_code}" $BASE_URL/scores/testuser)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ] && echo "$body" | grep -q "testuser"; then
    echo "✅ PASS - Retrieved user scores successfully"
else
    echo "❌ FAIL - Failed to get user scores (HTTP $http_code)"
fi
echo ""

# Test 6: Get Leaderboard
echo "Test 6: Get Leaderboard"
response=$(curl -s -w "\n%{http_code}" $BASE_URL/leaderboard)
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
    echo "✅ PASS - Retrieved leaderboard successfully"
else
    echo "❌ FAIL - Failed to get leaderboard (HTTP $http_code)"
fi
echo ""

# Test 7: Get Stats
echo "Test 7: Get Stats for Date"
response=$(curl -s -w "\n%{http_code}" $BASE_URL/stats/2025-12-01)
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
    echo "✅ PASS - Retrieved stats successfully"
else
    echo "❌ FAIL - Failed to get stats (HTTP $http_code)"
fi
echo ""

# Test 8: Frontend Health
echo "Test 8: Frontend Health Check"
response=$(curl -s -w "\n%{http_code}" http://localhost/health)
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
    echo "✅ PASS - Frontend is healthy"
else
    echo "❌ FAIL - Frontend health check failed (HTTP $http_code)"
fi
echo ""

echo "=================================="
echo "🎉 Testing Complete!"
echo ""
echo "Access the application at: http://localhost"
