// Fix frontend logs display issue
import Database from 'better-sqlite3';

const db = new Database('./database.sqlite');

try {
  console.log('Fixing SQLite timestamp format for frontend display...');
  
  // Update all bot logs to have proper timestamp format
  const updateStmt = db.prepare(`
    UPDATE bot_logs 
    SET created_at = datetime('now') 
    WHERE created_at = 'CURRENT_TIMESTAMP'
  `);
  
  const result = updateStmt.run();
  console.log(`✅ Updated ${result.changes} log entries with proper timestamps`);
  
  // Show sample of updated logs
  const sampleLogs = db.prepare(`
    SELECT id, level, message, symbol, created_at 
    FROM bot_logs 
    ORDER BY id DESC 
    LIMIT 5
  `).all();
  
  console.log('Sample logs with fixed timestamps:');
  sampleLogs.forEach(log => {
    console.log(`- ${log.level}: ${log.message} (${log.created_at})`);
  });
  
} catch (error) {
  console.error('Error fixing timestamps:', error.message);
} finally {
  db.close();
}