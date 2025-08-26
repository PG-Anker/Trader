import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@shared/schema";

// Initialize SQLite database
const sqlite = new Database("./database.sqlite");
const db = drizzle(sqlite, { schema });

// Create tables manually since we switched from PostgreSQL to SQLite
export function initializeDatabase() {
  try {
    // Drop existing tables if they exist
    sqlite.exec(`DROP TABLE IF EXISTS users`);
    sqlite.exec(`DROP TABLE IF EXISTS trading_settings`);
    sqlite.exec(`DROP TABLE IF EXISTS positions`);
    sqlite.exec(`DROP TABLE IF EXISTS trades`);
    sqlite.exec(`DROP TABLE IF EXISTS bot_logs`);
    sqlite.exec(`DROP TABLE IF EXISTS system_errors`);
    sqlite.exec(`DROP TABLE IF EXISTS market_data`);

    // Create tables
    sqlite.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      )
    `);

    sqlite.exec(`
      CREATE TABLE trading_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        usdt_per_trade TEXT NOT NULL DEFAULT '100',
        max_positions INTEGER NOT NULL DEFAULT 10,
        risk_per_trade TEXT NOT NULL DEFAULT '2.5',
        stop_loss TEXT NOT NULL DEFAULT '3.0',
        take_profit TEXT NOT NULL DEFAULT '6.0',
        api_key TEXT,
        secret_key TEXT,
        environment TEXT NOT NULL DEFAULT 'mainnet',
        spot_paper_trading INTEGER NOT NULL DEFAULT 1,
        leverage_paper_trading INTEGER NOT NULL DEFAULT 1,
        rsi_period INTEGER NOT NULL DEFAULT 14,
        rsi_low INTEGER NOT NULL DEFAULT 30,
        rsi_high INTEGER NOT NULL DEFAULT 70,
        ema_fast INTEGER NOT NULL DEFAULT 12,
        ema_slow INTEGER NOT NULL DEFAULT 26,
        macd_signal INTEGER NOT NULL DEFAULT 9,
        adx_period INTEGER NOT NULL DEFAULT 14,
        strategies TEXT NOT NULL DEFAULT '{"trendFollowing": true, "meanReversion": true, "breakoutTrading": false, "pullbackTrading": true}',
        timeframe TEXT NOT NULL DEFAULT '15m',
        min_confidence INTEGER NOT NULL DEFAULT 75,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    sqlite.exec(`
      CREATE TABLE positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        direction TEXT NOT NULL,
        entry_price TEXT NOT NULL,
        current_price TEXT NOT NULL,
        stop_loss TEXT,
        take_profit TEXT,
        quantity TEXT NOT NULL,
        pnl TEXT NOT NULL DEFAULT '0',
        status TEXT NOT NULL DEFAULT 'open',
        trading_mode TEXT NOT NULL,
        strategy TEXT,
        is_paper_trade INTEGER NOT NULL DEFAULT 1,
        bybit_order_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        closed_at TEXT
      )
    `);

    sqlite.exec(`
      CREATE TABLE trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        direction TEXT NOT NULL,
        entry_price TEXT NOT NULL,
        exit_price TEXT NOT NULL,
        quantity TEXT NOT NULL,
        pnl TEXT NOT NULL,
        duration INTEGER,
        strategy TEXT,
        trading_mode TEXT NOT NULL,
        is_paper_trade INTEGER NOT NULL DEFAULT 1,
        entry_time TEXT NOT NULL,
        exit_time TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    sqlite.exec(`
      CREATE TABLE bot_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        symbol TEXT,
        data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    sqlite.exec(`
      CREATE TABLE system_errors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        level TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        source TEXT,
        error_code TEXT,
        resolved INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    sqlite.exec(`
      CREATE TABLE market_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        price TEXT NOT NULL,
        volume TEXT NOT NULL,
        change_24h TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert initial data
    sqlite.exec(`
      INSERT INTO users (id, username, password) VALUES 
      (1, 'admin', 'admin123')
    `);

    sqlite.exec(`
      INSERT INTO trading_settings (
        id, user_id, usdt_per_trade, max_positions, risk_per_trade, stop_loss, take_profit,
        environment, spot_paper_trading, leverage_paper_trading, rsi_period, rsi_low, rsi_high,
        ema_fast, ema_slow, macd_signal, adx_period, strategies, timeframe, min_confidence
      ) VALUES (
        1, 1, '100.00', 10, '2.50', '3.00', '6.00',
        'mainnet', 1, 1, 14, 30, 70,
        12, 26, 9, 14, '{"trendFollowing": true, "meanReversion": true, "breakoutTrading": false, "pullbackTrading": true}', '15m', 75
      )
    `);

    console.log("Database initialized successfully with SQLite");
    return db;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}

// Call initialization
initializeDatabase();