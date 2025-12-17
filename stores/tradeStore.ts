import { create } from 'zustand';
import type { Trade } from '@/lib/types';

interface TradeState {
  trades: Trade[];
  latestTrade: Trade | null;

  // Actions
  addTrade: (trade: Trade) => void;
  clearTrades: () => void;
  // Get and remove trades in a time range (for candle completion)
  consumeTradesInRange: (startTime: number, endTime: number) => Trade[];
}

export const useTradeStore = create<TradeState>()((set, get) => ({
  trades: [],
  latestTrade: null,

  addTrade: (trade) =>
    set((state) => ({
      trades: [...state.trades, trade].slice(-500), // Keep last 500 trades max
      latestTrade: trade,
    })),

  clearTrades: () =>
    set({
      trades: [],
      latestTrade: null,
    }),

  // Get ALL accumulated trades and clear the store
  // This is called when a candle completes - we include all trades fetched since the last candle
  consumeTradesInRange: (startTime: number, endTime: number) => {
    const state = get();

    // Debug: log all trade timestamps
    if (state.trades.length > 0) {
      console.log(`[TradeStore] Current trades (${state.trades.length}):`, state.trades.map(t => ({
        time: new Date(t.timestamp).toISOString(),
        side: t.side,
        sol: t.solAmount.toFixed(4),
      })));
    }

    // Take ALL trades that are before or within the candle end time
    // This catches trades that were polled late but belong to earlier periods
    const tradesToConsume = state.trades.filter(
      (t) => t.timestamp < endTime
    );

    // Keep only trades that are AFTER this candle's end (truly future trades)
    const tradesToKeep = state.trades.filter(
      (t) => t.timestamp >= endTime
    );

    console.log(`[TradeStore] Consuming: ${tradesToConsume.length} trades (up to ${new Date(endTime).toISOString()}), keeping ${tradesToKeep.length} future trades`);

    set({ trades: tradesToKeep });
    return tradesToConsume;
  },
}));
