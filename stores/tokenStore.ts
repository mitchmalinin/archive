import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DexPair } from '@/lib/api/dexscreener';
import type { JupiterTokenInfo } from '@/lib/api/jupiter';
import {
  searchTokens as dexSearch,
  getTokenPairs,
  getBestPair,
} from '@/lib/api/dexscreener';
import { isValidSolanaAddress } from '@/lib/api/jupiter';
import { useCandleStore } from './candleStore';
import { useReceiptStore } from './receiptStore';
import { useTradeStore } from './tradeStore';
import { useUIStore, getSolanaTrackerTimeframe } from './uiStore';
import type { ChartCandle } from '@/lib/types';

// Fetch OHLCV from our API route (proxies to Solana Tracker)
async function fetchOHLCV(tokenAddress: string, timeframe: string): Promise<ChartCandle[]> {
  try {
    const response = await fetch(`/api/chart/${tokenAddress}?type=${timeframe}`);

    if (!response.ok) {
      console.error('[TokenStore] OHLCV fetch failed:', response.status);
      return [];
    }

    const data = await response.json();

    if (!data.candles || data.candles.length === 0) {
      console.warn('[TokenStore] No candles returned from API');
      return [];
    }

    // Convert to ChartCandle format
    return data.candles.map((c: { time: number; open: number; high: number; low: number; close: number }) => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
  } catch (error) {
    console.error('[TokenStore] OHLCV fetch error:', error);
    return [];
  }
}

// Storage key for localStorage
const HELIUS_API_KEY_STORAGE = 'helius-api-key';

interface TokenState {
  // Selected token info
  selectedToken: JupiterTokenInfo | null;
  selectedPair: DexPair | null;

  // Search state
  searchQuery: string;
  searchResults: DexPair[];
  isSearching: boolean;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Helius API key
  heliusApiKey: string;

  // Connection state
  isConnected: boolean;

  // Actions
  setSearchQuery: (query: string) => void;
  searchTokens: (query: string) => Promise<void>;
  loadToken: (tokenAddress: string) => Promise<boolean>;
  loadFromPair: (pair: DexPair) => Promise<boolean>;
  selectPair: (pair: DexPair) => void;
  setHeliusApiKey: (key: string) => void;
  setConnected: (connected: boolean) => void;
  clearToken: () => void;
  clearSearch: () => void;
  refreshOHLCV: () => Promise<void>;
}

export const useTokenStore = create<TokenState>()(
  persist(
    (set, get) => ({
      // Initial state
      selectedToken: null,
      selectedPair: null,
      searchQuery: '',
      searchResults: [],
      isSearching: false,
      isLoading: false,
      error: null,
      heliusApiKey: '', // User can set via UI, stored in localStorage
      isConnected: false,

      setSearchQuery: (query) => set({ searchQuery: query }),

      searchTokens: async (query) => {
        if (!query || query.trim().length < 2) {
          set({ searchResults: [], isSearching: false });
          return;
        }

        set({ isSearching: true, error: null });

        try {
          const results = await dexSearch(query);
          set({ searchResults: results.slice(0, 10), isSearching: false });
        } catch (error) {
          console.error('Search error:', error);
          set({
            searchResults: [],
            isSearching: false,
            error: 'Search failed',
          });
        }
      },

      loadToken: async (tokenAddress) => {
        if (!tokenAddress) {
          set({ error: 'No token address provided' });
          return false;
        }

        // Validate address format
        if (!isValidSolanaAddress(tokenAddress)) {
          set({ error: 'Invalid Solana address format' });
          return false;
        }

        // Hide test receipt if showing (triggers fall animation)
        const { showTestReceipt, hideTestReceipt } = useUIStore.getState();
        if (showTestReceipt) {
          hideTestReceipt();
        }

        set({ isLoading: true, error: null });

        // Reset stores for fresh start
        useCandleStore.getState().reset();
        useReceiptStore.getState().reset();
        useTradeStore.getState().clearTrades();
        useUIStore.getState().resetPaper();

        try {
          // Fetch pairs from DexScreener
          const pairs = await getTokenPairs(tokenAddress);

          if (!pairs.length) {
            set({ isLoading: false, error: 'No trading pairs found for this token' });
            return false;
          }

          // Get best pair (highest liquidity)
          const bestPair = getBestPair(pairs);

          if (!bestPair) {
            set({ isLoading: false, error: 'No valid pair found' });
            return false;
          }

          // Create token info from DexScreener data (skip Jupiter to avoid 401 noise)
          const tokenInfo: JupiterTokenInfo = {
            address: tokenAddress,
            name: bestPair.baseToken.name,
            symbol: bestPair.baseToken.symbol,
            decimals: 9, // Default for most Solana tokens
            logoURI: null,
          };

          set({
            selectedToken: tokenInfo,
            selectedPair: bestPair,
            isLoading: false,
            error: null,
            searchQuery: '',
            searchResults: [],
          });

          // Fetch historical OHLCV data from Solana Tracker
          try {
            const { chartTimeframe } = useUIStore.getState();
            const timeframeParam = getSolanaTrackerTimeframe(chartTimeframe);
            // Use token address - Solana Tracker expects token mint, not pool address
            const chartCandles = await fetchOHLCV(tokenAddress, timeframeParam);

            if (chartCandles.length > 0) {
              useCandleStore.getState().loadHistoricalCandles(chartCandles);
              console.log(`[TokenStore] Loaded ${chartCandles.length} historical ${chartTimeframe} candles from Solana Tracker`);
            }
          } catch (ohlcvError) {
            console.warn('Failed to load historical OHLCV:', ohlcvError);
          }

          // Mark as connected - trade polling will handle getting trades
          set({ isConnected: true });

          return true;
        } catch (error) {
          console.error('Load token error:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load token',
          });
          return false;
        }
      },

      // Load token directly from a search result pair (no re-fetch needed)
      loadFromPair: async (pair) => {
        // Hide test receipt if showing (triggers fall animation)
        const { showTestReceipt, hideTestReceipt } = useUIStore.getState();
        if (showTestReceipt) {
          hideTestReceipt();
        }

        set({ isLoading: true, error: null });

        // Reset stores for fresh start
        useCandleStore.getState().reset();
        useReceiptStore.getState().reset();
        useTradeStore.getState().clearTrades();
        useUIStore.getState().resetPaper();

        try {
          const tokenAddress = pair.baseToken.address;

          // Create token info from DexScreener pair data (skip Jupiter to avoid 401 noise)
          const tokenInfo: JupiterTokenInfo = {
            address: tokenAddress,
            name: pair.baseToken.name,
            symbol: pair.baseToken.symbol,
            decimals: 9,
            logoURI: null,
          };

          set({
            selectedToken: tokenInfo,
            selectedPair: pair,
            isLoading: false,
            error: null,
            searchQuery: '',
            searchResults: [],
          });

          // Fetch historical OHLCV data from Solana Tracker
          try {
            const { chartTimeframe } = useUIStore.getState();
            const timeframeParam = getSolanaTrackerTimeframe(chartTimeframe);
            // Use token address - Solana Tracker expects token mint, not pool address
            const chartCandles = await fetchOHLCV(tokenAddress, timeframeParam);

            if (chartCandles.length > 0) {
              useCandleStore.getState().loadHistoricalCandles(chartCandles);
              console.log(`[TokenStore] Loaded ${chartCandles.length} historical ${chartTimeframe} candles from Solana Tracker`);
            }
          } catch (ohlcvError) {
            console.warn('Failed to load historical OHLCV:', ohlcvError);
          }

          // Mark as connected - trade polling will handle getting trades
          set({ isConnected: true });

          return true;
        } catch (error) {
          console.error('Load from pair error:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load token',
          });
          return false;
        }
      },

      selectPair: (pair) => {
        set({ selectedPair: pair });
      },

      setHeliusApiKey: (key) => {
        set({ heliusApiKey: key });
      },

      setConnected: (connected) => {
        set({ isConnected: connected });
      },

      clearToken: () => {
        set({
          selectedToken: null,
          selectedPair: null,
          isConnected: false,
          error: null,
        });
      },

      clearSearch: () => {
        set({
          searchQuery: '',
          searchResults: [],
          isSearching: false,
        });
      },

      refreshOHLCV: async () => {
        const { selectedToken } = get();
        if (!selectedToken) return;

        try {
          const { chartTimeframe } = useUIStore.getState();
          const timeframeParam = getSolanaTrackerTimeframe(chartTimeframe);
          const chartCandles = await fetchOHLCV(selectedToken.address, timeframeParam);

          if (chartCandles.length > 0) {
            useCandleStore.getState().loadHistoricalCandles(chartCandles);
            console.log(`[TokenStore] Refreshed ${chartCandles.length} historical ${chartTimeframe} candles from Solana Tracker`);
          }
        } catch (error) {
          console.warn('Failed to refresh OHLCV:', error);
        }
      },
    }),
    {
      name: 'token-store',
      partialize: (state) => ({
        heliusApiKey: state.heliusApiKey,
        // Don't persist selected token - start fresh each session
      }),
    }
  )
);
