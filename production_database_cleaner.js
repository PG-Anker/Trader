// Production Database Cleaner - Run this on your production server
// This script will clean up any positions with empty symbols and provide diagnostics

const Database = require('better-sqlite3');
const path = require('path');

// Adjust this path to match your production database location
const DB_PATH = './database.sqlite';

function cleanProductionDatabase() {
  console.log('🔧 Production Database Cleaner Starting...');
  
  let db;
  try {
    db = new Database(DB_PATH);
    
    // Check current state
    console.log('\n📊 Current Database State:');
    const totalPositions = db.prepare('SELECT COUNT(*) as count FROM positions').get();
    console.log(`Total positions: ${totalPositions.count}`);
    
    const openPositions = db.prepare('SELECT COUNT(*) as count FROM positions WHERE status = "open"').get();
    console.log(`Open positions: ${openPositions.count}`);
    
    // Find positions with invalid symbols
    const badPositions = db.prepare(`
      SELECT id, symbol, direction, status, createdAt 
      FROM positions 
      WHERE symbol IS NULL OR symbol = '' OR symbol = 'null' OR symbol = 'undefined' OR TRIM(symbol) = ''
    `).all();
    
    console.log(`\n🔍 Found ${badPositions.length} positions with invalid symbols:`);
    badPositions.forEach(pos => {
      console.log(`  ID: ${pos.id} | Symbol: "${pos.symbol}" | Direction: ${pos.direction} | Status: ${pos.status}`);
    });
    
    // Show sample of current open positions
    const samplePositions = db.prepare(`
      SELECT id, symbol, direction, entryPrice, pnl, status, createdAt 
      FROM positions 
      WHERE status = 'open' 
      ORDER BY createdAt DESC 
      LIMIT 10
    `).all();
    
    console.log(`\n📋 Sample of current open positions (showing first 10):`);
    samplePositions.forEach(pos => {
      const symbolDisplay = pos.symbol || '(EMPTY)';
      console.log(`  ID: ${pos.id} | Symbol: "${symbolDisplay}" | ${pos.direction} | Entry: $${pos.entryPrice} | PnL: $${pos.pnl}`);
    });
    
    // Clean up invalid positions if any exist
    if (badPositions.length > 0) {
      console.log(`\n🧹 Cleaning up ${badPositions.length} positions with invalid symbols...`);
      
      const cleanupResult = db.prepare(`
        UPDATE positions 
        SET status = 'closed', 
            closedAt = datetime('now'),
            pnl = '0'
        WHERE symbol IS NULL OR symbol = '' OR symbol = 'null' OR symbol = 'undefined' OR TRIM(symbol) = ''
      `).run();
      
      console.log(`✅ Cleaned up ${cleanupResult.changes} positions`);
    } else {
      console.log('\n✅ No cleanup needed - all positions have valid symbols');
    }
    
    // Final state
    console.log('\n📊 Final Database State:');
    const finalOpen = db.prepare('SELECT COUNT(*) as count FROM positions WHERE status = "open"').get();
    console.log(`Open positions after cleanup: ${finalOpen.count}`);
    
    // Show positions by symbol for analysis
    const symbolGroups = db.prepare(`
      SELECT symbol, COUNT(*) as count, status
      FROM positions 
      WHERE status = 'open'
      GROUP BY symbol, status
      ORDER BY count DESC
    `).all();
    
    console.log('\n📈 Open positions by symbol:');
    symbolGroups.forEach(group => {
      const symbolDisplay = group.symbol || '(EMPTY)';
      console.log(`  ${symbolDisplay}: ${group.count} positions`);
    });
    
    console.log('\n🎯 Production database cleanup complete!');
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error.message);
  } finally {
    if (db) {
      db.close();
    }
  }
}

// Run the cleaner
cleanProductionDatabase();