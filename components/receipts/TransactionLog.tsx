'use client';

import { useCandleStore } from '@/stores/candleStore';
import { useTokenStore } from '@/stores/tokenStore';
import { ANIMATION_SPEEDS, useUIStore } from '@/stores/uiStore';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { CandleReceipt } from './CandleReceipt';
import { TokenIntroReceipt } from './TokenIntroReceipt';


export function TransactionLog() {
  const completedCandles = useCandleStore((state) => state.completedCandles);
  const animationSpeedIndex = useUIStore((state) => state.animationSpeedIndex);
  const showTestReceipt = useUIStore((state) => state.showTestReceipt);
  const showTokenIntro = useUIStore((state) => state.showTokenIntro);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep rendering test receipt area during exit animation (syncs with POSTerminal)
  const [shouldRenderTestReceipt, setShouldRenderTestReceipt] = useState(showTestReceipt);
  useEffect(() => {
    if (!showTestReceipt && shouldRenderTestReceipt) {
      // Store says hide, but keep blocking for exit animation duration
      const timer = setTimeout(() => {
        setShouldRenderTestReceipt(false);
      }, 2000); // Match POSTerminal exit animation duration
      return () => clearTimeout(timer);
    } else if (showTestReceipt && !shouldRenderTestReceipt) {
      setShouldRenderTestReceipt(true);
    }
  }, [showTestReceipt, shouldRenderTestReceipt]);

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
              {/* Token Intro + Receipts - only show when test receipt exit animation is done */}
              {!shouldRenderTestReceipt && (
                <AnimatePresence mode="popLayout">
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
                    {(showTokenIntro || displayCandles.length > 0) && (
                      <motion.div
                        className="h-4 torn-edge-top w-full absolute -top-4 left-0 z-20"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0 }}
                        exit={{ opacity: 1, transition: { duration: 0 } }}
                      />
                    )}

                    {/* Regular Receipts - print on top of intro (newest first) */}
                    {displayCandles.map((candle, index) => {
                      const receiptNumber = completedCandles.length - index;
                      // Only show torn edge on first receipt if there's no token intro below it
                      const showTornEdge = receiptNumber === 1 && !showTokenIntro;
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
                                isFirst={showTornEdge}
                                showSignature
                              />
                            </div>
                          </motion.div>
                        </motion.div>
                      );
                    })}

                    {/* Token Intro - prints first, appears at bottom as receipts stack on top */}
                    {showTokenIntro && (
                      <motion.div
                        key="token-intro-log"
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
                        className="mb-0 relative z-10 overflow-hidden origin-top"
                      >
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
                            <TokenIntroReceipt />
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}

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
