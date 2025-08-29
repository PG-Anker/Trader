import Database from 'better-sqlite3';

const db = new Database('./database.sqlite');

console.log('=== CHECKING PRODUCTION POSITIONS ===');

// Check all open positions
const openPositions = db.prepare(`
  SELECT id, symbol, direction, entryPrice, currentPrice, pnl, status, createdAt 
  FROM positions 
  WHERE status = 'open' 
  ORDER BY createdAt DESC
`).all();

console.log(`Total open positions: ${openPositions.length}`);

// Look for positions with empty or invalid symbols
console.log('\n--- Checking for invalid symbols ---');
openPositions.forEach((pos, index) => {
  const symbolIssue = !pos.symbol || pos.symbol.trim() === '' || pos.symbol === 'null' || pos.symbol === 'undefined';
  if (symbolIssue || index < 10) { // Show first 10 + any problematic ones
    console.log(`ID: ${pos.id} | Symbol: "${pos.symbol}" | Direction: ${pos.direction} | Status: ${pos.status}`);
    if (symbolIssue) {
      console.log(`  ⚠️  ISSUE: Invalid symbol detected`);
    }
  }
});

// Count positions by symbol to identify patterns
const symbolCounts = db.prepare(`
  SELECT symbol, COUNT(*) as count 
  FROM positions 
  WHERE status = 'open'
  GROUP BY symbol
  ORDER BY count DESC
`).all();

console.log('\n=== SYMBOL DISTRIBUTION ===');
symbolCounts.forEach(row => {
  const symbolDisplay = row.symbol || '(empty)';
  console.log(`${symbolDisplay}: ${row.count} positions`);
});

// Check for recently created positions
const recentPositions = db.prepare(`
  SELECT id, symbol, direction, strategy, createdAt 
  FROM positions 
  WHERE status = 'open' 
  ORDER BY createdAt DESC 
  LIMIT 5
`).all();

console.log('\n=== MOST RECENT POSITIONS ===');
recentPositions.forEach(pos => {
  console.log(`${pos.createdAt}: "${pos.symbol}" ${pos.direction} (${pos.strategy})`);
});

db.close();