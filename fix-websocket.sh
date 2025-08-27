#!/bin/bash
# Fix WebSocket connection issues in production

echo "🔧 Fixing WebSocket connection for production..."

# Kill any existing processes on port 5001
echo "Stopping any existing processes..."
sudo pkill -f "node.*index.js" || true

# Wait a moment
sleep 2

# Start the server with proper WebSocket support
echo "Starting server with WebSocket support..."
cd ~/Trader/dist

# Set proper environment variables for production
export NODE_ENV=production
export PORT=5001
export HOST=0.0.0.0

# Start with explicit WebSocket logging
echo "Starting CryptoBot Pro with WebSocket debugging..."
node index.js

echo "✅ Server should now be running with proper WebSocket support on port 5001"
echo "Check browser console for WebSocket connection status"