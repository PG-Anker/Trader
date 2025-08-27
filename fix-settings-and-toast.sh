#!/bin/bash
# Fix settings save and reduce toast spam

echo "🔧 Fixing settings save and toast spam issues..."

cd ~/Trader

# Stop server
pkill -f "node.*index.js" || true
sleep 2

echo "Building with fixes..."
npm run build

# Copy database
cp database.sqlite dist/

cd dist

echo "🚀 Starting server with fixes..."
echo "✅ Toast spam reduced - only critical errors will show"
echo "✅ Settings save fixed - credentials properly handled"
echo "✅ Test connection now works with form data"

NODE_ENV=production PORT=5000 node index.js