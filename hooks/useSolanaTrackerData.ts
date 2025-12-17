'use client';

import { useEffect, useRef } from 'react';
import { useTokenStore } from '@/stores/tokenStore';
import { useCandleStore } from '@/stores/candleStore';
import { useUIStore, getSolanaTrackerTimeframe } from '@/stores/uiStore';
import type { Candle } from '@/lib/types';
import { generateId, getCandleDurationMs } from '@/lib/utils';

interface SolanaTrackerCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Fetch candles from our API route
async function fetchCandles(tokenAddress: string, timeframe: string): Promise<SolanaTrackerCandle[]> {
  try {
    const response = await fetch(`/api/chart/${tokenAddress}?type=${timeframe}`);

    if (!response.ok) {
      console.error('[SolanaTrackerData] Fetch failed:', response.status);
      return [];
    }

    const data = await response.json();
    return data.candles || [];
  } catch (error) {
    console.error('[SolanaTrackerData] Fetch error:', error);
    return [];
  }
}

// Convert Solana Tracker candle to our Candle format
function convertToCandle(stCandle: SolanaTrackerCandle, durationMs: number, candleNumber: number = 0): Candle {
  const startTime = stCandle.time * 1000;
  const volume = stCandle.volume || 0;

  return {
    id: generateId(),
    candleNumber,
    startTime,
    endTime: startTime + durationMs,
    open: stCandle.open,
    high: stCandle.high,
    low: stCandle.low,
    close: stCandle.close,
    volume,
    buyVolume: 0,
    sellVolume: 0,
    tradeCount: 0,
    buyCount: 0,
    sellCount: 0,
    trades: [],
    fees: {
      total: volume * 0.01,
      creator: volume * 0.003,
      protocol: volume * 0.007,
    },
  };
}

/**
 * This hook now only handles initial currentCandle setup.
 * Receipt printing is handled by LiveChart -> TerminalScreen.
 */
export function useSolanaTrackerData() {
  const selectedToken = useTokenStore((state) => state.selectedToken);
  const chartTimeframe = useUIStore((state) => state.chartTimeframe);
  const { setCurrentCandle } = useCandleStore();

  const chartAddress = selectedToken?.address;
  const initialFetchDoneRef = useRef(false);

  // Initial fetch to set up currentCandle for display
  useEffect(() => {
    if (!chartAddress) {
      initialFetchDoneRef.current = false;
      return;
    }

    // Only fetch once on token load to initialize currentCandle
    if (initialFetchDoneRef.current) return;

    const initCurrentCandle = async () => {
      const timeframe = getSolanaTrackerTimeframe(chartTimeframe);
      const durationMs = getCandleDurationMs(chartTimeframe);
      const candles = await fetchCandles(chartAddress, timeframe);

      if (candles.length > 0) {
        const sortedCandles = [...candles].sort((a, b) => a.time - b.time);
        const latestCandle = sortedCandles[sortedCandles.length - 1];
        const currentCandleData = convertToCandle(latestCandle, durationMs, 1);
        setCurrentCandle(currentCandleData);
        initialFetchDoneRef.current = true;
      }
    };

    initCurrentCandle();
  }, [chartAddress, chartTimeframe, setCurrentCandle]);

  // Reset when timeframe changes
  useEffect(() => {
    initialFetchDoneRef.current = false;
  }, [chartTimeframe]);

  return {
    isActive: !!selectedToken?.address,
  };
}
