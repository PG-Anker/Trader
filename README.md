# CryptoBot Pro - AI-Powered Trading Bot

A comprehensive cryptocurrency trading bot with AI analysis capabilities, automated trading for Bybit exchange, and real-time portfolio management.

## Features

- 🤖 **AI-Powered Trading**: DeepSeek AI integration for intelligent market analysis
- 📊 **Technical Analysis**: RSI, MACD, EMA, Bollinger Bands, ADX indicators
- 💰 **Dual Trading Modes**: Spot and leverage trading with configurable parameters
- 🎯 **Paper Trading**: Safe testing mode without risking real money
- 🔄 **Real-time Updates**: WebSocket-based live data and position monitoring
- 🎨 **Modern UI**: Dark-themed dashboard with comprehensive analytics
- 🔒 **Production Ready**: Docker support, PM2 process management, Nginx reverse proxy

## Quick Start

### Prerequisites

- Node.js 20+
- Ubuntu 20.04+ (for production)
- Bybit API credentials (mainnet)

### Development Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd cryptobot-pro
   npm install
   ```

2. **Initialize database**
   ```bash
   npm run db:init
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Configure trading settings**
   - Open http://localhost:5000
   - Go to Settings tab
   - Add your Bybit API credentials
   - Configure trading parameters
   - Enable paper trading for safety

### Production Deployment

#### Option 1: Docker Deployment (Recommended)

1. **Build and run with Docker Compose**
   ```bash
   chmod +x build.sh
   ./build.sh
   docker-compose up -d
   ```

2. **Access the application**
   - Web interface: http://your-server-ip
   - Logs: `docker-compose logs -f cryptobot-pro`

#### Option 2: PM2 Process Manager

1. **Build for production**
   ```bash
   chmod +x build.sh
   ./build.sh
   ```

2. **Install PM2 globally**
   ```bash
   npm install -g pm2
   ```

3. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

4. **Configure Nginx (optional)**
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/cryptobot-pro
   sudo ln -s /etc/nginx/sites-available/cryptobot-pro /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

#### Option 3: Direct Node.js

1. **Build application**
   ```bash
   ./build.sh
   ```

2. **Run in production**
   ```bash
   NODE_ENV=production PORT=3000 node dist/index.js
   ```

## Configuration

### Environment Variables

- `NODE_ENV`: Set to 'production' for production deployment
- `PORT`: Server port (default: 3000 in production, 5000 in development)

### Trading Settings

Configure through the web interface Settings tab:

- **API Credentials**: Bybit mainnet API key and secret
- **Trading Parameters**: USDT per trade, max positions, risk management
- **Paper Trading**: Enable/disable virtual trading mode
- **AI Trading**: Enable DeepSeek AI analysis
- **Technical Indicators**: RSI, MACD, EMA periods and thresholds
- **Trading Strategies**: Trend following, mean reversion, breakout, pullback

### Security Considerations

- API keys are encrypted and stored locally
- Paper trading is enabled by default for safety
- Rate limiting and security headers configured in Nginx
- Container runs as non-root user
- Database is SQLite file-based with local storage

## AI Trading Mode

When AI Trading is enabled:

1. Bot fetches real-time market data from Bybit
2. Preprocesses data including technical indicators
3. Sends structured prompt to DeepSeek AI via web automation
4. Parses AI response for trading signals
5. Executes trades based on AI recommendations
6. Monitors positions and manages risk

### AI Prompt Structure

The bot sends comprehensive market data to DeepSeek including:
- Current price and 24h change
- Volume and price range
- Technical indicators (RSI, MACD, EMA, Bollinger Bands, ADX)
- Support and resistance levels
- Trading mode context (spot/leverage)

## Architecture

### Frontend
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui components
- TanStack Query for state management
- Wouter for routing
- WebSocket for real-time updates

### Backend
- Node.js + Express + TypeScript
- SQLite database with Drizzle ORM
- WebSocket server for real-time communication
- Puppeteer for AI web automation
- Better-sqlite3 for database operations

### External Services
- Bybit API for trading operations
- DeepSeek AI for market analysis
- WebSocket feeds for real-time data

## Monitoring

### Health Checks
- Built-in health endpoint: `/health`
- Docker health checks configured
- PM2 auto-restart on failure

### Logging
- Structured logging with timestamps
- Separate error and output logs
- Real-time bot activity logs in UI
- System error tracking and resolution

### Performance
- WebSocket connection pooling
- Rate limiting for API protection
- Memory usage monitoring
- Auto-restart on memory limits

## Troubleshooting

### Common Issues

1. **Database connection errors**
   ```bash
   tsx server/initDb.ts
   ```

2. **DeepSeek AI initialization fails**
   - Check internet connection
   - Verify Chrome/Chromium installation
   - Review AI service logs

3. **Bybit API connection issues**
   - Verify API credentials
   - Check API key permissions
   - Ensure mainnet (not testnet) keys

4. **WebSocket disconnections**
   - Check network stability
   - Review rate limiting settings
   - Monitor connection logs

### Logs Location

- **Docker**: `docker-compose logs -f`
- **PM2**: `pm2 logs cryptobot-pro`
- **Direct**: Console output + `./logs/` directory
- **Application**: Real-time logs in Bot Log tab

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review application logs
3. Verify configuration settings
4. Test with paper trading first

## Disclaimer

This software is for educational and testing purposes. Cryptocurrency trading involves significant risk. Always test with paper trading before using real funds. The developers are not responsible for any financial losses.