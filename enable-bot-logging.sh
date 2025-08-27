#!/bin/bash
# Enable comprehensive bot logging and activity monitoring

echo "🤖 Enabling comprehensive bot logging and monitoring..."

cd ~/Trader

# Stop any running server
pkill -f "node.*index.js" || true
pkill -f "tsx.*index.ts" || true
sleep 2

echo "Building with enhanced logging..."
npm run build

# Copy database
cp database.sqlite dist/

cd dist

echo "🚀 Starting server with comprehensive bot activity logging..."
echo "✅ Bot will auto-start and begin market analysis"
echo "✅ All trading decisions will be visible in Bot Log tab"
echo "✅ DeepSeek AI analysis vs Technical analysis clearly labeled"
echo "✅ Paper trading mode enabled by default for safety"
echo "✅ Real-time market monitoring every 30 seconds"

NODE_ENV=production PORT=5000 node index.js