'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useTradeStore } from '@/stores/tradeStore';
import { useTokenStore } from '@/stores/tokenStore';
import type { Trade } from '@/lib/types';

interface UseTradeSSEOptions {
  enabled?: boolean;
  onTrade?: (trade: Trade) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

interface SSEMessage {
  type: 'connected' | 'trade' | 'recent' | 'ping';
  trade?: Trade;
  trades?: Trade[];
  timestamp?: number;
}

export function useTradeSSE(options: UseTradeSSEOptions = {}) {
  const { enabled = true, onTrade, onConnect, onDisconnect } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const selectedToken = useTokenStore((state) => state.selectedToken);
  const addTrade = useTradeStore((state) => state.addTrade);

  // Process incoming trade
  const processTrade = useCallback(
    (trade: Trade) => {
      // Add to trade store
      addTrade(trade);

      // Callback
      onTrade?.(trade);
    },
    [addTrade, onTrade]
  );

  // Connect to SSE stream
  const connect = useCallback(() => {
    // Don't connect if disabled or no token selected
    if (!enabled || !selectedToken) {
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const eventSource = new EventSource('/api/trades/stream');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('[SSE] Connected to trade stream');
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        onConnect?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'connected':
              console.log('[SSE] Server confirmed connection');
              break;

            case 'trade':
              if (message.trade) {
                processTrade(message.trade);
              }
              break;

            case 'recent':
              // Process recent trades on initial connect
              if (message.trades) {
                console.log(`[SSE] Received ${message.trades.length} recent trades`);
                message.trades.forEach(processTrade);
              }
              break;

            case 'ping':
              // Heartbeat - connection is alive
              break;
          }
        } catch (error) {
          console.error('[SSE] Error parsing message:', error);
        }
      };

      eventSource.onerror = (event) => {
        console.error('[SSE] Connection error:', event);
        setIsConnected(false);
        setError('Connection lost');
        onDisconnect?.();

        // Close the errored connection
        eventSource.close();
        eventSourceRef.current = null;

        // Attempt reconnect with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;

        console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);

        reconnectTimeoutRef.current = setTimeout(() => {
          if (enabled && selectedToken) {
            connect();
          }
        }, delay);
      };
    } catch (error) {
      console.error('[SSE] Failed to create EventSource:', error);
      setError('Failed to connect');
    }
  }, [enabled, selectedToken, processTrade, onConnect, onDisconnect]);

  // Disconnect from SSE stream
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    onDisconnect?.();
  }, [onDisconnect]);

  // Connect when enabled and token selected
  useEffect(() => {
    if (enabled && selectedToken) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, selectedToken, connect, disconnect]);

  return {
    isConnected,
    error,
    connect,
    disconnect,
  };
}
