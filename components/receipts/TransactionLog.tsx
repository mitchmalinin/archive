'use client';

import type { Receipt } from '@/lib/types';
import { useCandleStore } from '@/stores/candleStore';
import { useReceiptStore } from '@/stores/receiptStore';
import { ANIMATION_SPEEDS, useUIStore } from '@/stores/uiStore';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useRef } from 'react';
import { CandleReceipt } from './CandleReceipt';

// Store expanded state outside component to persist across re-renders
const expandedState = new Map<string, boolean>();


export function TransactionLog() {
  const receipts = useReceiptStore((state) => state.receipts);
  const addReceipt = useReceiptStore((state) => state.addReceipt);
  const summaryCount = useReceiptStore((state) => state.summaryCount);
  const completedCandles = useCandleStore((state) => state.completedCandles);
  const completeCandle = useCandleStore((state) => state.completeCandle);
  const debugCreateCandle = useCandleStore((state) => state.debugCreateCandle);
  const animationSpeedIndex = useUIStore((state) => state.animationSpeedIndex);
  const isPrinting = useUIStore((state) => state.isPrinting);
  const cycleAnimationSpeed = useUIStore((state) => state.cycleAnimationSpeed);
  const posReceiptLimit = useUIStore((state) => state.posReceiptLimit);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get history candles (skipping the newest which are on POS)
  const displayCandles = completedCandles.slice(0, -posReceiptLimit).reverse();

  const currentSpeed = ANIMATION_SPEEDS[animationSpeedIndex];

  // Debug: Print a test receipt
  const handleDebugPrint = useCallback(() => {
    const candle = debugCreateCandle();
    completeCandle(candle);
    // Receipt store update is handled by the store subscription/logic usually, 
    // but here we just ensure candleStore is the source of truth for UI.
  }, [debugCreateCandle, completeCandle]);

  const getExpanded = useCallback((id: string) => expandedState.get(id) ?? false, []);
  const setExpanded = useCallback((id: string, value: boolean) => {
    expandedState.set(id, value);
  }, []);

  return (
    <section className="hidden lg:flex flex-col bg-white dark:bg-[#121212] relative overflow-visible lg:overflow-hidden h-auto lg:h-full min-h-0 pl-0 lg:pl-32">
      {/* Receipt area */}
      <div className="flex-1 relative min-h-0 overflow-visible lg:overflow-hidden">
        {/* Counter background */}
        <div className="absolute inset-0 bg-[#d6d3cd] dark:bg-[#111]" />
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20 cross-pattern" />

        {/* Shadow at top */}
        <div
          className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#d6d3cd]/60 dark:from-[#111]/60 to-transparent pointer-events-none z-30 hidden lg:block"
        />

        {/* Clip container - hides content above the visible area */}
        <div className="absolute inset-0 overflow-visible lg:overflow-hidden">
          {/* Scrollable inner container */}
          <div
            ref={scrollRef}
            className="h-auto lg:h-full overflow-visible lg:overflow-y-auto overflow-x-hidden flex justify-center"
          >
            <div className="w-full max-w-[332px] px-6 lg:px-0">
              {/* All receipts - newest first */}
              <AnimatePresence initial={false} mode="popLayout">
                {displayCandles.map((candle, index) => {
                  const receiptNumber = completedCandles.length - posReceiptLimit - index;
                  return (
                    <motion.div
                      key={candle.id}
                      layout
                      // Outer wrapper handles space creation (height)
                      initial={{ height: 0, opacity: 1 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0, transition: { duration: 0.3, ease: "easeInOut" } }}
                      transition={{
                        layout: { duration: currentSpeed.duration, ease: "linear" },
                        height: { duration: currentSpeed.duration, ease: "linear" },
                      }}
                      className="mb-0 relative z-10 overflow-hidden"
                    >
                      {/* Inner wrapper handles the slide down effect */}
                      <motion.div
                        initial={{ y: '-100%' }}
                        animate={{ y: '0%' }}
                        transition={{
                          duration: currentSpeed.duration,
                          ease: "linear"
                        }}
                      >
                        <div className="bg-[#fffdf5] dark:bg-[#e8e8e0] relative z-10 shadow-sm">
                          <CandleReceipt
                            candle={candle}
                            receiptNumber={receiptNumber}
                            isExpanded={getExpanded(candle.id)}
                            onToggleExpand={(expanded) => setExpanded(candle.id, expanded)}
                          />
                        </div>
                        {/* Torn edge only after Receipt #1 (the first receipt of the session) */}
                        {receiptNumber === 1 && (
                          <div className="h-4 torn-edge-bottom relative z-0" />
                        )}
                      </motion.div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Bottom spacing for scroll */}
              <div className="h-12" />
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#d6d3cd]/60 dark:from-[#111]/60 to-transparent z-20 pointer-events-none" />
      </div>
    </section>
  );
}

