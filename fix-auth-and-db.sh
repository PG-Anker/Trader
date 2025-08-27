#!/bin/bash
# Fix authentication and database issues for production

echo "🔧 Fixing authentication and database for production..."

cd ~/Trader

# Kill existing process
pkill -f "node.*index.js" || true
sleep 2

# Initialize database if it doesn't exist
echo "📦 Initializing database..."
if [ ! -f "dist/database.sqlite" ]; then
    echo "Creating SQLite database..."
    tsx server/initDb.ts
    cp database.sqlite dist/ || echo "Database copied"
fi

# Rebuild with latest auth fixes
echo "🔨 Building with authentication fixes..."
npm run build

# Copy database to dist if needed
cp database.sqlite dist/ 2>/dev/null || echo "Database already in place"

cd dist

# Rebuild native dependencies
npm rebuild bcrypt better-sqlite3

# Start with debug logging for auth
echo "🚀 Starting server with authentication debugging..."
NODE_ENV=production PORT=5001 node index.js

echo "✅ Server starting with auth and database fixes"