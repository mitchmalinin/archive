import { useSound } from '@/hooks/useSound'
import type { Candle } from '@/lib/types'
import {
    formatPrice,
    formatTimeShort,
    getSecondsUntilNextCandle,
} from '@/lib/utils'
import { useCandleStore } from '@/stores/candleStore'
import { useReceiptStore } from '@/stores/receiptStore'
import { useTokenStore } from '@/stores/tokenStore'
import { ANIMATION_SPEEDS, useUIStore } from '@/stores/uiStore'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { CandleReceipt } from '../receipts/CandleReceipt'
import { TerminalKeypad } from './TerminalKeypad'
import { TerminalScreen } from './TerminalScreen'

// Completed receipt - larger text with clear borders
function CompletedReceipt({
  candle,
  receiptNumber,
  isFirst,
}: {
  candle: Candle
  receiptNumber: number
  isFirst?: boolean
}) {
  const selectedToken = useTokenStore((state) => state.selectedToken)
  const tokenTicker = selectedToken?.symbol || 'TOKEN'
  const change = ((candle.close - candle.open) / candle.open) * 100
  const isPositive = change >= 0

  return (
    <div className="shrink-0 relative">
      <div className={`bg-[#fffdf5] dark:bg-[#e8e8e0] border-b-2 border-dashed border-gray-400 px-4 ${isFirst ? 'pt-12' : 'pt-4'} pb-4 font-mono text-gray-800 h-full flex flex-col`}>
        {/* Header row */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="font-bold text-base">
              RECEIPT #{String(receiptNumber).padStart(6, '0')}
            </div>
            <div className="text-xs text-gray-500">
              {formatTimeShort(candle.startTime)} →{' '}
              {formatTimeShort(candle.endTime)} UTC
            </div>
          </div>
          <div
            className={`font-bold text-sm ${
              isPositive ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {isPositive ? '+' : ''}
            {change.toFixed(2)}%
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-300 mb-3" />

        {/* Line items section */}
        <div className="space-y-2 text-sm font-mono mb-3">
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
                {candle.trades.length > 0 ? `${candle.buyCount} orders` : '—'}
              </span>
            </div>
            {candle.trades.length > 0 && (
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
                {candle.trades.length > 0 ? `${candle.sellCount} orders` : '—'}
              </span>
            </div>
            {candle.trades.length > 0 && (
              <div className="flex justify-end text-[10px] opacity-80 mt-0.5">
                {candle.sellVolume.toFixed(2)} SOL
              </div>
            )}
          </div>
        </div>

        {/* OHLC Grid */}
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
              <span className="font-semibold">
                {candle.trades.length > 0 ? candle.tradeCount : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom divider */}
        <div className="border-t border-dashed border-gray-300 mt-3 pt-2 text-center">
          <span className="text-[10px] text-gray-400 tracking-widest">
            • • • • • • • • • • • • • • •
          </span>
        </div>
      </div>
      
      {isFirst && (
        <div className="h-4 torn-edge-bottom relative z-10" />
      )}

    </div>
  )
}



export function POSTerminal() {
  const isPrinting = useUIStore((state) => state.isPrinting)
  const animationSpeedIndex = useUIStore((state) => state.animationSpeedIndex)
  const chartTimeframe = useUIStore((state) => state.chartTimeframe)
  const currentCandle = useCandleStore((state) => state.currentCandle)
  const completedCandles = useCandleStore((state) => state.completedCandles)
  const summaryCount = useReceiptStore((state) => state.summaryCount)
  const posReceiptLimit = useUIStore((state) => state.posReceiptLimit)
  const selectedToken = useTokenStore((state) => state.selectedToken)
  const { playReceiptPrinting, playButtonPress, playReceiptTear } = useSound()

  // Track previous candle count to detect new receipts
  const prevCandleCount = useRef(completedCandles.length)

  // Wall-clock based timer state
  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    getSecondsUntilNextCandle(chartTimeframe)
  )

  // Update timer based on wall-clock
  useEffect(() => {
    const updateTimer = () => {
      setSecondsRemaining(getSecondsUntilNextCandle(chartTimeframe))
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [chartTimeframe])

  // Play receipt printing sound when a new candle completes
  // Play tear sound when candles are cleared (length decreases)
  useEffect(() => {
    if (completedCandles.length > prevCandleCount.current) {
      playReceiptPrinting()
    } else if (completedCandles.length < prevCandleCount.current && prevCandleCount.current > 0) {
      playReceiptTear()
    }
    prevCandleCount.current = completedCandles.length
  }, [completedCandles.length, playReceiptPrinting, playReceiptTear])

  const animationDuration = ANIMATION_SPEEDS[animationSpeedIndex].duration

  return (
    <div className="relative flex flex-col h-auto lg:h-full">
      {/* Wrapper for Mobile - keeps POS and Header together */}
      <div className="relative z-40 bg-[#e5e5e5] dark:bg-[#050505] pt-20 lg:static lg:bg-transparent lg:p-0 lg:z-auto w-full flex flex-col items-center">
        
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
                WZRD, Inc.
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
            <button
              onClick={playButtonPress}
              className="h-8 flex-1 bg-gray-300 dark:bg-gray-600 rounded-sm skew-x-[-10deg] border-b-2 border-gray-400 dark:border-gray-800 flex items-center justify-center cursor-pointer hover:bg-gray-400 dark:hover:bg-gray-500 transition-all"
            >
              <span className="material-symbols-outlined text-sm text-gray-600 dark:text-gray-300 transform skew-x-[10deg]">
                remove
              </span>
            </button>
            <button
              onClick={playButtonPress}
              className="h-8 flex-1 bg-gray-300 dark:bg-gray-600 rounded-sm skew-x-[-10deg] border-b-2 border-gray-400 dark:border-gray-800 flex items-center justify-center cursor-pointer hover:bg-gray-400 dark:hover:bg-gray-500 transition-all"
            >
              <div className="flex gap-1 transform skew-x-[10deg]">
                <span className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-gray-600 dark:border-t-gray-300" />
                <span className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-gray-600 dark:border-b-gray-300" />
              </div>
            </button>
            <button
              onClick={playButtonPress}
              className="h-8 flex-1 bg-gray-300 dark:bg-gray-600 rounded-sm skew-x-[-10deg] border-b-2 border-gray-400 dark:border-gray-800 flex items-center justify-center cursor-pointer hover:bg-gray-400 dark:hover:bg-gray-500 transition-all"
            >
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
      <div className="relative mx-6 -mt-9 z-20 h-auto lg:flex-1 lg:min-h-0 overflow-visible lg:overflow-hidden flex flex-col pb-12 lg:pb-0 pt-9 lg:pt-6">
        {/* Desktop View: Last {posReceiptLimit} receipts, non-interactive */}
        <div className="hidden lg:flex flex-col h-full">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={selectedToken?.address || 'empty'}
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{
                y: 800,
                opacity: 1,
                transition: { duration: 2, ease: [0.4, 0, 1, 1] },
              }}
              className="relative z-10"
            >
              {/* Torn top edge - only visible when falling (exiting) */}
              {completedCandles.length > 0 && (
                <motion.div 
                  className="h-4 torn-edge-top w-full absolute -top-4 left-0 z-20"
                  variants={{
                    initial: { opacity: 0 },
                    animate: { opacity: 0 },
                    exit: { opacity: 1, transition: { duration: 0 } }
                  }}
                />
              )}

              {completedCandles
                .slice()
                .reverse()
                .map((candle, index) => {
                  const receiptNumber = completedCandles.length - index

                  return (
                    <motion.div
                      key={`desktop-${candle.id}`}
                      layout
                      initial={{ height: 0, opacity: 1 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      transition={{ duration: animationDuration, ease: 'linear' }}
                      className="relative z-10 shrink-0 origin-top -mb-[2px]"
                    >
                      <motion.div
                        initial={{ y: '-100%' }}
                        animate={{ y: '0%' }}
                        transition={{
                          duration: animationDuration,
                          ease: 'linear',
                        }}
                      >
                        <div>
                          <CompletedReceipt
                            candle={candle}
                            receiptNumber={receiptNumber}
                            isFirst={receiptNumber === 1}
                          />
                        </div>
                      </motion.div>
                    </motion.div>
                  )
                })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile View: All receipts, interactive */}
        <div className="lg:hidden flex flex-col">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={selectedToken?.address || 'empty-mobile'}
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{
                y: 800,
                opacity: 1,
                transition: { duration: 2, ease: [0.4, 0, 1, 1] },
              }}
              className="relative z-10"
            >
              {/* Torn top edge - only visible when falling (exiting) */}
              {completedCandles.length > 0 && (
                <motion.div 
                  className="h-4 torn-edge-top w-full absolute -top-4 left-[2px] z-20"
                  variants={{
                    initial: { opacity: 0 },
                    animate: { opacity: 0 },
                    exit: { opacity: 1, transition: { duration: 0 } }
                  }}
                />
              )}

              {completedCandles
                .slice()
                .reverse()
                .map((candle, index) => {
                  const receiptNumber = completedCandles.length - index

                  return (
                    <motion.div
                      key={`mobile-${candle.id}`}
                      layout
                      initial={{ height: 0, opacity: 1 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      transition={{ duration: animationDuration, ease: 'linear' }}
                      className="relative z-10 shrink-0 origin-top"
                    >
                      <motion.div
                        initial={{ y: '-100%' }}
                        animate={{ y: '0%' }}
                        transition={{
                          duration: animationDuration,
                          ease: 'linear',
                        }}
                      >
                        <div>
                          <CandleReceipt
                            candle={candle}
                            receiptNumber={receiptNumber}
                            isFirst={receiptNumber === 1}
                          />
                        </div>
                      </motion.div>
                    </motion.div>
                  )
                })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Portal Shadow: Bottom overlay connecting to Transaction Log (Desktop Only) */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#e5e5e5]/60 dark:from-[#050505]/60 to-transparent pointer-events-none z-30 hidden lg:block" />
      </div>

    </div>
  )
}
