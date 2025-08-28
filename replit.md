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