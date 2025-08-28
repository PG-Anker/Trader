import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import bcrypt from 'bcrypt';

console.log('🚀 Initializing database with dual bot support...');

const sqlite = new Database('database.sqlite');
const db = drizzle(sqlite);

try {
  // Create users table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `);

  // Create trading_settings table with dual bot support
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS trading_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      usdtPerTrade TEXT NOT NULL DEFAULT "100",
      maxPositions INTEGER NOT NULL DEFAULT 10,
      riskPerTrade TEXT NOT NULL DEFAULT "2.5",
      stopLoss TEXT NOT NULL DEFAULT "3.0",
      takeProfit TEXT NOT NULL DEFAULT "6.0",
      apiKey TEXT,
      secretKey TEXT,
      environment TEXT NOT NULL DEFAULT "mainnet",
      spotPaperTrading INTEGER NOT NULL DEFAULT 1,
      leveragePaperTrading INTEGER NOT NULL DEFAULT 1,
      rsiPeriod INTEGER NOT NULL DEFAULT 14,
      rsiLow INTEGER NOT NULL DEFAULT 30,
      rsiHigh INTEGER NOT NULL DEFAULT 70,
      emaFast INTEGER NOT NULL DEFAULT 12,
      emaSlow INTEGER NOT NULL DEFAULT 26,
      macdSignal INTEGER NOT NULL DEFAULT 9,
      adxPeriod INTEGER NOT NULL DEFAULT 14,
      strategies TEXT NOT NULL DEFAULT '{"trendFollowing": true, "meanReversion": true, "breakoutTrading": false, "pullbackTrading": true}',
      spotStrategies TEXT NOT NULL DEFAULT '{"trendFollowing": true, "meanReversion": true, "breakoutTrading": false, "pullbackTrading": true}',
      leverageStrategies TEXT NOT NULL DEFAULT '{"trendFollowing": true, "meanReversion": false, "breakoutTrading": true, "pullbackTrading": false}',
      aiTradingEnabled INTEGER NOT NULL DEFAULT 0,
      spotAiTradingEnabled INTEGER NOT NULL DEFAULT 0,
      leverageAiTradingEnabled INTEGER NOT NULL DEFAULT 0,
      timeframe TEXT NOT NULL DEFAULT "15m",
      minConfidence INTEGER NOT NULL DEFAULT 75,
      updatedAt TEXT DEFAULT "CURRENT_TIMESTAMP"
    )
  `);

  // Create positions table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      direction TEXT NOT NULL,
      entryPrice TEXT NOT NULL,
      currentPrice TEXT NOT NULL,
      stopLoss TEXT,
      takeProfit TEXT,
      quantity TEXT NOT NULL,
      pnl TEXT NOT NULL DEFAULT "0",
      status TEXT NOT NULL DEFAULT "open",
      tradingMode TEXT NOT NULL,
      strategy TEXT,
      isPaperTrade INTEGER NOT NULL DEFAULT 1,
      bybitOrderId TEXT,
      createdAt TEXT DEFAULT "CURRENT_TIMESTAMP",
      closedAt TEXT
    )
  `);

  // Create trades table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      direction TEXT NOT NULL,
      entryPrice TEXT NOT NULL,
      exitPrice TEXT NOT NULL,
      quantity TEXT NOT NULL,
      pnl TEXT NOT NULL,
      duration INTEGER,
      strategy TEXT,
      tradingMode TEXT NOT NULL,
      isPaperTrade INTEGER NOT NULL DEFAULT 1,
      entryTime TEXT NOT NULL DEFAULT "CURRENT_TIMESTAMP",
      exitTime TEXT NOT NULL DEFAULT "CURRENT_TIMESTAMP",
      createdAt TEXT DEFAULT "CURRENT_TIMESTAMP"
    )
  `);

  // Create bot_logs table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS bot_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      symbol TEXT,
      data TEXT,
      createdAt TEXT DEFAULT "CURRENT_TIMESTAMP"
    )
  `);

  // Create system_errors table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS system_errors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      level TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      source TEXT,
      errorCode TEXT,
      resolved INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT DEFAULT "CURRENT_TIMESTAMP"
    )
  `);

  // Create market_data table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS market_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL UNIQUE,
      price TEXT NOT NULL,
      volume TEXT NOT NULL,
      change24h TEXT,
      timestamp TEXT DEFAULT "CURRENT_TIMESTAMP"
    )
  `);

  // Create default admin user
  const existingUser = sqlite.prepare('SELECT * FROM users WHERE username = ?').get('admin');
  
  if (!existingUser) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    sqlite.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('admin', hashedPassword);
    console.log('✅ Created default admin user (username: admin, password: admin123)');

    // Create default trading settings for admin
    sqlite.prepare(`
      INSERT INTO trading_settings (
        userId, usdtPerTrade, maxPositions, riskPerTrade, stopLoss, takeProfit,
        environment, spotPaperTrading, leveragePaperTrading, rsiPeriod, rsiLow, rsiHigh,
        emaFast, emaSlow, macdSignal, adxPeriod, strategies, spotStrategies, leverageStrategies,
        aiTradingEnabled, spotAiTradingEnabled, leverageAiTradingEnabled, timeframe, minConfidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      1, "100", 10, "2.5", "3.0", "6.0", "mainnet", 1, 1, 14, 30, 70,
      12, 26, 9, 14,
      '{"trendFollowing": true, "meanReversion": true, "breakoutTrading": false, "pullbackTrading": true}',
      '{"trendFollowing": true, "meanReversion": true, "breakoutTrading": false, "pullbackTrading": true}',
      '{"trendFollowing": true, "meanReversion": false, "breakoutTrading": true, "pullbackTrading": false}',
      0, 0, 0, "15m", 75
    );
    console.log('✅ Created default trading settings with dual bot support');
  }

  console.log('✅ Database initialization completed successfully');
  console.log('📊 Database contains tables:', sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name));

} catch (error) {
  console.error('❌ Database initialization failed:', error);
} finally {
  sqlite.close();
}