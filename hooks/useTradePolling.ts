'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTokenStore } from '@/stores/tokenStore';
import { useTradeStore } from '@/stores/tradeStore';
import type { Trade } from '@/lib/types';
import { generateId } from '@/lib/utils';

interface ApiTrade {
  signature: string;
  timestamp: number;
  wallet: string;
  side: 'buy' | 'sell';
  tokenAmount: number;
  solAmount: number;
  price: number;
  source: string;
}

interface UseTradePollingOptions {
  enabled?: boolean;
  pollInterval?: number; // ms
}

/**
 * Polls the Helius public API for recent trades and adds them to the trade store
 */
export function useTradePolling(options: UseTradePollingOptions = {}) {
  const { enabled = true, pollInterval = 5000 } = options;

  const selectedToken = useTokenStore((state) => state.selectedToken);
  const addTrade = useTradeStore((state) => state.addTrade);

  // Track seen signatures to avoid duplicates
  const seenSignaturesRef = useRef<Set<string>>(new Set());
  const isPollingRef = useRef(false);

  // Fetch trades from API
  const fetchTrades = useCallback(async () => {
    if (!selectedToken?.address || isPollingRef.current) return;

    isPollingRef.current = true;

    try {
      const response = await fetch(`/api/trades/${selectedToken.address}?limit=30`);

      if (!response.ok) {
        console.error('[TradePolling] API error:', response.status);
        return;
      }

      const data = await response.json();
      const apiTrades: ApiTrade[] = data.trades || [];

      console.log(`[TradePolling] API returned ${apiTrades.length} trades, count: ${data.count}`);

      // Process trades in reverse order (oldest first) to maintain chronological order
      const sortedTrades = [...apiTrades].sort((a, b) => a.timestamp - b.timestamp);

      let newTradeCount = 0;

      for (const apiTrade of sortedTrades) {
        // Skip if we've already seen this trade
        if (seenSignaturesRef.current.has(apiTrade.signature)) {
          continue;
        }

        // Mark as seen
        seenSignaturesRef.current.add(apiTrade.signature);

        // Convert to our Trade format
        const trade: Trade = {
          id: generateId(),
          timestamp: apiTrade.timestamp,
          wallet: apiTrade.wallet,
          side: apiTrade.side,
          tokenAmount: apiTrade.tokenAmount,
          solAmount: apiTrade.solAmount,
          price: apiTrade.price,
          signature: apiTrade.signature,
        };

        // Add to store
        addTrade(trade);
        newTradeCount++;
      }

      if (newTradeCount > 0) {
        console.log(`[TradePolling] Added ${newTradeCount} new trades`);
      }

      // Limit seen signatures set size to prevent memory leak
      if (seenSignaturesRef.current.size > 1000) {
        const entries = Array.from(seenSignaturesRef.current);
        seenSignaturesRef.current = new Set(entries.slice(-500));
      }
    } catch (error) {
      console.error('[TradePolling] Fetch error:', error);
    } finally {
      isPollingRef.current = false;
    }
  }, [selectedToken?.address, addTrade]);

  // Reset when token changes
  useEffect(() => {
    seenSignaturesRef.current.clear();
  }, [selectedToken?.address]);

  // Start polling
  useEffect(() => {
    if (!enabled || !selectedToken?.address) {
      return;
    }

    // Initial fetch
    fetchTrades();

    // Set up polling interval
    const interval = setInterval(fetchTrades, pollInterval);

    return () => {
      clearInterval(interval);
    };
  }, [enabled, selectedToken?.address, pollInterval, fetchTrades]);

  return {
    refetch: fetchTrades,
  };
}
