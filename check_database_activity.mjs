import Database from 'better-sqlite3';

const db = new Database('./database.sqlite');

console.log('=== CHECKING DATABASE ACTIVITY ===');

// Check positions
const positions = db.prepare('SELECT COUNT(*) as count FROM positions').get();
console.log(`Total positions: ${positions.count}`);

// Check trades  
const trades = db.prepare('SELECT COUNT(*) as count FROM trades').get();
console.log(`Total trades: ${trades.count}`);

// Check bot logs
const logs = db.prepare('SELECT COUNT(*) as count FROM botLogs').get();
console.log(`Total bot logs: ${logs.count}`);

// Recent bot logs
const recentLogs = db.prepare(`
  SELECT level, message, createdAt 
  FROM botLogs 
  ORDER BY createdAt DESC 
  LIMIT 5
`).all();

console.log('\n=== RECENT BOT ACTIVITY ===');
recentLogs.forEach(log => {
  console.log(`${log.createdAt}: [${log.level}] ${log.message}`);
});

// Check if any positions were created recently
const recentPositions = db.prepare(`
  SELECT id, symbol, direction, status, createdAt 
  FROM positions 
  ORDER BY createdAt DESC 
  LIMIT 3
`).all();

console.log('\n=== RECENT POSITIONS ===');
if (recentPositions.length > 0) {
  recentPositions.forEach(pos => {
    console.log(`${pos.createdAt}: ${pos.symbol} ${pos.direction} (${pos.status})`);
  });
} else {
  console.log('No positions found');
}

db.close();