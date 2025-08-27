// Quick script to reset admin password
import bcrypt from 'bcrypt';
import Database from 'better-sqlite3';

const db = new Database('./database.sqlite');

async function resetAdmin() {
  try {
    console.log('Resetting admin password...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Update admin user password
    const stmt = db.prepare('UPDATE users SET password = ? WHERE username = ?');
    const result = stmt.run(hashedPassword, 'admin');
    
    if (result.changes > 0) {
      console.log('✅ Admin password reset successfully');
      console.log('Username: admin');
      console.log('Password: admin123');
    } else {
      console.log('❌ Admin user not found, creating...');
      const insertStmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
      insertStmt.run('admin', hashedPassword);
      console.log('✅ Admin user created successfully');
    }
    
    // Show all users
    const users = db.prepare('SELECT id, username FROM users').all();
    console.log('Current users:', users);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    db.close();
  }
}

resetAdmin();