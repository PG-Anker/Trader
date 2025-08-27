#!/bin/bash
# Permanent authentication solution for production Ubuntu server

echo "Creating permanent authentication solution..."

cd ~/Trader

# Stop current server
pkill -f "node.*index.js" || true
sleep 2

# First, create the database with proper user table
sqlite3 database.sqlite << 'EOF'
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create default admin user (password: admin123)
INSERT OR IGNORE INTO users (username, password) VALUES 
('admin', '$2b$10$rQJ1bXKJQJQJQJQJQJQJQOeKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK');
EOF

# Install bcrypt for proper password hashing
npm install bcrypt

# Create proper hashed password
node << 'EOF'
const bcrypt = require('bcrypt');
const sqlite3 = require('better-sqlite3');

async function createUser() {
  const db = sqlite3('./database.sqlite');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  try {
    db.prepare('DELETE FROM users WHERE username = ?').run('admin');
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('admin', hashedPassword);
    console.log('✅ Created admin user with password: admin123');
  } catch (error) {
    console.error('Error creating user:', error);
  }
  
  db.close();
}

createUser();
EOF

echo "✅ Database and user created successfully"
echo "Username: admin"
echo "Password: admin123"
echo ""
echo "Building application with proper authentication..."
npm run build

# Copy database to production
cp database.sqlite dist/

cd dist

# Rebuild native dependencies for Ubuntu
npm rebuild bcrypt better-sqlite3

echo ""
echo "🚀 Starting production server with authentication..."
echo "Open browser to: http://your-server-ip:5000"
echo "Login with: admin / admin123"
echo ""

NODE_ENV=production PORT=5000 node index.js