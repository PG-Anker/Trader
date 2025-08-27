#!/bin/bash

# CryptoBot Pro Production Build Script

echo "🚀 Building CryptoBot Pro for production..."

# Clean previous builds
rm -rf dist
mkdir -p dist
mkdir -p logs

echo "📦 Building client (React/Vite)..."
npm run build

echo "🔧 Building server (Node.js/Express)..."
npx esbuild server/index.ts --bundle --platform=node --target=node20 --outfile=dist/index.js --external:better-sqlite3 --external:bcrypt --external:puppeteer --external:ws --format=esm

echo "📦 Installing production dependencies..."
cp package.json dist/
cp package-lock.json dist/
cd dist
npm ci --production
npm rebuild bcrypt better-sqlite3
cd ..

echo "🗄️ Initializing production database..."
tsx server/initDb.ts

echo "✅ Build completed successfully!"
echo ""
echo "🐳 To run with Docker:"
echo "  docker build -t cryptobot-pro ."
echo "  docker-compose up -d"
echo ""
echo "⚡ To run with PM2:"
echo "  pm2 start ecosystem.config.js"
echo ""
echo "🖥️ To run directly:"
echo "  NODE_ENV=production node dist/index.js"