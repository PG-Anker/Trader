# Production Deployment Fixes

## Issue: Invalid Credentials in Production Ubuntu Server

### Problem
User reports "invalid credentials" when running the bot on production Ubuntu server.

### Root Cause Analysis
1. **Environment Variables**: Production may not have proper DATABASE_URL or session storage configured
2. **Authentication System**: Session-based auth may not persist in production environment  
3. **Database Connection**: PostgreSQL connection issues in Ubuntu environment
4. **Build Configuration**: Missing environment variables in production build

### Solution Steps

#### 1. Check Environment Variables
```bash
# Verify all required environment variables are set
echo $DATABASE_URL
echo $NODE_ENV
echo $PORT
```

#### 2. Fix Authentication in Production
The app uses in-memory session storage which doesn't persist across restarts. For production:

**Option A: Use PostgreSQL Session Store**
```bash
# Add to production environment
npm install connect-pg-simple express-session
```

**Option B: Use Redis Session Store**  
```bash
# Add Redis for session persistence
npm install connect-redis redis
```

#### 3. Production Database Setup
```bash
# Ensure PostgreSQL is running
sudo systemctl status postgresql
sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE cryptobot;
CREATE USER cryptobot_user WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE cryptobot TO cryptobot_user;
```

#### 4. Production Environment File
Create `.env.production`:
```env
NODE_ENV=production
DATABASE_URL=postgresql://cryptobot_user:strong_password@localhost:5432/cryptobot
PORT=80
SESSION_SECRET=your_secure_session_secret_here
```

#### 5. Build and Run Production
```bash
# Build the application
npm run build

# Run with PM2 for process management
pm2 start ecosystem.config.js --env production

# Or run directly
NODE_ENV=production node dist/index.js
```

### Immediate Fix for Development
The current issue in Replit development is that bot logs API was missing authentication. This has been fixed by:
1. Adding `requireAuth` middleware to `/api/bot-logs` endpoint
2. Using proper user ID from session instead of hardcoded value

### Next Steps for Production
1. Set up proper session persistence (PostgreSQL or Redis)
2. Configure environment variables correctly
3. Ensure database connectivity
4. Test authentication flow in production environment