import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

// Migration script to add new columns for dual bot support
export function migrateToDualBots() {
  const sqlite = new Database('database.sqlite');
  const db = drizzle(sqlite);

  console.log('Running dual bot migration...');

  try {
    // Add new columns for spot and leverage strategies
    sqlite.exec(`
      ALTER TABLE trading_settings ADD COLUMN spot_strategies TEXT DEFAULT '{"trendFollowing": true, "meanReversion": true, "breakoutTrading": false, "pullbackTrading": true}';
    `);
    
    sqlite.exec(`
      ALTER TABLE trading_settings ADD COLUMN leverage_strategies TEXT DEFAULT '{"trendFollowing": true, "meanReversion": false, "breakoutTrading": true, "pullbackTrading": false}';
    `);
    
    sqlite.exec(`
      ALTER TABLE trading_settings ADD COLUMN spot_ai_trading_enabled INTEGER DEFAULT 0;
    `);
    
    sqlite.exec(`
      ALTER TABLE trading_settings ADD COLUMN leverage_ai_trading_enabled INTEGER DEFAULT 0;
    `);

    // Copy existing strategies to both spot and leverage
    const existingSettings = sqlite.prepare('SELECT id, strategies, ai_trading_enabled FROM trading_settings').all();
    
    for (const setting of existingSettings) {
      sqlite.prepare(`
        UPDATE trading_settings 
        SET spot_strategies = ?, 
            leverage_strategies = ?,
            spot_ai_trading_enabled = ?,
            leverage_ai_trading_enabled = ?
        WHERE id = ?
      `).run(
        setting.strategies || '{"trendFollowing": true, "meanReversion": true, "breakoutTrading": false, "pullbackTrading": true}',
        setting.strategies || '{"trendFollowing": true, "meanReversion": false, "breakoutTrading": true, "pullbackTrading": false}',
        setting.ai_trading_enabled || 0,
        setting.ai_trading_enabled || 0,
        setting.id
      );
    }

    console.log('✅ Dual bot migration completed successfully');
    
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('✅ Migration already applied');
    } else {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  } finally {
    sqlite.close();
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateToDualBots();
}