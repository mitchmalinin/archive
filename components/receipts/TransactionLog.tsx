'use client';

import { useCandleStore } from '@/stores/candleStore';
import { useTokenStore } from '@/stores/tokenStore';
import { ANIMATION_SPEEDS, useUIStore } from '@/stores/uiStore';
import { AnimatePresence, motion } from 'framer-motion';
import { useRef } from 'react';
import { CandleReceipt } from './CandleReceipt';


export function TransactionLog() {
  const completedCandles = useCandleStore((state) => state.completedCandles);
  const animationSpeedIndex = useUIStore((state) => state.animationSpeedIndex);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Show all candles - they print simultaneously on both sides
  const displayCandles = [...completedCandles].reverse();

  const currentSpeed = ANIMATION_SPEEDS[animationSpeedIndex];

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
            <div className="w-full max-w-[300px] px-6 lg:px-0">
              {/* All receipts - newest first */}
              <AnimatePresence initial={false} mode="popLayout">
                <motion.div
                  key={useTokenStore.getState().selectedToken?.address || 'empty'}
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                  exit={{
                    y: 1200,
                    opacity: 1,
                    transition: { duration: 2, ease: [0.4, 0, 1, 1] },
                  }}
                  className="relative z-10"
                >
                  {/* Torn top edge - visible on exit */}
                  {displayCandles.length > 0 && (
                    <motion.div
                      className="h-4 torn-edge-top w-full absolute -top-4 left-0 z-20"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0 }}
                      exit={{ opacity: 1, transition: { duration: 0 } }}
                    />
                  )}
                  {displayCandles.map((candle, index) => {
                    const receiptNumber = completedCandles.length - index;
                    return (
                      <motion.div
                        key={candle.id}
                        layout
                        initial="initial"
                        animate="animate"
                        variants={{
                          initial: { height: 0, opacity: 1 },
                          animate: { height: 'auto', opacity: 1 },
                        }}
                        transition={{
                          layout: { duration: currentSpeed.duration, ease: "linear" },
                          height: { duration: currentSpeed.duration, ease: "linear" },
                        }}
                        className="mb-0 relative z-10 overflow-hidden origin-top -mb-[2px]"
                      >
                        {/* Inner wrapper handles the slide down effect */}
                        <motion.div
                          variants={{
                            initial: { y: '-100%' },
                            animate: { y: '0%' },
                          }}
                          transition={{
                            duration: currentSpeed.duration,
                            ease: "linear"
                          }}
                        >
                          <div className="relative z-10 shadow-sm">
                            <CandleReceipt
                              candle={candle}
                              receiptNumber={receiptNumber}
                              isFirst={receiptNumber === 1}
                              showSignature
                            />
                          </div>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </motion.div>
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

