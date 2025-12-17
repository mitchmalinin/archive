// Simple event emitter for bridging webhook trades to SSE clients
// This is an in-memory solution - works for single server instance

import type { Trade } from './types';

type TradeListener = (trade: Trade) => void;

class TradeEventEmitter {
  private listeners: Set<TradeListener> = new Set();
  private recentTrades: Trade[] = [];
  private maxRecentTrades = 100;

  // Subscribe to new trades
  subscribe(listener: TradeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Emit a new trade to all listeners
  emit(trade: Trade): void {
    // Store in recent trades
    this.recentTrades.unshift(trade);
    if (this.recentTrades.length > this.maxRecentTrades) {
      this.recentTrades.pop();
    }

    // Notify all listeners
    this.listeners.forEach((listener) => {
      try {
        listener(trade);
      } catch (error) {
        console.error('Trade listener error:', error);
      }
    });
  }

  // Get recent trades (for initial load)
  getRecentTrades(): Trade[] {
    return [...this.recentTrades];
  }

  // Get listener count (for debugging)
  getListenerCount(): number {
    return this.listeners.size;
  }
}

// Singleton instance
export const tradeEmitter = new TradeEventEmitter();
