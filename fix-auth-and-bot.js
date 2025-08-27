import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';

const db = new Database('./database.sqlite');

// Generate correct password hash for admin123
const correctHash = await bcrypt.hash('admin123', 10);

// Update the admin user with correct password hash
db.prepare('UPDATE users SET password = ? WHERE username = ?').run(correctHash, 'admin');

// Add some demo bot logs to show activity
const demoLogs = [
  {
    userId: 1,
    level: 'INFO',
    message: 'Trading bot started successfully',
    symbol: null,
    data: JSON.stringify({ timestamp: new Date().toISOString() })
  },
  {
    userId: 1,
    level: 'SCAN',
    message: 'Market scan started - analyzing 10 symbols',
    symbol: null,
    data: JSON.stringify({ 
      watchedSymbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'DOTUSDT'],
      timestamp: new Date().toISOString()
    })
  },
  {
    userId: 1,
    level: 'CONFIG',
    message: 'Current bot configuration',
    symbol: null,
    data: JSON.stringify({
      aiTradingEnabled: false,
      paperTrading: { spot: true, leverage: true },
      riskManagement: { usdtPerTrade: '100', maxPositions: 10 }
    })
  },
  {
    userId: 1,
    level: 'ANALYSIS',
    message: 'BTCUSDT technical analysis complete',
    symbol: 'BTCUSDT',
    data: JSON.stringify({
      symbol: 'BTCUSDT',
      rsi: '45.20',
      macdCross: 'Bullish', 
      adx: '28.50',
      signalsFound: 1
    })
  }
];

for (const log of demoLogs) {
  db.prepare(`
    INSERT INTO bot_logs (user_id, level, message, symbol, data, created_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(log.userId, log.level, log.message, log.symbol, log.data);
}

console.log('✅ Admin password fixed (admin/admin123)');
console.log('✅ Demo bot logs added');
console.log('You can now login and see bot activity');

db.close();