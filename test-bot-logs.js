// Quick script to create demo bot logs for immediate testing
const Database = require('better-sqlite3');

const db = new Database('./database.sqlite');

// Insert some demo bot logs to show the logging system works
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
    message: 'Analyzing BTCUSDT',
    symbol: 'BTCUSDT',
    data: JSON.stringify({
      symbol: 'BTCUSDT',
      timeframe: '15m',
      dataPoints: 200
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
  },
  {
    userId: 1,
    level: 'SIGNAL',
    message: 'BTCUSDT: TrendFollowing LONG signal',
    symbol: 'BTCUSDT',
    data: JSON.stringify({
      symbol: 'BTCUSDT',
      confidence: 82,
      strategy: 'TrendFollowing',
      entryPrice: 43250.00
    })
  }
];

console.log('📝 Adding demo bot logs...');

for (const log of demoLogs) {
  db.prepare(`
    INSERT INTO bot_logs (user_id, level, message, symbol, data, created_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(log.userId, log.level, log.message, log.symbol, log.data);
}

console.log('✅ Demo bot logs added successfully!');
console.log('You can now see bot activity in the Bot Log tab');

db.close();