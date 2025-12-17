'use client';

import { useRef, useCallback } from 'react';
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

/**
 * Hook for fetching trades on-demand (at candle completion)
 *
 * Key insight: Helius has a 20-60 second indexing delay, so trying to match
 * trades to exact 30-second candle windows doesn't work. Instead, we:
 * 1. Track seen signatures to avoid duplicates across candles
 * 2. On each fetch, return only NEW trades (not previously seen)
 * 3. This way late-indexed trades still get captured in subsequent candles
 */
export function useTradeSnapshot() {
  // Track signatures we've already included in receipts
  const seenSignaturesRef = useRef<Set<string>>(new Set());
  // Track when we started watching this token (to avoid ancient history)
  const initTimeRef = useRef<number>(0);

  /**
   * Initialize - set baseline time and clear seen signatures
   * Call this when a token is first loaded
   */
  const initializeSnapshot = useCallback(async (tokenAddress: string) => {
    if (!tokenAddress) return;

    // Clear previous signatures
    seenSignaturesRef.current.clear();

    // Set init time with 60-second buffer for indexing delay
    // This means we'll include trades from up to 60 seconds before token selection
    initTimeRef.current = Date.now() - 60000;

    console.log(`[TradeSnapshot] Initialized - will include trades after ${new Date(initTimeRef.current).toISOString()}`);
  }, []);

  /**
   * Fetch NEW trades since last fetch
   * Returns only trades we haven't seen before (signature-based deduplication)
   */
  const fetchTradesForCandle = useCallback(async (
    tokenAddress: string,
    poolAddress: string | null, // Pool address is more reliable for fetching swaps
    _candleStartTime: number, // Not used anymore - we track by signature instead
    _candleEndTime: number
  ): Promise<Trade[]> => {
    if (!tokenAddress) return [];

    try {
      // Fetch trades with cache-busting
      // Use pool address if available (more reliable for getting swaps)
      const cacheBuster = Date.now();
      const poolParam = poolAddress ? `&pool=${poolAddress}` : '';
      const response = await fetch(`/api/trades/${tokenAddress}?limit=100&_t=${cacheBuster}${poolParam}`);

      console.log(`[TradeSnapshot] Fetching trades for token: ${tokenAddress}, pool: ${poolAddress || 'none'}`);
      if (!response.ok) {
        console.error('[TradeSnapshot] Fetch failed:', response.status);
        return [];
      }

      const data = await response.json();
      const apiTrades: ApiTrade[] = data.trades || [];

      console.log(`[TradeSnapshot] API returned ${apiTrades.length} trades`);

      // Debug: show trade timestamps
      if (apiTrades.length > 0) {
        const oldest = apiTrades[apiTrades.length - 1];
        const newest = apiTrades[0];
        console.log(`[TradeSnapshot] Trade range: ${new Date(oldest.timestamp).toISOString()} to ${new Date(newest.timestamp).toISOString()}`);
      }

      // Filter to NEW trades only:
      // 1. Not in seen signatures (avoid duplicates across candles)
      // 2. After our init time (avoid ancient history from before we started watching)
      const newApiTrades = apiTrades.filter(t => {
        const isNew = !seenSignaturesRef.current.has(t.signature);
        const afterInit = t.timestamp >= initTimeRef.current;
        return isNew && afterInit;
      });

      // Mark these trades as seen for future candles
      newApiTrades.forEach(t => seenSignaturesRef.current.add(t.signature));

      // Limit seen set size to prevent memory issues
      if (seenSignaturesRef.current.size > 2000) {
        const entries = Array.from(seenSignaturesRef.current);
        seenSignaturesRef.current = new Set(entries.slice(-1000));
      }

      // Convert to our Trade format
      const trades: Trade[] = newApiTrades.map(apiTrade => ({
        id: generateId(),
        timestamp: apiTrade.timestamp,
        wallet: apiTrade.wallet,
        side: apiTrade.side,
        tokenAmount: apiTrade.tokenAmount,
        solAmount: apiTrade.solAmount,
        price: apiTrade.price,
        signature: apiTrade.signature,
      }));

      console.log(`[TradeSnapshot] Found ${trades.length} NEW trades (${seenSignaturesRef.current.size} total seen)`);

      return trades;
    } catch (error) {
      console.error('[TradeSnapshot] Fetch error:', error);
      return [];
    }
  }, []);

  /**
   * Reset the snapshot (call when token changes)
   */
  const resetSnapshot = useCallback(() => {
    seenSignaturesRef.current.clear();
    initTimeRef.current = 0;
    console.log('[TradeSnapshot] Reset');
  }, []);

  return {
    initializeSnapshot,
    fetchTradesForCandle,
    resetSnapshot,
  };
}
