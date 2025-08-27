#!/bin/bash
# Fix WebSocket spam and authentication issues

echo "🔧 Fixing WebSocket spam and authentication..."

cd ~/Trader

# Kill existing server
echo "Stopping server..."
pkill -f "node.*index.js" || true
sleep 2

# Create a test user for immediate login
echo "Creating default user for testing..."
cat > create-test-user.js << 'EOF'
const sqlite3 = require('better-sqlite3');
const bcrypt = require('bcrypt');

async function createTestUser() {
  const db = sqlite3('./database.sqlite');
  
  // Create users table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create test user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  try {
    const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    stmt.run('admin', hashedPassword);
    console.log('Test user created: admin/admin123');
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      console.log('Test user already exists: admin/admin123');
    } else {
      console.error('Error creating user:', err);
    }
  }
  
  db.close();
}

createTestUser();
EOF

# Install and run the user creation script
npm install better-sqlite3 bcrypt
node create-test-user.js

# Copy database to dist
mkdir -p dist
cp database.sqlite dist/

echo "📦 Building with WebSocket fixes..."
npm run build

cd dist

# Rebuild native modules
npm rebuild bcrypt better-sqlite3

echo "🚀 Starting server with WebSocket debugging disabled..."
NODE_ENV=production PORT=5000 node index.js

echo "✅ Login with: admin/admin123"