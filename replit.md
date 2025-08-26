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
- **Primary Database**: Local SQLite with better-sqlite3 driver
- **ORM**: Drizzle with type-safe schema definitions
- **Schema Location**: `shared/schema.ts` for frontend/backend sharing
- **Database Initialization**: Custom init script creates SQLite tables and default data

## Key Components

### Trading Engine
- **Technical Analysis Service**: RSI, MACD, EMA, Bollinger Bands, ADX indicators
- **Strategy Engine**: Supports trend following, mean reversion, breakout, and pullback strategies
- **Risk Management**: Configurable stop-loss, take-profit, and position sizing
- **Exchange Integration**: Bybit API integration for spot and leverage trading

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