import Database from 'better-sqlite3';

const db = new Database('./database.sqlite');

console.log('=== CHECKING POSITION DATA ===');

// Check open positions
const openPositions = db.prepare(`
  SELECT id, symbol, direction, entryPrice, currentPrice, pnl, status, createdAt 
  FROM positions 
  WHERE status = 'open' 
  LIMIT 10
`).all();

console.log(`Total open positions: ${openPositions.length}`);
console.log('\n--- Sample positions ---');
openPositions.forEach(pos => {
  const entryPrice = parseFloat(pos.entryPrice);
  const currentPrice = parseFloat(pos.currentPrice);
  const quantity = 1; // Assuming for calculation
  
  let calculatedPnL;
  if (pos.direction === 'UP' || pos.direction === 'LONG') {
    calculatedPnL = (currentPrice - entryPrice) * quantity;
  } else {
    calculatedPnL = (entryPrice - currentPrice) * quantity;
  }
  
  console.log(`ID: ${pos.id} | ${pos.symbol} | ${pos.direction}`);
  console.log(`  Entry: $${entryPrice} | Current: $${currentPrice}`);
  console.log(`  Stored PnL: ${pos.pnl} | Calculated PnL: ${calculatedPnL.toFixed(2)}`);
  console.log(`  Created: ${pos.createdAt}`);
  console.log('---');
});

// Check all positions regardless of status
const allPositions = db.prepare(`
  SELECT id, symbol, direction, entryPrice, currentPrice, pnl, status, createdAt 
  FROM positions 
  ORDER BY createdAt DESC 
  LIMIT 10
`).all();

console.log('\n=== ALL POSITIONS (RECENT) ===');
allPositions.forEach(pos => {
  console.log(`${pos.symbol}: ${pos.direction} | Entry $${pos.entryPrice} | Current $${pos.currentPrice} | PnL: ${pos.pnl} | Status: ${pos.status}`);
});

// Check position count by status
const statusCounts = db.prepare(`
  SELECT status, COUNT(*) as count 
  FROM positions 
  GROUP BY status
`).all();

console.log('\n=== POSITION COUNTS BY STATUS ===');
statusCounts.forEach(row => {
  console.log(`${row.status}: ${row.count} positions`);
});

db.close();