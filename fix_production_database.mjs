import Database from 'better-sqlite3';

const db = new Database('./database.sqlite');

console.log('=== FIXING PRODUCTION DATABASE ISSUES ===');

// Check current schema structure
console.log('\n--- Checking positions table schema ---');
const positionsSchema = db.prepare("PRAGMA table_info(positions)").all();
console.log('Positions table columns:');
positionsSchema.forEach(col => {
  console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
});

// Check if there are any positions with NULL or empty symbols
console.log('\n--- Checking for problematic positions ---');
const badPositions = db.prepare(`
  SELECT id, symbol, direction, status, createdAt 
  FROM positions 
  WHERE symbol IS NULL OR symbol = '' OR symbol = 'null' OR symbol = 'undefined'
`).all();

console.log(`Found ${badPositions.length} positions with invalid symbols`);
badPositions.forEach(pos => {
  console.log(`  ID ${pos.id}: symbol="${pos.symbol}" (${pos.status})`);
});

// Clean up any positions with invalid symbols
if (badPositions.length > 0) {
  console.log('\n--- Cleaning up invalid positions ---');
  const cleanupResult = db.prepare(`
    UPDATE positions 
    SET status = 'closed', closedAt = datetime('now') 
    WHERE symbol IS NULL OR symbol = '' OR symbol = 'null' OR symbol = 'undefined'
  `).run();
  console.log(`✅ Cleaned up ${cleanupResult.changes} positions with invalid symbols`);
}

// Check all open positions
const openPositions = db.prepare(`
  SELECT id, symbol, direction, entryPrice, currentPrice, pnl, status 
  FROM positions 
  WHERE status = 'open'
`).all();

console.log(`\n--- Current open positions: ${openPositions.length} ---`);
openPositions.forEach(pos => {
  console.log(`ID ${pos.id}: ${pos.symbol} ${pos.direction} | Entry: $${pos.entryPrice} | PnL: $${pos.pnl}`);
});

// Check database integrity
console.log('\n--- Database integrity check ---');
try {
  db.prepare("PRAGMA integrity_check").get();
  console.log('✅ Database integrity check passed');
} catch (error) {
  console.log('❌ Database integrity check failed:', error.message);
}

db.close();
console.log('\n🎯 Production database check complete!');