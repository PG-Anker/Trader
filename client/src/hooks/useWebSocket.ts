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
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectInterval = 5000,
    maxReconnectAttempts = 3
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      // Only connect if we have authentication
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        console.log('No session ID - skipping WebSocket connection');
        return;
      }

      // Use the current window location to construct WebSocket URL
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;
      
      console.log('Attempting WebSocket connection to:', wsUrl);
      
      // Add some delay before connection to allow server to be ready
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CONNECTING || wsRef.current?.readyState === WebSocket.OPEN) {
          return; // Already connecting or connected
        }
        
        wsRef.current = new WebSocket(wsUrl);
        
        wsRef.current.onopen = () => {
          console.log('WebSocket connected successfully to:', wsUrl);
          reconnectAttemptsRef.current = 0;
          onOpen?.();
        };

        wsRef.current.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            onMessage?.(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        wsRef.current.onclose = (event) => {
          console.log('WebSocket disconnected', event.code, event.reason);
          onClose?.();
          
          // Only reconnect for unexpected closures and if we haven't reached max attempts
          if (!event.wasClean && event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            console.log(`Attempting to reconnect... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, reconnectInterval);
          } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            console.log('Max reconnection attempts reached - falling back to polling');
          }
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket connection failed. URL:', wsUrl, 'ReadyState:', wsRef.current?.readyState);
          console.error('Error details:', error);
          onError?.(error);
        };
      }, 1000);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [onMessage, onOpen, onClose, onError, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent auto-reconnect
  }, [maxReconnectAttempts]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    sendMessage,
    disconnect,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  };
};
