#!/bin/bash

# CryptoBot Pro Ubuntu Production Deployment Script

set -e

echo "🚀 CryptoBot Pro - Ubuntu Production Deployment"
echo "=============================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
  echo "❌ Please don't run this script as root"
  exit 1
fi

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install system dependencies for Puppeteer
echo "📦 Installing Chrome dependencies..."
sudo apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils

# Install Google Chrome
echo "📦 Installing Google Chrome..."
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google.list
sudo apt-get update
sudo apt-get install -y google-chrome-stable

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Create application directory
APP_DIR="/opt/cryptobot-pro"
echo "📁 Creating application directory: $APP_DIR"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Copy application files
echo "📁 Copying application files..."
cp -r . $APP_DIR/
cd $APP_DIR

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Build application
echo "🔧 Building application..."
chmod +x build.sh
./build.sh

# Create logs directory
mkdir -p logs

# Set up environment file
echo "⚙️ Setting up environment..."
cp .env.example .env
echo "✏️ Please edit .env file with your configuration"

# Configure systemd service
echo "⚙️ Creating systemd service..."
sudo tee /etc/systemd/system/cryptobot-pro.service > /dev/null <<EOF
[Unit]
Description=CryptoBot Pro Trading Bot
Documentation=https://github.com/your-repo/cryptobot-pro
After=network.target

[Service]
Type=forking
User=$USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=5001
ExecStart=/usr/bin/pm2 start ecosystem.config.js --no-daemon
ExecReload=/usr/bin/pm2 reload cryptobot-pro
ExecStop=/usr/bin/pm2 stop cryptobot-pro
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Configure Nginx (optional)
read -p "🌐 Do you want to configure Nginx reverse proxy? (y/n): " configure_nginx
if [ "$configure_nginx" = "y" ]; then
    echo "📦 Installing Nginx..."
    sudo apt-get install -y nginx
    
    echo "⚙️ Configuring Nginx..."
    sudo cp nginx.conf /etc/nginx/sites-available/cryptobot-pro
    sudo ln -sf /etc/nginx/sites-available/cryptobot-pro /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    sudo nginx -t
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    echo "✅ Nginx configured and started"
fi

# Configure firewall
echo "🔒 Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 5001/tcp
if [ "$configure_nginx" = "y" ]; then
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
fi
sudo ufw --force enable

# Start services
echo "🚀 Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable cryptobot-pro
sudo systemctl start cryptobot-pro

# Final status check
echo "✅ Deployment complete!"
echo ""
echo "📊 Service Status:"
sudo systemctl status cryptobot-pro --no-pager -l
echo ""
echo "🌐 Application URLs:"
echo "  - Direct: http://$(hostname -I | awk '{print $1}'):5001"
if [ "$configure_nginx" = "y" ]; then
    echo "  - Nginx: http://$(hostname -I | awk '{print $1}')/"
fi
echo ""
echo "📋 Management Commands:"
echo "  - View logs: pm2 logs cryptobot-pro"
echo "  - Restart: sudo systemctl restart cryptobot-pro"
echo "  - Stop: sudo systemctl stop cryptobot-pro"
echo "  - Status: sudo systemctl status cryptobot-pro"
echo ""
echo "⚠️  Important: Please edit $APP_DIR/.env with your Bybit API credentials"
echo "🎯 Next: Open the web interface and configure your trading settings"