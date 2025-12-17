'use client'

import { getTrendingTokens, searchTokens as dexSearch, type DexPair } from '@/lib/api/dexscreener';
import { formatPrice } from '@/lib/utils';
import { useReceiptStore } from '@/stores/receiptStore';
import { useTokenStore } from '@/stores/tokenStore';
import { useUIStore } from '@/stores/uiStore';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';

export function DesktopFloatingBar() {
  const { summaryCount } = useReceiptStore();

  // Token store
  const {
    selectedToken,
    selectedPair,
    searchResults,
    isSearching,
    isLoading,
    isConnected,
    error,
    setSearchQuery,
    searchTokens,
    loadToken,
    loadFromPair,
    clearSearch,
  } = useTokenStore();

  // Local state
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [trendingTokens, setTrendingTokens] = useState<DexPair[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch trending tokens on mount
  useEffect(() => {
    const fetchTrending = async () => {
      setIsLoadingTrending(true);
      try {
        const trending = await getTrendingTokens();
        setTrendingTokens(trending);
      } catch (error) {
        console.error('Failed to fetch trending:', error);
      } finally {
        setIsLoadingTrending(false);
      }
    };
    fetchTrending();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
      setSearchQuery(value);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Debounce search
      if (value.length >= 2) {
        searchTimeoutRef.current = setTimeout(() => {
          searchTokens(value);
          setShowDropdown(true);
        }, 300);
      } else {
        clearSearch();
        setShowDropdown(false);
      }
    },
    [setSearchQuery, searchTokens, clearSearch]
  );

  // Handle load button click
  const handleLoad = useCallback(async () => {
    const input = inputValue.trim();
    if (!input) return;

    setShowDropdown(false);

    // Always try to load as address first (this is the primary use case)
    const success = await loadToken(input);
    if (success) {
      setInputValue('');
    }
  }, [inputValue, loadToken]);

  // Handle search result selection - use pair directly (no re-fetch)
  const handleSelectResult = useCallback(
    async (pair: DexPair) => {
      setShowDropdown(false);
      setInputValue(pair.baseToken.address);
      await loadFromPair(pair);
    },
    [loadFromPair]
  );

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute top-[20%] left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 w-[380px] pointer-events-auto"
    >
      {/* Main Tracking Display */}
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-5 shadow-2xl relative overflow-hidden">


        {/* Top Row: Tracking status */}
        <div className="flex justify-between items-center mb-3 relative z-10">
          <div className="flex items-center gap-2">
            {/* Connection indicator */}
            <span
              className={`w-2 h-2 rounded-full ${
                selectedToken
                  ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]'
                  : 'bg-gray-600'
              }`}
            />
            <span className="font-mono text-[10px] text-gray-500 tracking-wider">
              {selectedToken ? 'TRACKING' : 'NO TOKEN'}
            </span>
          </div>
        </div>

        {/* Large Ticker Display */}
        <div className="text-center py-4 relative z-10">
          {selectedToken ? (
            <>
              <div className="font-mono text-4xl font-bold text-green-400 tracking-tight">
                ${selectedToken.symbol.toUpperCase()}
              </div>
              {selectedPair?.volume?.h24 && (
                <div className="font-mono text-[10px] text-gray-500 mt-1">
                  24h VOL: {selectedPair.volume.h24 >= 1000000
                    ? `$${(selectedPair.volume.h24 / 1000000).toFixed(2)}M`
                    : selectedPair.volume.h24 >= 1000
                      ? `$${(selectedPair.volume.h24 / 1000).toFixed(0)}K`
                      : `$${selectedPair.volume.h24.toFixed(0)}`}
                </div>
              )}
            </>
          ) : (
            <div className="font-mono text-2xl font-bold text-gray-600 tracking-tight">
              SELECT TOKEN
            </div>
          )}
        </div>

        {/* Receipt Number */}
        <div className="text-center pt-3 border-t border-gray-800/50 relative z-10">
          <div className="font-mono text-[10px] text-gray-500 mb-1">NEXT RECEIPT</div>
          <div className="font-mono text-lg text-white font-bold tracking-widest">
            #{String(summaryCount + 1).padStart(6, '0')}
          </div>
        </div>
      </div>

      {/* Token Input Bar */}
      <div className="relative">
        <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-1 shadow-xl flex items-center gap-2 relative overflow-hidden">
          <div className="absolute inset-0 bg-green-500/5 pointer-events-none" />
          <div className="bg-gray-900/50 rounded px-2 py-1.5 ml-1">
            <span className="font-mono text-[10px] text-green-500 font-bold">CA:</span>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLoad();
              if (e.key === 'Escape') setShowDropdown(false);
            }}
            placeholder="Enter token address or search..."
            className="bg-transparent border-none outline-none text-xs font-mono text-gray-300 w-full placeholder:text-gray-700 relative z-10"
          />
          <button
            onClick={handleLoad}
            disabled={isLoading || !inputValue.trim()}
            className={`text-black text-[10px] font-bold px-3 py-1.5 rounded transition-colors relative z-10 ${
              isLoading
                ? 'bg-gray-600 cursor-wait'
                : 'bg-green-600 hover:bg-green-500'
            }`}
          >
            {isLoading ? 'LOADING...' : 'LOAD'}
          </button>
        </div>

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {showDropdown && searchResults.length > 0 && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-1 bg-[#0a0a0a] border border-gray-800 rounded-lg shadow-xl overflow-hidden z-50"
            >
              {searchResults.map((pair) => {
                const liquidity = pair.liquidity?.usd || 0;
                const liquidityLabel = liquidity >= 1000000 ? `$${(liquidity / 1000000).toFixed(1)}M` :
                                       liquidity >= 1000 ? `$${(liquidity / 1000).toFixed(0)}K` :
                                       `$${liquidity.toFixed(0)}`;
                const volume = pair.volume?.h24 || 0;
                const volumeLabel = volume >= 1000000 ? `$${(volume / 1000000).toFixed(1)}M` :
                                    volume >= 1000 ? `$${(volume / 1000).toFixed(0)}K` :
                                    `$${volume.toFixed(0)}`;
                return (
                  <button
                    key={pair.pairAddress}
                    onClick={() => handleSelectResult(pair)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-800/50 transition-colors border-b border-gray-800/50 last:border-0"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-green-400 font-bold">
                          ${pair.baseToken.symbol.toUpperCase()}
                        </span>
                        <span className="font-mono text-[10px] text-gray-500">
                          {pair.baseToken.name.slice(0, 16)}
                          {pair.baseToken.name.length > 16 && '...'}
                        </span>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div className="font-mono text-[9px] text-blue-400/70">
                          LIQ {liquidityLabel}
                        </div>
                        <div className="font-mono text-[9px] text-purple-400/70">
                          VOL {volumeLabel}
                        </div>
                        <div className={`font-mono text-[10px] ${
                          (pair.priceChange?.h24 || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {(pair.priceChange?.h24 || 0) >= 0 ? '+' : ''}
                          {(pair.priceChange?.h24 || 0).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <div className="font-mono text-[9px] text-gray-600 truncate max-w-[200px]">
                        {pair.baseToken.address}
                      </div>
                      <div className="font-mono text-[10px] text-gray-400">
                        {formatPrice(parseFloat(pair.priceUsd))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search loading indicator */}
        {isSearching && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 text-center">
            <span className="font-mono text-[10px] text-gray-500">Searching...</span>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-red-900/20 border border-red-800/50 rounded-lg p-2 text-center">
            <span className="font-mono text-[10px] text-red-400">{error}</span>
          </div>
        )}
      </div>

      {/* Trending Tokens */}
      {trendingTokens.length > 0 && !showDropdown && !isSearching && (
        <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg shadow-xl overflow-hidden">
          {/* Sticky Header */}
          <div className="sticky top-0 bg-[#0a0a0a] px-3 pt-3 pb-2 border-b border-gray-800/50 z-10">
            <div className="font-mono text-[10px] text-gray-500 flex items-center gap-1">
              <span className="text-yellow-500">🔥</span> TRENDING ON SOLANA
            </div>
          </div>
          {/* Scrollable Token List */}
          <div className="max-h-[300px] overflow-y-auto p-3 space-y-1">
            {trendingTokens.slice(0, 10).map((pair) => {
              const liquidity = pair.liquidity?.usd || 0;
              const liquidityLabel = liquidity >= 1000000 ? `$${(liquidity / 1000000).toFixed(1)}M` :
                                     liquidity >= 1000 ? `$${(liquidity / 1000).toFixed(0)}K` :
                                     `$${liquidity.toFixed(0)}`;
              const volume = pair.volume?.h24 || 0;
              const volumeLabel = volume >= 1000000 ? `$${(volume / 1000000).toFixed(1)}M` :
                                  volume >= 1000 ? `$${(volume / 1000).toFixed(0)}K` :
                                  `$${volume.toFixed(0)}`;
              return (
                <button
                  key={pair.pairAddress}
                  onClick={() => handleSelectResult(pair)}
                  className="w-full px-2 py-1.5 text-left hover:bg-gray-800/50 transition-colors rounded"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-green-400 font-bold">
                        ${pair.baseToken.symbol.toUpperCase()}
                      </span>
                      <span className="font-mono text-[10px] text-gray-500 truncate max-w-[100px]">
                        {pair.baseToken.name}
                      </span>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div className="font-mono text-[9px] text-blue-400/70">
                        LIQ {liquidityLabel}
                      </div>
                      <div className="font-mono text-[9px] text-purple-400/70">
                        VOL {volumeLabel}
                      </div>
                      <div className={`font-mono text-[10px] ${
                        (pair.priceChange?.h24 || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {(pair.priceChange?.h24 || 0) >= 0 ? '+' : ''}
                        {(pair.priceChange?.h24 || 0).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-0.5">
                    <div className="font-mono text-[9px] text-gray-600 truncate max-w-[180px]">
                      {pair.baseToken.address}
                    </div>
                    <div className="font-mono text-[10px] text-gray-400">
                      {formatPrice(parseFloat(pair.priceUsd))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading trending indicator */}
      {isLoadingTrending && trendingTokens.length === 0 && (
        <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-3 text-center">
          <span className="font-mono text-[10px] text-gray-500">Loading trending...</span>
        </div>
      )}
    </motion.div>
  );
}
