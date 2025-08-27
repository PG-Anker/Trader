#!/bin/bash
# Quick fix for production deployment bcrypt issue

echo "🔧 Fixing bcrypt dependency for production..."

# Navigate to the dist directory (or current if already there)
if [ -d "dist" ]; then
    cd dist
fi

# Reinstall bcrypt with proper native compilation
echo "Reinstalling bcrypt..."
npm uninstall bcrypt
npm install bcrypt

# Rebuild native modules
echo "Rebuilding native modules..."
npm rebuild

echo "✅ Fixed! Now try running:"
echo "NODE_ENV=production PORT=5001 node index.js"