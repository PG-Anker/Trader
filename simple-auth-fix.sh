#!/bin/bash
# Simple authentication fix - bypass auth temporarily for testing

echo "🔧 Temporarily bypassing authentication for testing..."

cd ~/Trader

# Create a version that bypasses auth temporarily
cat > server/temp-auth.ts << 'EOF'
import express from 'express';

// Temporary bypass - always return a fake user
export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Fake user for testing
  (req as any).user = { id: 1, username: 'testuser' };
  next();
}

export function setupAuthRoutes(app: express.Application) {
  // Minimal auth routes for testing
  app.post('/api/auth/login', (req, res) => {
    res.json({ 
      success: true, 
      user: { id: 1, username: 'testuser' },
      sessionId: 'test-session-123'
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true });
  });

  app.get('/api/auth/me', (req, res) => {
    res.json({ user: { id: 1, username: 'testuser' } });
  });
}
EOF

# Backup original auth
cp server/auth.ts server/auth.ts.backup

# Use temporary auth
cp server/temp-auth.ts server/auth.ts

echo "Authentication temporarily bypassed - rebuild and test"
echo "To restore: cp server/auth.ts.backup server/auth.ts"
EOF