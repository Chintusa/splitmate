import { useEffect, useRef, useState, useCallback } from 'react';
import { getAccessToken } from '../api/client';

export function useWebSocket(
  groupId: number | null,
  onEvent?: (event: any) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const savedCallback = useRef(onEvent);

  useEffect(() => {
    savedCallback.current = onEvent;
  }, [onEvent]);

  const connect = useCallback(() => {
    if (!groupId) return;

    const token = getAccessToken();
    if (!token) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.VITE_WS_URL || `${wsProtocol}//127.0.0.1:8000`;
    const wsUrl = `${wsHost}/ws/groups/${groupId}/?token=${token}`;

    if (socketRef.current) {
      socketRef.current.close();
    }

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      retryCountRef.current = 0;
    };

    ws.onmessage = (messageEvent) => {
      try {
        const data = JSON.parse(messageEvent.data);
        if (savedCallback.current) {
          savedCallback.current(data);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message', err);
      }
    };

    ws.onclose = (e) => {
      setIsConnected(false);
      // Reconnect with exponential backoff if not closed deliberately
      if (e.code !== 1000 && e.code !== 4001 && e.code !== 4003) {
        const timeout = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        retryCountRef.current += 1;
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, timeout);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    socketRef.current = ws;
  }, [groupId]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [connect]);

  return { isConnected };
}
