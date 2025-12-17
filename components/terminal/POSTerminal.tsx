import type { Candle } from '@/lib/types';
import { formatPrice, formatTimeShort } from '@/lib/utils';
import { useCandleStore } from '@/stores/candleStore';
import { useReceiptStore } from '@/stores/receiptStore';
import { ANIMATION_SPEEDS, useUIStore } from '@/stores/uiStore';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { CandleReceipt } from '../receipts/CandleReceipt';
import { TerminalKeypad } from './TerminalKeypad';
import { TerminalScreen } from './TerminalScreen';

// Completed receipt - larger text with clear borders
function CompletedReceipt({
  candle,
  receiptNumber
}: {
  candle: Candle;
  receiptNumber: number;
}) {
  const change = ((candle.close - candle.open) / candle.open) * 100;
  const isPositive = change >= 0;

  return (
    <div
      className="bg-[#fffdf5] dark:bg-[#e8e8e0] shrink-0 border-b-2 border-dashed border-gray-400"
    >
      <div className="px-4 pt-12 pb-4 font-mono text-gray-800 h-full flex flex-col">
        {/* Whale indicator */}
        {candle.hasWhale && (
          <div className="text-center mb-2 pb-2 border-b border-dashed border-gray-400">
            <div className="font-bold text-base tracking-wider">*** WHALE TRADE ***</div>
          </div>
        )}

        {/* Header row */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="font-bold text-base">RECEIPT #{String(receiptNumber).padStart(6, '0')}</div>
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

        {/* OHLC Grid - larger text */}
        <div className="grid grid-cols-2 gap-4 text-sm font-mono flex-1">
          <div className="space-y-2">
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
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="opacity-60">VOLUME</span>
              <span className="font-semibold">{candle.volume.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">TRADES</span>
              <span className="font-semibold">{candle.tradeCount}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span className="opacity-60">BUYS</span>
              <span className="font-semibold">{candle.buyCount} ({candle.buyVolume.toFixed(1)})</span>
            </div>
            <div className="flex justify-between text-red-700">
              <span className="opacity-60">SELLS</span>
              <span className="font-semibold">{candle.sellCount} ({candle.sellVolume.toFixed(1)})</span>
            </div>
          </div>
        </div>

        {/* Bottom divider */}
        <div className="border-t border-dashed border-gray-300 mt-3 pt-2 text-center">
          <span className="text-[10px] text-gray-400 tracking-widest">• • • • • • • • • • • • • • •</span>
        </div>
      </div>
    </div>
  );
}

// Mobile Recording Header - separate box above POS
function MobileRecordingHeader({
  receiptNumber,
  secondsRemaining,
  candle
}: {
  receiptNumber: number;
  secondsRemaining: number;
  candle: Candle | null;
}) {
  const change = candle && candle.tradeCount > 0
    ? ((candle.close - candle.open) / candle.open) * 100
    : 0;
  const isPositive = change >= 0;

  return (
    <div className="flex flex-col gap-2 bg-black text-green-500 px-4 py-3 rounded-lg border border-gray-800 shadow-lg mb-4 w-full max-w-[320px] lg:hidden relative overflow-hidden">
      {/* Scanline effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 pointer-events-none bg-[length:100%_4px,3px_100%]" />
      
      {/* Row 1: Live Feed & Timer */}
      <div className="flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2 text-[10px] font-mono text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
          <span className="relative flex h-1.5 w-1.5">
            <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
          </span>
          LIVE FEED
        </div>
        <div className="font-mono font-bold tabular-nums text-xs text-gray-400">
          {secondsRemaining}s
        </div>
      </div>

      {/* Row 2: Receipt # & Price Stats */}
      <div className="flex justify-between items-center relative z-10 border-t border-gray-800/50 pt-2 mt-1">
        <div className="font-mono font-bold tracking-wider text-xs text-gray-300">
          REC #{String(receiptNumber).padStart(6, '0')}
        </div>
        {candle && (
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-gray-300">{formatPrice(candle.close)}</span>
            <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
              {isPositive ? '+' : ''}{change.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function POSTerminal() {
  const isPrinting = useUIStore((state) => state.isPrinting);
  const animationSpeedIndex = useUIStore((state) => state.animationSpeedIndex);
  const currentCandle = useCandleStore((state) => state.currentCandle);
  const completedCandles = useCandleStore((state) => state.completedCandles);
  const summaryCount = useReceiptStore((state) => state.summaryCount);
  const posReceiptLimit = useUIStore((state) => state.posReceiptLimit);

  // State for expanded receipts on mobile
  const [expandedReceipts, setExpandedReceipts] = useState<Set<string>>(new Set());
  const toggleExpanded = useCallback((id: string) => {
    setExpandedReceipts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Calculate live receipt data
  const now = Date.now();
  const candleEnd = currentCandle?.endTime || now + 30000;
  const secondsRemaining = Math.max(0, Math.floor((candleEnd - now) / 1000));

  // Key for animation - changes when a new candle completes
  const stackKey = completedCandles.length;
  const animationDuration = ANIMATION_SPEEDS[animationSpeedIndex].duration;

  return (
    <div className="relative flex flex-col h-auto lg:h-full">


      {/* Wrapper for Mobile - keeps POS and Header together */}
      <div className="relative z-40 bg-[#e5e5e5] dark:bg-[#050505] pt-6 lg:static lg:bg-transparent lg:p-0 lg:z-auto w-full flex flex-col items-center">
        {/* Mobile Recording Header */}
        <MobileRecordingHeader 
          receiptNumber={summaryCount + 1}
          secondsRemaining={secondsRemaining}
          candle={currentCandle}
        />

        {/* Terminal Body */}
        <motion.div
          className="bg-[#d4d4d8] dark:bg-[#1a1a1a] rounded-[2rem] p-4 lg:p-6 shadow-terminal border-b-8 border-r-4 border-gray-400 dark:border-black relative w-full shrink-0"
          animate={{
            scale: isPrinting ? [1, 1.005, 1] : 1,
          }}
          transition={{ duration: 0.15 }}
        >
          {/* Screen */}
        <div className="bg-black rounded-xl p-3 mb-4 relative overflow-hidden shadow-inner-screen border-2 border-gray-500 dark:border-gray-800">
          {/* Screen Header */}
          <div className="flex justify-between items-center mb-1 px-1">
            <span className="text-gray-400 italic font-sans font-bold text-[10px] tracking-tight">
              Verifone Live
            </span>
            <div className="flex gap-1">
              <span className="material-symbols-outlined text-[10px] text-white">
                signal_cellular_alt
              </span>
              <span className="material-symbols-outlined text-[10px] text-white">
                battery_full
              </span>
            </div>
          </div>

          {/* Chart Display */}
          <TerminalScreen />
        </div>

        {/* Function Buttons Row */}
        <div className="flex justify-between gap-3 mb-4 px-2">
          <button className="h-8 flex-1 bg-gray-300 dark:bg-gray-600 rounded-sm skew-x-[-10deg] border-b-2 border-gray-400 dark:border-gray-800 flex items-center justify-center cursor-pointer hover:bg-gray-400 dark:hover:bg-gray-500 transition-all">
            <span className="material-symbols-outlined text-sm text-gray-600 dark:text-gray-300 transform skew-x-[10deg]">
              remove
            </span>
          </button>
          <button className="h-8 flex-1 bg-gray-300 dark:bg-gray-600 rounded-sm skew-x-[-10deg] border-b-2 border-gray-400 dark:border-gray-800 flex items-center justify-center cursor-pointer hover:bg-gray-400 dark:hover:bg-gray-500 transition-all">
            <div className="flex gap-1 transform skew-x-[10deg]">
              <span className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-gray-600 dark:border-t-gray-300" />
              <span className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-gray-600 dark:border-b-gray-300" />
            </div>
          </button>
          <button className="h-8 flex-1 bg-gray-300 dark:bg-gray-600 rounded-sm skew-x-[-10deg] border-b-2 border-gray-400 dark:border-gray-800 flex items-center justify-center cursor-pointer hover:bg-gray-400 dark:hover:bg-gray-500 transition-all">
            <span className="material-symbols-outlined text-sm text-gray-600 dark:text-gray-300 transform skew-x-[10deg]">
              check
            </span>
          </button>
        </div>

        {/* Keypad */}
        <TerminalKeypad />

        {/* Receipt Bezel - Gray container where paper emerges */}
        <div className="h-8 -mx-6 -mb-6 bg-gray-700 rounded-b-[2rem] shadow-md border-t border-gray-600 mt-4 relative z-30 flex justify-center">
          <div className="flex-1 mx-6 h-1 bg-gray-800/50 rounded-full mt-auto mb-2" />
        </div>
      </motion.div>
      </div>

      {/* Receipt Paper Area */}
      <div className="relative mx-6 -mt-9 z-20 h-auto lg:flex-1 lg:min-h-0 overflow-visible lg:overflow-hidden flex flex-col pb-12 lg:pb-0">
        
        {/* Desktop View: Last {posReceiptLimit} receipts, non-interactive */}
        <div className="hidden lg:flex flex-col h-full">
          <AnimatePresence initial={false} mode="popLayout">
            {completedCandles.slice(-posReceiptLimit).reverse().map((candle, index) => {
              const receiptNumber = completedCandles.length - index;
              return (
                <motion.div
                  key={`desktop-${candle.id}`}
                  layout
                  initial={{ height: 0, opacity: 1 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ y: '100%', opacity: 0, transition: { duration: animationDuration } }}
                  transition={{ duration: animationDuration, ease: 'linear' }}
                  className="relative z-10 overflow-hidden shrink-0"
                >
                  <motion.div
                    initial={{ y: '-100%' }}
                    animate={{ y: '0%' }}
                    transition={{ duration: animationDuration, ease: 'linear' }}
                  >
                    <div className="bg-[#fffdf5] dark:bg-[#e8e8e0]">
                      <CompletedReceipt candle={candle} receiptNumber={receiptNumber} />
                    </div>
                  </motion.div>
                  {receiptNumber === 1 && <div className="h-4 torn-edge-bottom" />}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Mobile View: All receipts, interactive */}
        <div className="lg:hidden flex flex-col">
          <AnimatePresence initial={false} mode="popLayout">
            {completedCandles.slice().reverse().map((candle, index) => {
              // For full list reversed:
              // index 0 is newest (summaryCount)
              // index 1 is summaryCount - 1
              const receiptNumber = summaryCount - index;
              const isExpanded = expandedReceipts.has(candle.id);

              return (
                <motion.div
                  key={`mobile-${candle.id}`}
                  layout
                  initial={{ height: 0, opacity: 1 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: animationDuration, ease: 'linear' }}
                  className="relative z-10 overflow-hidden shrink-0"
                >
                  <motion.div
                    initial={{ y: '-100%' }}
                    animate={{ y: '0%' }}
                    transition={{ duration: animationDuration, ease: 'linear' }}
                  >
                    <div className="bg-[#fffdf5] dark:bg-[#e8e8e0]">
                      <CandleReceipt 
                        candle={candle} 
                        receiptNumber={receiptNumber}
                        isExpanded={isExpanded}
                        onToggleExpand={() => toggleExpanded(candle.id)}
                        isFirst={index === 0}
                      />
                    </div>
                    {receiptNumber === 1 && <div className="h-4 torn-edge-bottom" />}
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Portal Shadow: Bottom overlay connecting to Transaction Log (Desktop Only) */}
        <div
          className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#e5e5e5]/60 dark:from-[#050505]/60 to-transparent pointer-events-none z-30 hidden lg:block"
        />
      </div>
    </div>
  );
}
