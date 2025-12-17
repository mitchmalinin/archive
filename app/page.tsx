'use client';

import { DesktopFloatingBar } from '@/components/layout/DesktopFloatingBar';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { MobileFloatingBar } from '@/components/layout/MobileFloatingBar';
import { TransactionLog } from '@/components/receipts/TransactionLog';
import { POSTerminal } from '@/components/terminal/POSTerminal';
import { useLiveTokenData } from '@/hooks/useLiveTokenData';
import { useSolanaTrackerData } from '@/hooks/useSolanaTrackerData';
import { useCandleStore } from '@/stores/candleStore';
import { useReceiptStore } from '@/stores/receiptStore';
import { useTokenStore } from '@/stores/tokenStore';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

function HomeContent() {
  const [isDark, setIsDark] = useState(true);
  const resetReceipts = useReceiptStore((state) => state.reset);
  const resetCandles = useCandleStore((state) => state.reset);
  const selectedToken = useTokenStore((state) => state.selectedToken);
  const loadToken = useTokenStore((state) => state.loadToken);
  const searchParams = useSearchParams();
  const hasLoadedFromUrl = useRef(false);

  // Clear all data on page refresh - start fresh each time
  useEffect(() => {
    resetReceipts();
    resetCandles();
  }, [resetReceipts, resetCandles]);

  // Load token from URL parameter on mount
  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam && !hasLoadedFromUrl.current) {
      hasLoadedFromUrl.current = true;
      loadToken(tokenParam);
    }
  }, [searchParams, loadToken]);

  // Update URL when token changes
  useEffect(() => {
    if (selectedToken) {
      const url = new URL(window.location.href);
      url.searchParams.set('token', selectedToken.address);
      window.history.replaceState({}, '', url.toString());
    }
  }, [selectedToken]);

  // Update page title based on selected token
  useEffect(() => {
    if (selectedToken) {
      document.title = `$${selectedToken.symbol.toUpperCase()} | Meme Receipts`;
    } else {
      document.title = 'Meme Receipts';
    }
  }, [selectedToken]);

  // Initialize hooks for live data
  // Live token data - DexScreener polling for price updates only
  useLiveTokenData();
  // Solana Tracker - Real-time candle data and receipt generation
  useSolanaTrackerData();
  // Note: Trade fetching is now handled on-demand in TerminalScreen
  // via useTradeSnapshot hook (fetches at candle completion, not continuous polling)

  // Handle dark mode toggle
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Set dark mode by default on mount
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleToggleDarkMode = () => {
    setIsDark(!isDark);
  };

  return (
    <div className="bg-gray-100 dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-300 min-h-screen lg:h-screen flex flex-col transition-colors duration-300 antialiased lg:overflow-hidden">
      {/* Header */}
      <div className="hidden lg:block">
        <Header onToggleDarkMode={handleToggleDarkMode} />
      </div>

      {/* Main Content */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-visible lg:overflow-hidden min-h-0 relative">
        {/* Desktop Floating Bar - Centered */}
        <div className="hidden lg:block absolute inset-0 pointer-events-none z-50">
          <DesktopFloatingBar />
        </div>

        {/* Mobile Floating Bar */}
        <div className="lg:hidden absolute inset-0 pointer-events-none z-50">
          <MobileFloatingBar />
        </div>

        {/* Left Panel - POS Terminal with Receipt Output */}
        <section className="border-r border-gray-300 dark:border-gray-800 flex flex-col bg-[#e5e5e5] dark:bg-[#050505] relative z-30 items-center overflow-visible lg:overflow-hidden justify-start pt-8 lg:pt-4 pr-0 lg:pr-32">
          {/* Dot pattern background */}
          <div className="absolute inset-0 opacity-5 pointer-events-none z-0 dot-pattern" />

          {/* Terminal with receipt output - flex-1 to fill remaining height */}
          <div className="relative z-10 w-full max-w-[320px] lg:max-w-[380px] px-4 h-auto lg:flex-1 lg:min-h-0 flex flex-col">
            <POSTerminal />
          </div>
        </section>

        {/* Right Panel - Transaction Log */}
        <TransactionLog />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="bg-[#0a0a0a] min-h-screen" />}>
      <HomeContent />
    </Suspense>
  );
}
