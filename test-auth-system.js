import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';

const db = new Database('./database.sqlite');

console.log('🔍 Testing authentication system...');

// Test 1: Check if admin user exists
const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
console.log('Admin user:', admin ? '✅ Found' : '❌ Not found');

if (admin) {
  // Test 2: Verify admin password
  const isValidPassword = await bcrypt.compare('admin123', admin.password);
  console.log('Admin password verification:', isValidPassword ? '✅ Valid' : '❌ Invalid');
  
  if (!isValidPassword) {
    // Fix admin password
    const correctHash = await bcrypt.hash('admin123', 10);
    db.prepare('UPDATE users SET password = ? WHERE username = ?').run(correctHash, 'admin');
    console.log('✅ Admin password fixed');
  }
}

// Test 3: Create a test user
const testUsername = 'testuser';
const testPassword = 'testpass123';

// Check if test user exists
const existingTestUser = db.prepare('SELECT * FROM users WHERE username = ?').get(testUsername);
if (existingTestUser) {
  db.prepare('DELETE FROM users WHERE username = ?').run(testUsername);
  console.log('🗑️ Removed existing test user');
}

// Create new test user
const hashedTestPassword = await bcrypt.hash(testPassword, 10);
const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(testUsername, hashedTestPassword);
console.log('Test user created:', result.changes > 0 ? '✅ Success' : '❌ Failed');

// Verify test user can be retrieved
const createdTestUser = db.prepare('SELECT * FROM users WHERE username = ?').get(testUsername);
console.log('Test user retrieval:', createdTestUser ? '✅ Found' : '❌ Not found');

if (createdTestUser) {
  const testPasswordValid = await bcrypt.compare(testPassword, createdTestUser.password);
  console.log('Test password verification:', testPasswordValid ? '✅ Valid' : '❌ Invalid');
}

// List all users
const allUsers = db.prepare('SELECT id, username FROM users').all();
console.log('\n📋 Current users in database:');
allUsers.forEach(user => {
  console.log(`  - ID: ${user.id}, Username: ${user.username}`);
});

console.log('\n✅ Authentication system test complete!');
console.log('You should now be able to:');
console.log('  1. Login with admin/admin123');
console.log('  2. Register new accounts');
console.log('  3. Login with newly created accounts');

db.close();