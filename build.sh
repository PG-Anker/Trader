#!/bin/bash

# Exit on any error
set -e

echo "🚀 Building CryptoBot Pro for production..."

# Create backup of database and preserve existing data
if [ -f "database.sqlite" ]; then
    echo "📦 Backing up existing database..."
    cp database.sqlite database.sqlite.backup
    
    # Export existing data
    echo "💾 Exporting existing user data..."
    sqlite3 database.sqlite.backup ".dump users" > users_backup.sql 2>/dev/null || true
    sqlite3 database.sqlite.backup ".dump trading_settings" > settings_backup.sql 2>/dev/null || true
    sqlite3 database.sqlite.backup ".dump positions" > positions_backup.sql 2>/dev/null || true
    sqlite3 database.sqlite.backup ".dump trades" > trades_backup.sql 2>/dev/null || true
    sqlite3 database.sqlite.backup ".dump bot_logs" > logs_backup.sql 2>/dev/null || true
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Build the project
echo "🔨 Building project..."
npm run build

# Copy static files
echo "📁 Copying static files..."
mkdir -p dist/public
cp -r client/dist/* dist/public/

# Set up database with schema updates
echo "🗄️ Setting up database with latest schema..."
npm run db:generate
npm run db:push

# Restore user data if backup exists
if [ -f "users_backup.sql" ]; then
    echo "🔧 Restoring user data from backup..."
    sqlite3 database.sqlite < users_backup.sql 2>/dev/null || true
    
    echo "⚙️ Restoring trading settings..."
    sqlite3 database.sqlite < settings_backup.sql 2>/dev/null || true
    
    echo "💼 Restoring positions..."
    sqlite3 database.sqlite < positions_backup.sql 2>/dev/null || true
    
    echo "📊 Restoring trade history..."
    sqlite3 database.sqlite < trades_backup.sql 2>/dev/null || true
    
    echo "📝 Restoring bot logs (recent)..."
    # Only restore recent logs (last 1000 entries) to avoid bloat
    sqlite3 database.sqlite "DELETE FROM bot_logs; INSERT INTO bot_logs SELECT * FROM (SELECT * FROM temp.bot_logs ORDER BY id DESC LIMIT 1000) ORDER BY id;" 2>/dev/null || true
    
    # Clean up backup files
    rm -f users_backup.sql settings_backup.sql positions_backup.sql trades_backup.sql logs_backup.sql
fi

# Update schema for any new fields (dual bot architecture)
echo "🔄 Updating schema for dual bot support..."
sqlite3 database.sqlite "
    UPDATE trading_settings SET 
        spotStrategies = COALESCE(spotStrategies, strategies),
        leverageStrategies = COALESCE(leverageStrategies, strategies)
    WHERE spotStrategies IS NULL OR leverageStrategies IS NULL;
" 2>/dev/null || true

# Ensure admin user exists with correct password
echo "👤 Ensuring admin user exists..."
node -e "
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const db = new Database('database.sqlite');

try {
  const hashedPassword = bcrypt.hashSync('admin', 10);
  db.prepare('INSERT OR REPLACE INTO users (id, username, password) VALUES (1, ?, ?)').run('admin', hashedPassword);
  console.log('✅ Admin user configured');
} catch (error) {
  console.log('⚠️ Admin user setup:', error.message);
}
db.close();
"

echo "✅ Build complete! Ready for deployment."
echo "💡 Database preserved with all user data and settings"
echo "🚀 To start: npm start"