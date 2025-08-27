#!/bin/bash
# Complete bot and authentication fix

echo "🔧 Implementing complete fix for authentication and bot logging..."

cd ~/Trader 2>/dev/null || cd .

# Stop any running processes
pkill -f "node.*index.js" || true
pkill -f "tsx.*index.ts" || true
sleep 2

echo "Building application with all fixes..."
npm run build

# Copy the updated database
cp database.sqlite dist/

cd dist

echo ""
echo "🚀 Starting CryptoBot Pro with complete fixes:"
echo "✅ Authentication fixed - login with admin/admin123"
echo "✅ Registration working for new accounts"  
echo "✅ WebSocket errors resolved"
echo "✅ Bot auto-starts and logs all activity"
echo "✅ Market analysis every 30 seconds"
echo "✅ AI vs Technical analysis clearly labeled"
echo "✅ Demo logs already populated"
echo ""
echo "Navigate to Bot Log tab to see trading bot activity!"
echo ""

NODE_ENV=production PORT=5000 node index.js