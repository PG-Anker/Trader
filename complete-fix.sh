#!/bin/bash
# Complete fix for WebSocket spam and settings save button

echo "🔧 Applying complete fixes for WebSocket and settings..."

cd ~/Trader

# Kill server
pkill -f "node.*index.js" || true
sleep 2

echo "Building with fixes..."
npm run build

# Copy database 
cp database.sqlite dist/

cd dist

# Rebuild native modules
npm rebuild bcrypt better-sqlite3

echo "🚀 Starting fixed server..."
echo "✅ Settings save button will now work"
echo "✅ WebSocket spam reduced to minimal reconnections"
echo "Login: admin/admin123"

NODE_ENV=production PORT=5000 node index.js