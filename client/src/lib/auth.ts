// Simple authentication store for frontend
let sessionId: string | null = null;

export function getSessionId(): string | null {
  return sessionId;
}

export function setSessionId(id: string | null): void {
  sessionId = id;
  
  // Store in localStorage for persistence
  if (id) {
    localStorage.setItem('sessionId', id);
  } else {
    localStorage.removeItem('sessionId');
  }
}

export function initAuth(): void {
  // Load session from localStorage on app start
  const stored = localStorage.getItem('sessionId');
  if (stored) {
    sessionId = stored;
  }
}

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  
  if (sessionId) {
    headers['X-Session-ID'] = sessionId;
  }
  
  return headers;
}

export async function login(username: string, password: string): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      const data = await response.json();
      setSessionId(data.sessionId);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
}

export async function logout(): Promise<void> {
  try {
    if (sessionId) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    setSessionId(null);
  }
}

export function isAuthenticated(): boolean {
  return sessionId !== null;
}