# CryptoBot Pro Trading Platform

## Overview

CryptoBot Pro is an automated cryptocurrency trading platform that integrates with the Bybit exchange to execute algorithmic trading strategies. The application provides real-time market analysis, automated position management, and comprehensive trading analytics through a modern web interface.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side navigation
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom crypto trading theme
- **State Management**: TanStack Query for server state management
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with WebSocket support for real-time updates
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL

### Data Storage Solutions
- **Primary Database**: Local SQLite with better-sqlite3 driver (fully compatible and optimized)
- **ORM**: Drizzle with type-safe schema definitions (SQLite dialect)
- **Schema Location**: `shared/schema.ts` for frontend/backend sharing
- **Database Initialization**: Custom init script creates SQLite tables and default data
- **Compatibility**: Complete SQLite migration with optimized queries and data types

## Key Components

### Trading Engine
- **Market Data Collection**: CCXT integration for comprehensive market data from all Bybit USDT pairs
- **Technical Analysis Service**: RSI, MACD, EMA, Bollinger Bands, ADX indicators
- **Strategy Engine**: Supports trend following, mean reversion, breakout, and pullback strategies
- **Risk Management**: Configurable stop-loss, take-profit, and position sizing
- **Exchange Integration**: Bybit API integration for trading execution (paper trading uses simulated trades)
- **Data Separation**: Complete isolation between paper trading and real trading data

### Real-time Communication
- **WebSocket Server**: Provides live updates for positions, market data, and system events
- **Event Broadcasting**: Real-time notifications for trade executions and system alerts
- **Connection Management**: Automatic reconnection and error handling

### User Interface
- **Dashboard**: Overview of trading performance and active positions
- **Position Management**: Real-time position tracking with P&L calculations
- **Strategy Configuration**: Adjustable trading parameters and risk settings
- **System Monitoring**: Bot logs and error tracking interface

### Database Schema
Key entities include:
- `users`: User authentication and profiles
- `tradingSettings`: Configurable trading parameters per user
- `positions`: Active and historical trading positions
- `trades`: Completed trade history with performance metrics
- `botLogs`: System activity and decision logging
- `systemErrors`: Error tracking and resolution status
- `marketData`: Historical price and indicator data

## Data Flow

### Trading Process
1. Market data collection from Bybit WebSocket feeds
2. Technical indicator calculation using historical price data
3. Strategy evaluation based on configured parameters
4. Signal generation with confidence scoring
5. Risk assessment and position sizing calculation
6. Order execution through Bybit REST API
7. Position monitoring and P&L tracking
8. Automated exit based on stop-loss/take-profit levels

### Real-time Updates
1. Server-side events trigger WebSocket broadcasts
2. Frontend receives updates and updates local state
3. UI components re-render with new data
4. Database persistence for audit trail

## External Dependencies

### Exchange Integration
- **Bybit API**: Primary trading venue with testnet/mainnet support
- **WebSocket Feeds**: Real-time market data and order updates
- **REST API**: Order management and account information

### Development Tools
- **Replit Environment**: Development platform with PostgreSQL module
- **Vite Plugins**: Development experience enhancements
- **TypeScript**: Type safety across the entire stack

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Lucide Icons**: Consistent iconography

## Deployment Strategy

### Development Environment
- **Platform**: Replit with Node.js 20 runtime
- **Database**: PostgreSQL 16 module with automatic provisioning
- **Development Server**: Vite dev server with hot module replacement
- **Port Configuration**: Port 5000 for development, port 80 for production

### Production Build
- **Frontend Build**: Vite builds to `dist/public` directory
- **Backend Build**: esbuild bundles server code to `dist/index.js`
- **Static Serving**: Express serves built frontend assets
- **Deployment Target**: Replit autoscale infrastructure

### Environment Configuration
- **Database**: Automatic DATABASE_URL provisioning through Replit
- **API Keys**: Secure storage of Bybit credentials per user
- **Environments**: Support for testnet and mainnet trading

## Changelog

```
Changelog:
- August 28, 2025. CRITICAL FIX: Resolved scoring issue causing all trades to show "Score: 0.0 (avoid)" after 20+ hours of production runtime
- August 28, 2025. CRITICAL FIX: Technical analysis now properly uses user-configured EMA periods (emaFast/emaSlow) instead of hardcoded 12/26
- August 28, 2025. ENHANCED: Scoring system now handles NaN values properly and uses correct indicator properties for accurate scoring
- August 28, 2025. INCREASED: Frontend log display from 100 to 300 entries for better historical visibility  
- August 28, 2025. FIXED: CCXT dual market system implemented with separate clients (spotExchange/linearExchange) and proper defaultType configuration
- August 28, 2025. ADDED: Intelligent batching system (8 symbols per batch, 3-second delays) to prevent CloudFront rate limiting and 403 errors
- August 28, 2025. IMPLEMENTED: Retry logic with exponential backoff (2s, 4s, 8s) for transient network errors and geographic blocking
- August 28, 2025. ENHANCED: Market-specific routing - spot bot uses spot market, leverage bot uses linear market for proper API access
- August 28, 2025. VERIFIED: CCXT dual market system confirmed working on production Ubuntu server with successful Bybit API access
- August 28, 2025. TESTED: Production server successfully fetches BTC/USDT data (10 and 100 candles) proving geographic blocking resolved
- August 28, 2025. CONFIRMED: Dual market system working - spot market (5 candles) and linear market (5 candles) both successful
- August 28, 2025. VALIDATED: Intelligent batching system operational - BTC/USDT, ETH/USDT, BNB/USDT all processed successfully with rate limiting
- August 28, 2025. RESOLVED: All LSP diagnostics and type errors in CCXT integration for production stability
- August 28, 2025. RESOLVED: All LSP diagnostics and type errors in CCXT integration for production stability
- August 28, 2025. REMOVED: Mock data fallback system for production deployment - CCXT now returns empty arrays when API blocked for cleaner production environment
- August 28, 2025. ENHANCED: build.sh script with comprehensive database preservation, user data backup/restore, and dual bot schema updates
- August 28, 2025. FIXED: Data type conversion in trading bots to handle OHLCV object to number array transformation properly
- August 28, 2025. FIXED: Settings save authentication issue by using apiRequest function instead of raw fetch
- August 28, 2025. FIXED: Multiple bot instances issue - eliminated duplicate analysis by ensuring only one bot per type runs at a time
- August 28, 2025. FIXED: Database schema mismatch - corrected Drizzle column names to match SQLite database structure
- August 28, 2025. IMPLEMENTED: Complete dual bot settings interface with independent configuration tabs
- August 28, 2025. OPTIMIZED: Data collection strategy - collect all market data first, then analyze sequentially to prevent redundant API calls
- August 28, 2025. IMPROVED: Analysis efficiency - streamlined logging and reduced delays for faster processing
- August 28, 2025. IMPLEMENTED: Dual bot architecture - separate spot and leverage trading bots with independent control and different strategies
- August 28, 2025. ADDED: Individual bot management - can start/stop spot and leverage bots independently via API endpoints
- August 28, 2025. UPDATED: Database schema to support separate spot and leverage strategies and AI settings
- August 28, 2025. FIXED: Bot analysis speed - now processes all 100 symbols in each cycle instead of 4-6 symbols every 30 seconds
- August 28, 2025. OPTIMIZED: Analysis timing - reduced delays and switched to self-scheduling cycles for better efficiency
- August 28, 2025. REMOVED: Mock data fallback - bot now only uses authentic market data from Bybit APIs
- August 27, 2025. FIXED: CCXT URL encoding issues causing "Invalid URL" errors on production Ubuntu server
- August 27, 2025. Enhanced DeepSeek AI service with intelligent fallback analysis when browser automation fails
- August 27, 2025. Added robust error handling and retry logic for CCXT market data initialization
- August 27, 2025. Fixed MACD indicator type error in trading bot analysis logging
- August 27, 2025. FIXED: build.sh script now preserves existing database and user data during updates
- August 27, 2025. Added reset-admin.js script to fix admin login issues without data loss
- August 27, 2025. Enhanced build process to prevent breaking admin authentication during patches
- August 27, 2025. PRODUCTION: Updated AI trading system to use real DeepSeek browser automation
- August 27, 2025. Added production-ready DeepSeek integration with Chromium browser support
- August 27, 2025. Enhanced AI service with proper Ubuntu server configuration and cleanup methods
- August 27, 2025. Implemented comprehensive AI trading workflow for production deployment
- August 27, 2025. FIXED: Production frontend caching issue - bot logs now update in real-time
- August 27, 2025. Added comprehensive cache busting headers to prevent 304 responses
- August 27, 2025. Enhanced frontend query client with no-cache headers and timestamps  
- August 27, 2025. Added log deletion functionality - users can clear all bot logs from frontend
- August 27, 2025. Fixed paper trading mode to work without API credentials for market analysis
- August 27, 2025. Bot now properly separates paper vs real trading mode credential requirements
- August 27, 2025. Implemented comprehensive fallback system for geographic API blocking
- August 27, 2025. Bot analyzes 100 USDT pairs using mock data when real APIs are blocked
- August 27, 2025. Integrated CCXT for comprehensive market data collection from all Bybit USDT pairs
- August 27, 2025. Implemented complete paper trading vs real trading data separation
- August 27, 2025. Added manual bot start/stop functionality with status indicators
- August 27, 2025. Updated database schema to properly separate paper and real trading data
- August 27, 2025. Modified API routes to filter data based on trading mode (paper/real)
- August 27, 2025. Fixed production WebSocket connection issues and bcrypt dependencies
- August 27, 2025. Removed all mock data and implemented production-ready authentication
- August 27, 2025. Updated all API routes to use real user sessions instead of hardcoded IDs
- August 27, 2025. Fixed Bybit API integration with proper HMAC SHA256 signatures
- August 27, 2025. Created production deployment fixes for Ubuntu server deployment
- August 26, 2025. Completed full SQLite compatibility review and optimization
- August 26, 2025. Added AI trading with DeepSeek integration via web automation
- August 26, 2025. Created production deployment configuration (Docker, PM2, Nginx)
- August 26, 2025. Added comprehensive build and deployment scripts for Ubuntu
- August 26, 2025. Implemented AI trading indicators and controls in dashboard
- August 26, 2025. Migrated from PostgreSQL to local SQLite database
- August 26, 2025. Removed all testnet code, now uses Bybit mainnet only
- August 26, 2025. Added paper trading mode for both spot and leverage trading
- August 26, 2025. Added paper trading indicators to dashboard UI
- August 26, 2025. Updated schema to support paper trading flags
- June 26, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```