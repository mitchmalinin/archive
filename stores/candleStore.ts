import { create } from 'zustand';
import type { Candle, ChartCandle } from '@/lib/types';
import { storage } from '@/lib/storage';
import { generateId } from '@/lib/utils';

// Maximum candles to keep
const MAX_CANDLES = 500;

interface CandleState {
  completedCandles: Candle[];
  currentCandle: Candle | null;
  chartData: ChartCandle[];
  hoveredCandleId: string | null;
  isHydrated: boolean;
  isLoadingHistory: boolean;

  // Actions
  setCurrentCandle: (candle: Candle) => void;
  updateCurrentCandle: (candle: Candle) => void;
  completeCandle: (candle: Candle) => void;
  setHoveredCandle: (id: string | null) => void;
  loadHistoricalCandles: (candles: ChartCandle[]) => void;
  hydrate: () => void;
  reset: () => void;
  debugCreateCandle: () => Candle;
}

export const useCandleStore = create<CandleState>()((set, get) => ({
  completedCandles: [],
  currentCandle: null,
  chartData: [],
  hoveredCandleId: null,
  isHydrated: false,
  isLoadingHistory: false,

  hydrate: () => {
    if (get().isHydrated) return;

    const savedCandles = storage.loadCandles() as Candle[];

    if (savedCandles.length > 0) {
      // Rebuild chart data from saved candles
      const chartData: ChartCandle[] = savedCandles.map(candle => ({
        time: Math.floor(candle.startTime / 1000) as number,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }));

      set({
        completedCandles: savedCandles,
        chartData,
        isHydrated: true,
      });
    } else {
      set({ isHydrated: true });
    }
  },

  setCurrentCandle: (candle) =>
    set({
      currentCandle: candle,
    }),

  updateCurrentCandle: (candle) =>
    set({
      currentCandle: candle,
    }),

  completeCandle: (candle) =>
    set((state) => {
      const newCandles = [...state.completedCandles, candle];
      const prunedCandles = newCandles.slice(-MAX_CANDLES); // Keep most recent

      // Persist to localStorage
      storage.saveCandles(prunedCandles);

      return {
        completedCandles: prunedCandles,
        chartData: [
          ...state.chartData,
          {
            time: Math.floor(candle.startTime / 1000) as number,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          },
        ].slice(-MAX_CANDLES),
        currentCandle: null,
      };
    }),

  setHoveredCandle: (id) =>
    set({
      hoveredCandleId: id,
    }),

  // Load historical candles directly into chartData (for external OHLCV data)
  loadHistoricalCandles: (candles) => {
    // Sort and dedupe by timestamp
    const sorted = [...candles].sort((a, b) => a.time - b.time);
    const deduped = sorted.filter(
      (candle, index, arr) =>
        index === 0 || candle.time !== arr[index - 1].time
    );

    set({
      chartData: deduped.slice(-MAX_CANDLES),
      // Don't clear completedCandles - preserve receipt history
      currentCandle: null,
      isLoadingHistory: false,
    });
  },

  reset: () => {
    storage.clearAll();
    set({
      completedCandles: [],
      currentCandle: null,
      chartData: [],
      hoveredCandleId: null,
    });
  },

  // Debug: Create a fake candle for testing animations
  debugCreateCandle: () => {
    const state = get();
    // Get the last candle's end time, or use current time if no candles
    const lastCandle = state.completedCandles[state.completedCandles.length - 1];
    const startTime = lastCandle ? lastCandle.endTime : Date.now() - 30000;
    const endTime = startTime + 30000;

    const basePrice = 0.0003 + Math.random() * 0.0002;
    const priceChange = (Math.random() - 0.5) * 0.00005;
    const tradeCount = Math.floor(Math.random() * 20) + 5;
    const buyCount = Math.floor(Math.random() * tradeCount);
    const sellCount = tradeCount - buyCount;
    const volume = Math.random() * 10 + 1;
    const buyVolume = volume * (buyCount / tradeCount);
    const sellVolume = volume - buyVolume;

    const candle: Candle = {
      id: generateId(),
      candleNumber: state.completedCandles.length + 1,
      startTime,
      endTime,
      open: basePrice,
      high: basePrice + Math.abs(priceChange) + Math.random() * 0.00002,
      low: basePrice - Math.abs(priceChange) - Math.random() * 0.00002,
      close: basePrice + priceChange,
      volume,
      buyVolume,
      sellVolume,
      tradeCount,
      buyCount,
      sellCount,
      trades: [],
      fees: {
        total: volume * 0.01,
        creator: volume * 0.003,
        protocol: volume * 0.007,
      },
    };

    return candle;
  },
}));
