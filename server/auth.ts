import express from 'express';
import bcrypt from 'bcrypt';
import { storage } from './storage';

interface User {
  id: number;
  username: string;
}

// Simple session store - in production, use Redis or similar
const sessions = new Map<string, User>();

export function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function createSession(user: User): string {
  const sessionId = generateSessionId();
  sessions.set(sessionId, user);
  return sessionId;
}

export function getSession(sessionId: string): User | null {
  return sessions.get(sessionId) || null;
}

export function destroySession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const sessionId = req.headers['x-session-id'] as string || req.cookies?.sessionId;
  
  if (!sessionId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const user = getSession(sessionId);
  if (!user) {
    return res.status(401).json({ message: 'Invalid session' });
  }

  (req as any).user = user;
  next();
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function setupAuthRoutes(app: express.Application) {
  // Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const sessionId = createSession({ id: user.id, username: user.username });
      
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.json({ 
        success: true, 
        user: { id: user.id, username: user.username },
        sessionId 
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    const sessionId = req.headers['x-session-id'] as string || req.cookies?.sessionId;
    
    if (sessionId) {
      destroySession(sessionId);
    }
    
    res.clearCookie('sessionId');
    res.json({ success: true });
  });

  // Get current user
  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ user: (req as any).user });
  });

  // Change password
  app.post('/api/auth/change-password', requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = (req as any).user;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new password required' });
      }

      const userRecord = await storage.getUserById(user.id);
      if (!userRecord) {
        return res.status(404).json({ message: 'User not found' });
      }

      const isValid = await verifyPassword(currentPassword, userRecord.password);
      if (!isValid) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, hashedPassword);

      res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({ message: 'Failed to change password' });
    }
  });
}