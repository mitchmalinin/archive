'use client';

import { CANDLE_DURATION_MS, PROTOCOL_FEE_PERCENT } from '@/lib/constants';
import type { Candle, Trade } from '@/lib/types';
import { generateId, getMinuteStart } from '@/lib/utils';
import { useCandleStore } from '@/stores/candleStore';
import { useReceiptStore } from '@/stores/receiptStore';
import { useTradeStore } from '@/stores/tradeStore';
import { useUIStore } from '@/stores/uiStore';
import { useCallback, useEffect, useRef } from 'react';

interface UseCandleBuilderOptions {
  onCandleComplete?: (candle: Candle) => void;
}

/**
 * Create an empty candle for the given start time
 */
function createEmptyCandle(startTime: number, candleNumber: number): Candle {
  return {
    id: generateId(),
    candleNumber,
    startTime,
    endTime: startTime + CANDLE_DURATION_MS,
    open: 0,
    high: 0,
    low: Infinity,
    close: 0,
    volume: 0,
    buyVolume: 0,
    sellVolume: 0,
    tradeCount: 0,
    buyCount: 0,
    sellCount: 0,
    trades: [],
    fees: {
      total: 0,
      creator: 0,
      protocol: 0,
    },
  };
}

/**
 * Update a candle with a new trade
 */
function updateCandleWithTrade(candle: Candle, trade: Trade): Candle {
  const isFirstTrade = candle.tradeCount === 0;
  const fee = trade.solAmount * (PROTOCOL_FEE_PERCENT / 100);

  return {
    ...candle,
    open: isFirstTrade ? trade.price : candle.open,
    high: Math.max(candle.high, trade.price),
    low: Math.min(candle.low, trade.price),
    close: trade.price,
    volume: candle.volume + trade.solAmount,
    buyVolume:
      trade.side === 'buy'
        ? candle.buyVolume + trade.solAmount
        : candle.buyVolume,
    sellVolume:
      trade.side === 'sell'
        ? candle.sellVolume + trade.solAmount
        : candle.sellVolume,
    tradeCount: candle.tradeCount + 1,
    buyCount: trade.side === 'buy' ? candle.buyCount + 1 : candle.buyCount,
    sellCount: trade.side === 'sell' ? candle.sellCount + 1 : candle.sellCount,
    trades: [...candle.trades, trade],
    fees: {
      total: candle.fees.total + fee,
      creator: candle.fees.creator + fee * 0.3, // 30% to creator
      protocol: candle.fees.protocol + fee * 0.7, // 70% to protocol
    },
  };
}

export function useCandleBuilder(options: UseCandleBuilderOptions = {}) {
  const { onCandleComplete } = options;

  const latestTrade = useTradeStore((state) => state.latestTrade);
  const { currentCandle, setCurrentCandle, updateCurrentCandle, completeCandle } =
    useCandleStore();
  const { addReceipt, summaryCount } = useReceiptStore();
  const setIsPrinting = useUIStore((state) => state.setIsPrinting);
  const setPrintPhase = useUIStore((state) => state.setPrintPhase);

  const summaryCountRef = useRef(summaryCount);
  const candleStartTimeRef = useRef<number>(getMinuteStart(Date.now()));
  const processedTradeIdsRef = useRef<Set<string>>(new Set());

  // Keep summary count ref in sync
  useEffect(() => {
    summaryCountRef.current = summaryCount;
  }, [summaryCount]);

  // Handle completing a candle
  const handleCompleteCandle = useCallback(
    (candle: Candle) => {
      if (candle.tradeCount === 0) {
        // Don't save empty candles
        return;
      }

      // Fix low value if no trades set it properly
      const finalCandle = {
        ...candle,
        low: candle.low === Infinity ? candle.open : candle.low,
      };

      // Complete the candle in store
      completeCandle(finalCandle);

      // Trigger printing animation
      setIsPrinting(true);

      // Phase 1: Eject the receipt (animate out)
      setPrintPhase('ejecting');

      // Phase 2: Add to transaction log immediately for synced animation
      addReceipt({
        type: 'summary',
        id: finalCandle.id,
        receiptNumber: summaryCountRef.current + 1,
        candle: finalCandle,
        isExpanded: false,
      });

      // Phase 3: After eject animation, reset print state
      setTimeout(() => {
        // Reset to printing phase for new receipt
        setPrintPhase('printing');
        setIsPrinting(false);

        // Callback
        onCandleComplete?.(finalCandle);
      }, 600); // Match the eject animation duration
    },
    [completeCandle, addReceipt, setIsPrinting, setPrintPhase, onCandleComplete]
  );

  // Track if we're currently completing a candle (to prevent double-triggers)
  const isCompletingRef = useRef(false);

  // Force complete the current candle and start a new one
  const forceCompleteCandle = useCallback(() => {
    if (isCompletingRef.current) return;
    if (!currentCandle || currentCandle.tradeCount === 0) return;

    isCompletingRef.current = true;
    handleCompleteCandle(currentCandle);

    // Reset for new candle after animation
    setTimeout(() => {
      const now = Date.now();
      candleStartTimeRef.current = now;
      processedTradeIdsRef.current.clear();
      setCurrentCandle(createEmptyCandle(now, summaryCountRef.current + 1));
      isCompletingRef.current = false;
    }, 650);
  }, [currentCandle, handleCompleteCandle, setCurrentCandle]);

  // Process new trades
  useEffect(() => {
    if (!latestTrade) return;

    // Skip already processed trades
    if (processedTradeIdsRef.current.has(latestTrade.id)) {
      return;
    }
    processedTradeIdsRef.current.add(latestTrade.id);

    // Get or create current candle
    let candle = currentCandle;

    if (!candle) {
      candle = createEmptyCandle(candleStartTimeRef.current, summaryCountRef.current + 1);
      setCurrentCandle(candle);
    }

    // Update candle with new trade
    const updatedCandle = updateCandleWithTrade(candle, latestTrade);
    updateCurrentCandle(updatedCandle);
  }, [latestTrade, currentCandle, setCurrentCandle, updateCurrentCandle]);

  // Candle completion timer (every 30 seconds)
  useEffect(() => {
    const checkAndCompleteCandle = () => {
      // Don't check if we're already completing a candle
      if (isCompletingRef.current) return;

      const now = Date.now();
      const currentPeriodStart = getMinuteStart(now);

      // If we've moved to a new period, complete the old candle
      if (currentPeriodStart > candleStartTimeRef.current) {
        if (currentCandle && currentCandle.tradeCount > 0) {
          isCompletingRef.current = true;
          handleCompleteCandle(currentCandle);

          // Reset for new candle after animation
          setTimeout(() => {
            candleStartTimeRef.current = currentPeriodStart;
            processedTradeIdsRef.current.clear();
            setCurrentCandle(createEmptyCandle(currentPeriodStart, summaryCountRef.current + 1));
            isCompletingRef.current = false;
          }, 650);
        } else {
          // No trades, just reset the timer
          candleStartTimeRef.current = currentPeriodStart;
          processedTradeIdsRef.current.clear();
          setCurrentCandle(createEmptyCandle(currentPeriodStart, summaryCountRef.current + 1));
        }
      }
    };

    // Check every second
    const interval = setInterval(checkAndCompleteCandle, 1000);

    return () => clearInterval(interval);
  }, [currentCandle, handleCompleteCandle, setCurrentCandle]);

  return {
    currentCandle,
  };
}
