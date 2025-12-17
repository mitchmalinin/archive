'use client';

import { getTrendingTokens, type DexPair } from '@/lib/api/dexscreener';
import { formatPrice } from '@/lib/utils';
import { useReceiptStore } from '@/stores/receiptStore';
import { useTokenStore } from '@/stores/tokenStore';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';

export function MobileFloatingBar() {
  const { summaryCount } = useReceiptStore();

  // Token store
  const {
    selectedToken,
    selectedPair,
    searchResults,
    isSearching,
    isLoading,
    error,
    setSearchQuery,
    searchTokens,
    loadToken,
    loadFromPair,
    clearSearch,
  } = useTokenStore();

  // Local state
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [trendingTokens, setTrendingTokens] = useState<DexPair[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
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

  // Debounced search
  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
      setSearchQuery(value);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (value.length >= 2) {
        searchTimeoutRef.current = setTimeout(() => {
          searchTokens(value);
        }, 300);
      } else {
        clearSearch();
      }
    },
    [setSearchQuery, searchTokens, clearSearch]
  );

  // Handle load button click
  const handleLoad = useCallback(async () => {
    if (!inputValue.trim()) return;

    const success = await loadToken(inputValue.trim());
    if (success) {
      setInputValue('');
      setIsExpanded(false);
    }
  }, [inputValue, loadToken]);

  // Handle search result selection
  const handleSelectResult = useCallback(
    async (pair: DexPair) => {
      setInputValue(pair.baseToken.address);
      await loadFromPair(pair);
      setIsExpanded(false);
    },
    [loadFromPair]
  );

  // Toggle expand/collapse
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      // Do not focus input on mobile to prevent keyboard popping up
    }
  };

  return (
    <>
      {/* Overlay Background when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpanded(false)}
            className="fixed inset-0 bg-black/80 z-40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Floating Bar Container */}
      <motion.div
        layout
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1], delay: 0.2 }}
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[360px] pointer-events-auto ${
          isExpanded ? 'h-auto' : 'h-auto'
        }`}
      >
        <motion.div
          layout
          className="bg-[#0a0a0a] border border-gray-800 rounded-xl shadow-2xl overflow-hidden relative"
        >


          {/* Header / Collapsed State */}
          <div 
            onClick={toggleExpand}
            className="relative z-10 p-3 flex items-center justify-between cursor-pointer active:bg-gray-900/50 transition-colors"
          >
            {/* Left: Status Indicator */}
            <div className="flex items-center gap-2">
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

            {/* Center: Token Info (if selected) or Prompt */}
            <div className="flex-1 text-center px-2">
              {selectedToken ? (
                <div className="flex flex-col items-center">
                  <span className="font-mono text-sm font-bold text-green-400 tracking-tight">
                    ${selectedToken.symbol.toUpperCase()}
                  </span>
                  {selectedPair?.volume?.h24 && (
                    <span className="font-mono text-[9px] text-gray-500">
                      VOL: {selectedPair.volume.h24 >= 1000000
                        ? `$${(selectedPair.volume.h24 / 1000000).toFixed(2)}M`
                        : `$${(selectedPair.volume.h24 / 1000).toFixed(0)}K`}
                    </span>
                  )}
                </div>
              ) : (
                <span className="font-mono text-xs font-bold text-gray-400">
                  TAP TO SELECT TOKEN
                </span>
              )}
            </div>

            {/* Right: Receipt Count */}
            <div className="flex flex-col items-end">
               <span className="font-mono text-[9px] text-gray-600">REC #</span>
               <span className="font-mono text-xs text-white font-bold">
                 {String(summaryCount + 1).padStart(4, '0')}
               </span>
            </div>
            
            {/* Expand Icon */}
             <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              className="ml-2 text-gray-500"
            >
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.div>
          </div>

          {/* Expanded Content: Search & Trending */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-gray-800/50 bg-[#050505]"
              >
                <div className="p-3 space-y-3">
                  {/* Search Input */}
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-1 flex items-center gap-2">
                     <div className="bg-gray-800 rounded px-1.5 py-1 ml-1">
                        <span className="font-mono text-[10px] text-green-500 font-bold">CA:</span>
                      </div>
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleLoad();
                        }
                      }}
                      placeholder="Address or search..."
                      className="bg-transparent border-none outline-none text-xs font-mono text-gray-300 w-full placeholder:text-gray-600"
                    />
                    {inputValue && (
                      <button 
                        onClick={() => {
                          setInputValue('');
                          clearSearch();
                          inputRef.current?.focus();
                        }}
                        className="text-gray-500 hover:text-white px-2"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Search Results or Trending */}
                  <div className="max-h-[240px] overflow-y-auto">
                    {/* Loading State */}
                    {(isSearching || isLoading) && (
                       <div className="text-center py-4">
                         <span className="font-mono text-[10px] text-green-500 animate-pulse">SEARCHING CHAIN...</span>
                       </div>
                    )}

                    {/* Search Results */}
                    {!isSearching && searchResults.length > 0 && (
                      <div className="space-y-1">
                        <div className="font-mono text-[9px] text-gray-500 mb-2">SEARCH RESULTS</div>
                        {searchResults.map((pair) => (
                          <button
                            key={pair.pairAddress}
                            onClick={() => handleSelectResult(pair)}
                            className="w-full px-2 py-2 text-left hover:bg-gray-800/50 transition-colors rounded border border-transparent hover:border-gray-800 flex justify-between items-center"
                          >
                             <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-green-400 font-bold">
                                  ${pair.baseToken.symbol.toUpperCase()}
                                </span>
                                <span className="font-mono text-[10px] text-gray-500 truncate max-w-[80px]">
                                  {pair.baseToken.name}
                                </span>
                             </div>
                             <div className="flex flex-col items-end">
                               <span className="font-mono text-[9px] text-gray-400">
                                 {formatPrice(parseFloat(pair.priceUsd))}
                               </span>
                               <span className={`font-mono text-[9px] ${
                                  (pair.priceChange?.h24 || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                                }`}>
                                  {(pair.priceChange?.h24 || 0).toFixed(1)}%
                               </span>
                             </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Trending (Show if no search) */}
                    {!isSearching && searchResults.length === 0 && (
                      <>
                        {isLoadingTrending ? (
                          <div className="text-center py-4">
                            <span className="font-mono text-[10px] text-gray-500 animate-pulse">LOADING TRENDING...</span>
                          </div>
                        ) : trendingTokens.length > 0 ? (
                          <div className="space-y-1">
                            <div className="font-mono text-[9px] text-gray-500 mb-2 flex items-center gap-1">
                              <span className="text-yellow-500">🔥</span> TRENDING
                            </div>
                            {trendingTokens.slice(0, 8).map((pair) => (
                              <button
                                key={pair.pairAddress}
                                onClick={() => handleSelectResult(pair)}
                                className="w-full px-2 py-2 text-left hover:bg-gray-800/50 transition-colors rounded border border-transparent hover:border-gray-800 flex justify-between items-center"
                              >
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs text-green-400 font-bold">
                                      ${pair.baseToken.symbol.toUpperCase()}
                                    </span>
                                    <span className="font-mono text-[10px] text-gray-500 truncate max-w-[80px]">
                                      {pair.baseToken.name}
                                    </span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="font-mono text-[9px] text-gray-400">
                                    {formatPrice(parseFloat(pair.priceUsd))}
                                  </span>
                                  <span className={`font-mono text-[9px] ${
                                      (pair.priceChange?.h24 || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                                    }`}>
                                      {(pair.priceChange?.h24 || 0).toFixed(1)}%
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <span className="font-mono text-[10px] text-gray-500">NO TRENDING TOKENS FOUND</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Error */}
                    {error && (
                      <div className="p-2 text-center">
                        <span className="font-mono text-[10px] text-red-400">{error}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </>
  );
}
