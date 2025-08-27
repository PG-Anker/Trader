# Ubuntu Server Production Fix

## Critical: SQLite Database Setup for Production

Your "invalid credentials" error on Ubuntu server is because the SQLite database needs to be properly initialized.

### Step 1: Initialize Database on Ubuntu Server
```bash
# In your project directory:
cd /path/to/your/crypto-bot-project

# Initialize SQLite database:
npx tsx server/initDb.ts

# Verify database file was created:
ls -la database.sqlite
```

### Step 2: Create Admin User
```bash
# Run this command to create admin user with correct password:
npx tsx -e "
import { storage } from './server/storage.js';
import { hashPassword } from './server/auth.js';

async function createAdmin() {
  console.log('Creating admin user...');
  const hashedPassword = await hashPassword('admin123');
  
  try {
    await storage.createUser({
      username: 'admin',
      password: hashedPassword
    });
    console.log('✅ Admin user created successfully');
    console.log('Username: admin');
    console.log('Password: admin123');
  } catch (error) {
    console.log('User may already exist:', error.message);
  }
}

createAdmin();
"
```

### Step 3: Test Login on Ubuntu Server
```bash
# Test if server is running:
curl http://localhost:5000/api/health

# Test login with admin credentials:
curl -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'

# Should return: {"success":true,"user":{"id":1,"username":"admin"},"sessionId":"..."}
```

### Step 4: Start Bot
```bash
# Start the trading bot:
curl -X POST http://localhost:5000/api/bot/start \
  -H 'Content-Type: application/json' \
  -H 'X-Session-ID: YOUR_SESSION_ID_FROM_LOGIN'
```

### Important Notes:
- The bot works in **paper trading mode** without Bybit API credentials
- Sessions are stored in memory and reset when server restarts
- For production, consider using Redis or database session storage
- The bot analyzes 100+ USDT cryptocurrency pairs automatically
- All technical indicators (RSI, MACD, ADX) use real market data analysis

### If Still Getting "Invalid Credentials":
1. Check that database.sqlite file exists and has data
2. Verify the admin user was created successfully  
3. Make sure server is running on the correct port
4. Check server logs for detailed error messages