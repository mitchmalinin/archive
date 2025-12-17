'use client';

import type { Candle } from '@/lib/types';
import { formatPrice, formatTimeShort } from '@/lib/utils';
import { useTokenStore } from '@/stores/tokenStore';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

interface CandleReceiptProps {
  candle: Candle;
  receiptNumber: number;
  isFirst?: boolean;
  showSignature?: boolean;
}

export function CandleReceipt({ candle, receiptNumber, isFirst, showSignature }: CandleReceiptProps) {
  // Get token ticker from store
  const selectedToken = useTokenStore((state) => state.selectedToken);
  const tokenTicker = selectedToken?.symbol || 'TOKEN';

  const [isExpanded, setIsExpanded] = useState(false);

  const change = ((candle.close - candle.open) / candle.open) * 100;
  const isPositive = change >= 0;
  const hasTrades = candle.trades.length > 0;

  return (
    <div className="relative font-mono text-gray-800">
      {/* Paper Background Wrapper */}
      <div className={`bg-[#fffdf5] dark:bg-[#e8e8e0] border-b-2 border-dashed border-gray-400 ${isFirst ? 'pt-4' : ''}`}>
        
        {/* Main Receipt Content - Clickable if has trades */}
        <div
          className={`p-3 lg:p-4 ${hasTrades ? 'cursor-pointer hover:bg-black/5 transition-colors' : ''}`}
          onClick={() => hasTrades && setIsExpanded(!isExpanded)}
        >
          {/* Header row */}
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="font-bold text-sm lg:text-base">
                RECEIPT #{String(receiptNumber).padStart(6, '0')}
              </div>
              <div className="text-xs text-gray-500">
                {formatTimeShort(candle.startTime)} → {formatTimeShort(candle.endTime)} UTC
              </div>
            </div>
            <div className={`font-bold text-sm ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
              {isPositive ? '+' : ''}{change.toFixed(2)}%
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-gray-300 mb-3" />

          {/* Line items section */}
          <div className="space-y-2 text-xs lg:text-sm font-mono mb-3">
            {/* Ticker */}
            <div className="flex items-baseline">
              <span className="opacity-60">TICKER</span>
              <span className="flex-1 border-b border-dotted border-gray-400 mx-2" />
              <span className="font-bold text-gray-800">${tokenTicker.toUpperCase()}</span>
            </div>

            {/* Candle */}
            <div>
              <div className="flex items-baseline">
                <span className="opacity-60">CANDLE</span>
                <span className="flex-1 border-b border-dotted border-gray-400 mx-2" />
                <span className="font-bold text-gray-800">
                  #{candle.candleNumber || receiptNumber}
                </span>
              </div>
              <div className="flex justify-end text-[10px] opacity-80 mt-0.5">
                {formatTimeShort(candle.startTime)} → {formatTimeShort(candle.endTime)} UTC
              </div>
            </div>

            {/* Buys */}
            <div className="text-green-700">
              <div className="flex items-baseline">
                <span className="opacity-60">BUYS</span>
                <span className="flex-1 border-b border-dotted border-green-300 mx-2" />
                <span className="font-semibold">
                  {hasTrades ? `${candle.buyCount} orders` : '—'}
                </span>
              </div>
              {hasTrades && candle.buyVolume > 0 && (
                <div className="flex justify-end text-[10px] opacity-80 mt-0.5">
                  {candle.buyVolume.toFixed(2)} SOL
                </div>
              )}
            </div>

            {/* Sells */}
            <div className="text-red-700">
              <div className="flex items-baseline">
                <span className="opacity-60">SELLS</span>
                <span className="flex-1 border-b border-dotted border-red-300 mx-2" />
                <span className="font-semibold">
                  {hasTrades ? `${candle.sellCount} orders` : '—'}
                </span>
              </div>
              {hasTrades && candle.sellVolume > 0 && (
                <div className="flex justify-end text-[10px] opacity-80 mt-0.5">
                  {candle.sellVolume.toFixed(2)} SOL
                </div>
              )}
            </div>

            {/* Volume */}
            <div className={isPositive ? 'text-green-700' : 'text-red-700'}>
              <div className="flex items-baseline">
                <span className="opacity-60">VOLUME</span>
                <span className={`flex-1 border-b border-dotted ${isPositive ? 'border-green-300' : 'border-red-300'} mx-2`} />
                <span className="font-semibold">
                  {candle.volume >= 1000000
                    ? `$${(candle.volume / 1000000).toFixed(2)}M`
                    : candle.volume >= 1000
                      ? `$${(candle.volume / 1000).toFixed(2)}K`
                      : `$${candle.volume.toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>

          {/* OHLC Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs lg:text-sm font-mono mb-3">
            <div className="flex justify-between">
              <span className="opacity-60">OPEN</span>
              <span className="font-semibold">{formatPrice(candle.open)}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">HIGH</span>
              <span className="font-semibold">{formatPrice(candle.high)}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">LOW</span>
              <span className="font-semibold">{formatPrice(candle.low)}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">CLOSE</span>
              <span className="font-semibold">{formatPrice(candle.close)}</span>
            </div>
          </div>

          {/* Signature - only on transaction log */}
          {showSignature && (
            <div className="flex items-end gap-3 mt-3 mb-2">
              <span className="text-[9px] text-gray-400 uppercase tracking-wider">Signature</span>
              <span className="flex-1 border-b border-dashed border-gray-300 mb-1" />
              <svg
                viewBox="0 0 100 30"
                className="w-16 h-5 text-gray-500 -mb-1"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Cursive Mr.Wzrd signature */}
                <path d="M2 22 Q4 8, 8 8 Q12 8, 12 16 Q12 22, 16 14 Q18 10, 20 22" />
                <path d="M22 16 Q24 12, 28 14" />
                <circle cx="32" cy="21" r="1" fill="currentColor" stroke="none" />
                <path d="M38 6 Q36 14, 40 22 Q44 14, 48 22 Q52 14, 56 22 Q58 14, 56 6" />
                <path d="M60 14 L68 14 L60 22 L68 22" />
                <path d="M72 14 Q74 12, 78 14" />
                <path d="M84 6 L84 22 Q84 14, 78 14 Q78 22, 84 22" />
              </svg>
            </div>
          )}

          {/* Expand indicator - only show if there are trades to view */}
          {hasTrades && (
            <div className="text-center text-xs text-gray-500 pt-3 pb-1">
              [ {isExpanded ? 'HIDE ORDERS' : `VIEW ${candle.trades.length} ORDERS`} ]
            </div>
          )}
        </div>

        {/* Expanded Trade List - Animated */}
        <AnimatePresence initial={false}>
          {isExpanded && hasTrades && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                opacity: { duration: 0.2 },
              }}
              style={{ overflow: 'hidden' }}
            >
              {/* Order list header */}
              <div className="border-t border-dashed border-gray-400 mx-4" />
              <div className="px-4 py-2 text-center">
                <span className="text-[10px] text-gray-400 tracking-widest">───── ORDERS ─────</span>
              </div>

              {/* Trade rows - receipt style */}
              <div className="px-4 pb-4 space-y-3">
                {candle.trades.map((trade, idx) => (
                  <div key={trade.id} className="text-xs font-mono">
                    {/* Header row: number and side */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-500">#{String(idx + 1).padStart(2, '0')}</span>
                      <span className={`font-semibold ${trade.side === 'buy' ? 'text-green-700' : 'text-red-700'}`}>
                        {trade.side.toUpperCase()}
                      </span>
                      <span className="text-gray-400 text-[10px]">{formatTimeShort(trade.timestamp)}</span>
                    </div>
                    {/* Amount line */}
                    <div className="flex items-baseline">
                      <span className="text-gray-400 text-[10px]">AMT</span>
                      <span className="flex-1 border-b border-dotted border-gray-300 mx-2" />
                      <span className="font-semibold text-gray-700">
                        {trade.tokenAmount >= 1000000
                          ? `${(trade.tokenAmount / 1000000).toFixed(2)}M`
                          : trade.tokenAmount >= 1000
                            ? `${(trade.tokenAmount / 1000).toFixed(2)}K`
                            : trade.tokenAmount.toFixed(2)
                        } {tokenTicker}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order list footer */}
              <div className="px-4 pb-3 text-center">
                <span className="text-[10px] text-gray-400 tracking-widest">• • • • • • • • • • • • • • •</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Footer decorations */}
        <div className="pt-4 pb-2 text-center opacity-50 text-[10px]">
          . . . . . . . . . . . . . . .
        </div>
      </div>

      {isFirst && (
        <div className="h-4 torn-edge-bottom relative z-10" />
      )}
    </div>
  );
}
