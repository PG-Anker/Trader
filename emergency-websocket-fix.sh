#!/bin/bash
# Emergency fix for WebSocket spam - disables WebSocket completely until authentication works

echo "🚨 Emergency WebSocket spam fix - disabling WebSocket temporarily"

cd ~/Trader

# Kill server
pkill -f "node.*index.js" || true
sleep 2

# Temporarily disable WebSocket connection in frontend
cat > client/src/hooks/useWebSocket.ts << 'EOF'
import { useEffect, useRef, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  data: any;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  // Temporarily disable WebSocket to stop spam
  const sendMessage = useCallback((message: any) => {
    console.log('WebSocket disabled - message not sent:', message);
  }, []);

  const disconnect = useCallback(() => {
    console.log('WebSocket disabled - disconnect called');
  }, []);

  // Don't connect WebSocket for now
  useEffect(() => {
    console.log('WebSocket connection disabled until authentication is fixed');
  }, []);

  return {
    sendMessage,
    disconnect,
    isConnected: false
  };
};
EOF

# Rebuild frontend with disabled WebSocket
echo "Building frontend with WebSocket disabled..."
npm run build

# Copy everything to dist
cp -r dist/public/* dist/ 2>/dev/null || true
cp database.sqlite dist/ 2>/dev/null || true

cd dist

# Start server
echo "Starting server without WebSocket spam..."
NODE_ENV=production PORT=5000 node index.js
EOF