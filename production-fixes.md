# Production Deployment Fixes

## Issue: Invalid Credentials in Production Ubuntu Server

### Problem
User reports "invalid credentials" when running the bot on production Ubuntu server.

### Root Cause Analysis
1. **SQLite Database**: Production may not have the SQLite database file properly initialized
2. **Authentication System**: Session-based auth using in-memory storage doesn't persist across restarts
3. **Database Connection**: SQLite file permissions or path issues in Ubuntu environment
4. **Build Configuration**: Missing NODE_ENV and other environment variables

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

#### 3. Production SQLite Database Setup
```bash
# Initialize SQLite database in production
npm run db:migrate

# Or manually initialize:
node -e "import('./server/initDb.js').then(m => m.initializeDatabase())"

# Check database file exists and has correct permissions
ls -la database.sqlite
chmod 644 database.sqlite
```

#### 4. Production Environment File
Create `.env.production`:
```env
NODE_ENV=production
PORT=80
SESSION_SECRET=your_secure_session_secret_here
# SQLite database file will be created automatically
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
The issues in Replit development:
1. ✅ Bot logs API was missing authentication - now fixed with requireAuth middleware
2. ✅ SQLite database exists but sessions are in-memory and reset on server restart
3. ✅ Added health check endpoint to verify server status
4. ✅ Updated production guide for SQLite instead of PostgreSQL

### Immediate Fix for Production Ubuntu Server
The "invalid credentials" error is likely due to:

**Step 1: Initialize SQLite Database**
```bash
# In your project directory on Ubuntu server:
node -e "import('./server/initDb.js').then(m => m.initializeDatabase())"
ls -la database.sqlite  # Verify file exists
```

**Step 2: Create Admin User**
```bash
# After database is initialized, create admin user:
node -e "
import('./server/initDb.js').then(async (m) => {
  await m.initializeDatabase();
  console.log('Admin user created - username: admin, password: admin123');
});"
```

**Step 3: Test Server**
```bash
# Test if server responds:
curl http://localhost:5000/api/health

# Test login:
curl -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'
```

The bot will work in paper trading mode without Bybit API credentials.