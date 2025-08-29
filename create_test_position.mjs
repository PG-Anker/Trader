import Database from 'better-sqlite3';

const db = new Database('./database.sqlite');

console.log('=== CREATING TEST POSITIONS ===');

// Create a few test positions to demonstrate PnL calculation
const testPositions = [
  {
    userId: 1,
    symbol: 'BTC/USDT',
    direction: 'LONG',
    entryPrice: '65000.00',
    currentPrice: '66000.00', // Profit
    quantity: '0.001',
    stopLoss: '63000.00',
    takeProfit: '70000.00',
    strategy: 'test',
    tradingMode: 'leverage',
    isPaperTrade: 1,
    status: 'open',
    createdAt: new Date().toISOString()
  },
  {
    userId: 1,
    symbol: 'ETH/USDT',
    direction: 'SHORT',
    entryPrice: '3200.00',
    currentPrice: '3100.00', // Profit
    quantity: '0.1',
    stopLoss: '3300.00',
    takeProfit: '3000.00',
    strategy: 'test',
    tradingMode: 'leverage',
    isPaperTrade: 1,
    status: 'open',
    createdAt: new Date().toISOString()
  },
  {
    userId: 1,
    symbol: 'ADA/USDT',
    direction: 'LONG',
    entryPrice: '0.5000',
    currentPrice: '0.4800', // Loss
    quantity: '100',
    stopLoss: '0.4500',
    takeProfit: '0.5500',
    strategy: 'test',
    tradingMode: 'spot',
    isPaperTrade: 1,
    status: 'open',
    createdAt: new Date().toISOString()
  }
];

const insertPosition = db.prepare(`
  INSERT INTO positions (
    userId, symbol, direction, entryPrice, currentPrice, quantity, 
    stopLoss, takeProfit, strategy, tradingMode, isPaperTrade, 
    status, createdAt, pnl
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

testPositions.forEach(pos => {
  // Calculate initial PnL
  const entryPrice = parseFloat(pos.entryPrice);
  const currentPrice = parseFloat(pos.currentPrice);
  const quantity = parseFloat(pos.quantity);
  
  let pnl;
  if (pos.direction === 'LONG') {
    pnl = (currentPrice - entryPrice) * quantity;
  } else {
    pnl = (entryPrice - currentPrice) * quantity;
  }
  
  insertPosition.run(
    pos.userId, pos.symbol, pos.direction, pos.entryPrice, pos.currentPrice,
    pos.quantity, pos.stopLoss, pos.takeProfit, pos.strategy, pos.tradingMode,
    pos.isPaperTrade, pos.status, pos.createdAt, pnl.toString()
  );
  
  console.log(`✅ Created ${pos.symbol} ${pos.direction} position - PnL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);
});

// Verify the positions were created
const positions = db.prepare(`
  SELECT id, symbol, direction, entryPrice, currentPrice, pnl, status 
  FROM positions 
  WHERE status = 'open'
`).all();

console.log(`\n=== VERIFICATION: ${positions.length} positions created ===`);
positions.forEach(pos => {
  console.log(`${pos.symbol}: ${pos.direction} | Entry $${pos.entryPrice} | Current $${pos.currentPrice} | PnL: $${pos.pnl}`);
});

db.close();
console.log('\n🎯 Test positions created successfully!');