import type { TradeFilter } from '@/lib/types';
import { create } from 'zustand';

type PrintPhase = 'printing' | 'ejecting';

// Chart timeframe options - minimum 30s via Solana Tracker
export type ChartTimeframe = '30s' | '1m' | '5m' | '15m' | '1h' | '4h';

export const CHART_TIMEFRAMES: { value: ChartTimeframe; label: string }[] = [
  { value: '30s', label: '30S' },
  { value: '1m', label: '1M' },
  { value: '5m', label: '5M' },
  { value: '15m', label: '15M' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
];

// Get Solana Tracker API timeframe string
export function getSolanaTrackerTimeframe(timeframe: ChartTimeframe): string {
  return timeframe; // Solana Tracker uses the same format (5s, 15s, 30s, 1m, etc.)
}

// Legacy: Map timeframe to GeckoTerminal API params (fallback)
export function getTimeframeParams(timeframe: ChartTimeframe): {
  timeframe: 'minute' | 'hour' | 'day';
  aggregate: number;
} {
  switch (timeframe) {
    case '30s':
    case '1m': return { timeframe: 'minute', aggregate: 1 };
    case '5m': return { timeframe: 'minute', aggregate: 5 };
    case '15m': return { timeframe: 'minute', aggregate: 15 };
    case '1h': return { timeframe: 'hour', aggregate: 1 };
    case '4h': return { timeframe: 'hour', aggregate: 4 };
  }
}

// Animation speed options (in seconds)
export const ANIMATION_SPEEDS = [
  { label: '0.1x', duration: 20 },
  { label: '0.25x', duration: 8 },
  { label: '0.5x', duration: 4 },
  { label: '1x', duration: 2 },
  { label: '2x', duration: 1 },
  { label: '4x', duration: 0.5 },
] as const;

// Max receipts before "out of paper" (prevents forgotten sessions)
export const MAX_SESSION_RECEIPTS = 20;

interface UIState {
  filter: TradeFilter;
  isMuted: boolean;
  isPrinting: boolean;
  printPhase: PrintPhase;
  animationSpeedIndex: number;
  secondsRemaining: number;
  posReceiptLimit: number;
  chartTimeframe: ChartTimeframe;
  sessionReceiptCount: number;
  isOutOfPaper: boolean;

  // Actions
  setFilter: (filter: TradeFilter) => void;
  toggleMute: () => void;
  setIsPrinting: (value: boolean) => void;
  setPrintPhase: (phase: PrintPhase) => void;
  cycleAnimationSpeed: () => void;
  setSecondsRemaining: (value: number) => void;
  setPosReceiptLimit: (limit: number) => void;
  setChartTimeframe: (timeframe: ChartTimeframe) => void;
  incrementSessionReceipts: () => void;
  resetPaper: () => void;
  reset: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  filter: 'all',
  isMuted: false,
  isPrinting: false,
  printPhase: 'printing',
  animationSpeedIndex: 3, // Default to 1x (2 seconds)
  secondsRemaining: 15,
  posReceiptLimit: 3, // Fixed - always show 3 receipts on POS terminal
  chartTimeframe: '30s', // Default to 30 second candles
  sessionReceiptCount: 0,
  isOutOfPaper: false,

  setFilter: (filter) =>
    set({
      filter,
    }),

  toggleMute: () =>
    set((state) => ({
      isMuted: !state.isMuted,
    })),

  setIsPrinting: (value) =>
    set({
      isPrinting: value,
    }),

  setPrintPhase: (phase) =>
    set({
      printPhase: phase,
    }),

  cycleAnimationSpeed: () =>
    set((state) => ({
      animationSpeedIndex: (state.animationSpeedIndex + 1) % ANIMATION_SPEEDS.length,
    })),

  setSecondsRemaining: (value) =>
    set({
      secondsRemaining: value,
    }),

  setPosReceiptLimit: (limit) =>
    set({
      posReceiptLimit: limit,
    }),

  setChartTimeframe: (timeframe) =>
    set({
      chartTimeframe: timeframe,
    }),

  incrementSessionReceipts: () =>
    set((state) => {
      const newCount = state.sessionReceiptCount + 1;
      return {
        sessionReceiptCount: newCount,
        isOutOfPaper: newCount >= MAX_SESSION_RECEIPTS,
      };
    }),

  resetPaper: () =>
    set({
      sessionReceiptCount: 0,
      isOutOfPaper: false,
    }),

  reset: () =>
    set({
      filter: 'all',
      isMuted: false,
      isPrinting: false,
      printPhase: 'printing',
      animationSpeedIndex: 3,
      secondsRemaining: 15,
      posReceiptLimit: 3, // Fixed value
      chartTimeframe: '30s',
      sessionReceiptCount: 0,
      isOutOfPaper: false,
    }),
}));
