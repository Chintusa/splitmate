import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getAccessToken } from '../api/client';

interface RealtimeContextType {
  isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextType>({ isConnected: false });

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);

  const connect = useCallback(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.close(1000, 'User logged out');
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.VITE_WS_URL || `${wsProtocol}//127.0.0.1:8000`;
    const wsUrl = `${wsHost}/ws/notifications/?token=${token}`;

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
        // Broadcast custom event so all pages and components can update live
        window.dispatchEvent(new CustomEvent('splitmate:realtime', { detail: data }));
      } catch (err) {
        console.error('Error parsing notification socket message', err);
      }
    };

    ws.onclose = (e) => {
      setIsConnected(false);
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
  }, [user]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close(1000, 'App unmounted');
      }
    };
  }, [connect]);

  return (
    <RealtimeContext.Provider value={{ isConnected }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => useContext(RealtimeContext);

/**
 * Universal hook for any page or component to receive real-time ledger & balance updates.
 */
export function useRealtimeUpdate(callback: (event: any) => void) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (savedCallback.current) {
        savedCallback.current(customEvent.detail);
      }
    };

    window.addEventListener('splitmate:realtime', handler);
    return () => {
      window.removeEventListener('splitmate:realtime', handler);
    };
  }, []);
}
