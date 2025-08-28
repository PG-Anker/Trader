#!/usr/bin/env node

/**
 * Reset Admin User Script
 * 
 * This script resets the admin user password to 'admin123' 
 * without affecting any other data in the database.
 */

const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");

async function resetAdmin() {
  try {
    console.log("🔧 Resetting admin user credentials...");
    
    const sqlite = new Database("./database.sqlite");
    
    // Generate new hash for admin123
    const hashedPassword = await bcrypt.hash('admin123', 10);
    console.log("Generated new password hash");
    
    // Update admin user password
    const updateStmt = sqlite.prepare(`
      UPDATE users 
      SET password = ?
      WHERE username = 'admin'
    `);
    
    const result = updateStmt.run(hashedPassword);
    
    if (result.changes > 0) {
      console.log("✅ Admin password reset successfully!");
      console.log("Username: admin");
      console.log("Password: admin123");
      console.log("");
      console.log("You can now log in with these credentials.");
    } else {
      console.log("❌ Admin user not found in database");
      console.log("You may need to run the full database initialization:");
      console.log("tsx server/initDb.ts");
    }
    
    sqlite.close();
    
  } catch (error) {
    console.error("❌ Error resetting admin user:", error.message);
    process.exit(1);
  }
}

resetAdmin();