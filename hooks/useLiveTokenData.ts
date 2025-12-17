'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTokenStore } from '@/stores/tokenStore';
import { getPairData } from '@/lib/api/dexscreener';

// Poll interval for DexScreener price updates (in ms)
// Increased to 15s since this is just for price display, not critical data
const PRICE_POLL_INTERVAL = 15000;

interface UseLiveTokenDataOptions {
  onPriceUpdate?: (price: number, change: number) => void;
}

/**
 * Hook for polling DexScreener for price updates only.
 * Chart data and receipts are now handled by useSolanaTrackerData.
 */
export function useLiveTokenData(options: UseLiveTokenDataOptions = {}) {
  const { onPriceUpdate } = options;

  // Store selectors
  const selectedPair = useTokenStore((state) => state.selectedPair);
  const selectedToken = useTokenStore((state) => state.selectedToken);
  const setConnected = useTokenStore((state) => state.setConnected);

  // Refs for cleanup
  const priceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPriceRef = useRef<number>(0);

  // Poll DexScreener for price updates only (no synthetic trades)
  const pollPrice = useCallback(async () => {
    if (!selectedPair?.pairAddress) return;

    try {
      const pairData = await getPairData(selectedPair.pairAddress);
      if (pairData) {
        const newPrice = parseFloat(pairData.priceUsd);
        const priceChange = pairData.priceChange?.h1 || 0;

        if (newPrice !== lastPriceRef.current) {
          lastPriceRef.current = newPrice;
          onPriceUpdate?.(newPrice, priceChange);
        }

        // Update the selected pair in store with fresh data
        useTokenStore.getState().selectPair(pairData);
      }
    } catch (error) {
      console.error('Price poll error:', error);
    }
  }, [selectedPair?.pairAddress, onPriceUpdate]);

  // Start polling when token is selected
  useEffect(() => {
    // Clean up any existing intervals
    if (priceIntervalRef.current) {
      clearInterval(priceIntervalRef.current);
      priceIntervalRef.current = null;
    }

    // Reset refs when token changes
    lastPriceRef.current = 0;

    // Don't poll if no token selected
    if (!selectedToken?.address) {
      setConnected(false);
      return;
    }

    // Mark as "connected" (polling DexScreener)
    setConnected(true);

    // Start price polling
    pollPrice(); // Initial poll
    priceIntervalRef.current = setInterval(pollPrice, PRICE_POLL_INTERVAL);

    // Cleanup on unmount or token change
    return () => {
      if (priceIntervalRef.current) {
        clearInterval(priceIntervalRef.current);
        priceIntervalRef.current = null;
      }
      setConnected(false);
    };
  }, [selectedToken?.address, pollPrice, setConnected]);

  // Disconnect function for manual control
  const disconnect = useCallback(() => {
    if (priceIntervalRef.current) {
      clearInterval(priceIntervalRef.current);
      priceIntervalRef.current = null;
    }
    setConnected(false);
  }, [setConnected]);

  return {
    isConnected: !!selectedToken?.address,
    disconnect,
  };
}
