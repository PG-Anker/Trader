import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

console.log('🔧 Fixing database schema for dual bot support...');

const sqlite = new Database('database.sqlite');

try {
  // Check existing columns
  const tableInfo = sqlite.prepare("PRAGMA table_info(trading_settings)").all();
  const existingColumns = tableInfo.map(col => col.name);
  
  console.log('📋 Existing columns:', existingColumns);

  // Add missing columns one by one with error handling
  const columnsToAdd = [
    {
      name: 'spot_strategies',
      sql: `ALTER TABLE trading_settings ADD COLUMN spot_strategies TEXT DEFAULT '{"trendFollowing": true, "meanReversion": true, "breakoutTrading": false, "pullbackTrading": true}'`
    },
    {
      name: 'leverage_strategies',
      sql: `ALTER TABLE trading_settings ADD COLUMN leverage_strategies TEXT DEFAULT '{"trendFollowing": true, "meanReversion": false, "breakoutTrading": true, "pullbackTrading": false}'`
    },
    {
      name: 'spot_ai_trading_enabled',
      sql: `ALTER TABLE trading_settings ADD COLUMN spot_ai_trading_enabled INTEGER DEFAULT 0`
    },
    {
      name: 'leverage_ai_trading_enabled',
      sql: `ALTER TABLE trading_settings ADD COLUMN leverage_ai_trading_enabled INTEGER DEFAULT 0`
    }
  ];

  for (const column of columnsToAdd) {
    if (!existingColumns.includes(column.name)) {
      try {
        sqlite.exec(column.sql);
        console.log(`✅ Added column: ${column.name}`);
      } catch (error) {
        console.log(`⚠️ Column ${column.name} might already exist or error:`, error.message);
      }
    } else {
      console.log(`✅ Column ${column.name} already exists`);
    }
  }

  // Update existing records to have proper strategy values
  const updateExistingRecords = sqlite.prepare(`
    UPDATE trading_settings 
    SET spot_strategies = COALESCE(spot_strategies, strategies, '{"trendFollowing": true, "meanReversion": true, "breakoutTrading": false, "pullbackTrading": true}'),
        leverage_strategies = COALESCE(leverage_strategies, strategies, '{"trendFollowing": true, "meanReversion": false, "breakoutTrading": true, "pullbackTrading": false}'),
        spot_ai_trading_enabled = COALESCE(spot_ai_trading_enabled, ai_trading_enabled, 0),
        leverage_ai_trading_enabled = COALESCE(leverage_ai_trading_enabled, ai_trading_enabled, 0)
    WHERE spot_strategies IS NULL OR leverage_strategies IS NULL OR spot_ai_trading_enabled IS NULL OR leverage_ai_trading_enabled IS NULL
  `);

  const result = updateExistingRecords.run();
  console.log(`📝 Updated ${result.changes} existing records with dual bot settings`);

  // Verify the schema
  const finalTableInfo = sqlite.prepare("PRAGMA table_info(trading_settings)").all();
  console.log('🔍 Final schema columns:', finalTableInfo.map(col => col.name));

  console.log('✅ Database schema migration completed successfully');

} catch (error) {
  console.error('❌ Migration failed:', error);
} finally {
  sqlite.close();
}