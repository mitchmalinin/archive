'use client'

import { formatPrice } from '@/lib/utils';
import { useCandleStore } from '@/stores/candleStore';
import { useReceiptStore } from '@/stores/receiptStore';
import { useUIStore } from '@/stores/uiStore';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function DesktopFloatingBar() {
  const { currentCandle } = useCandleStore();
  const { summaryCount } = useReceiptStore();
  
  // Local timer state to ensure smooth updates
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      if (!currentCandle) return;
      const now = Date.now();
      const end = currentCandle.endTime;
      const remaining = Math.max(0, Math.floor((end - now) / 1000));
      setSecondsRemaining(remaining);
    };

    updateTimer(); // Initial update
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentCandle]);

  const change = currentCandle && currentCandle.tradeCount > 0
    ? ((currentCandle.close - currentCandle.open) / currentCandle.open) * 100
    : 0;
  const isPositive = change >= 0;

  return (
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 w-[380px] pointer-events-auto"
    >
      {/* Main Stats Bar */}
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-5 shadow-2xl relative overflow-hidden group">
        {/* Scanline effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 pointer-events-none bg-[length:100%_4px,3px_100%]" />
        
        {/* Header Row */}
        <div className="flex justify-between items-center mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <span className="font-mono text-sm text-gray-200 tracking-wider font-bold">
              RECORDING #{String(summaryCount + 1).padStart(6, '0')}
            </span>
          </div>
          <div className="font-mono text-sm text-gray-400 font-bold tabular-nums bg-gray-900/50 px-2 py-0.5 rounded border border-gray-800">
            {String(Math.floor(secondsRemaining / 60)).padStart(2, '0')}:{String(secondsRemaining % 60).padStart(2, '0')}
          </div>
        </div>

        {/* Price Row */}
        <div className="flex justify-between items-end relative z-10 mb-2">
          <div className="font-mono text-3xl font-bold text-white tracking-tight">
            {currentCandle ? formatPrice(currentCandle.close) : '$0.000000'}
          </div>
          <div className={`font-mono text-base font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{change.toFixed(2)}%
          </div>
        </div>

        {/* Mini Stats Grid */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-800/50 relative z-10">
          <div className="text-center">
            <div className="text-[10px] text-gray-500 font-mono mb-1">TRADES</div>
            <div className="text-xs text-white font-mono font-bold">{currentCandle?.tradeCount || 0}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-gray-500 font-mono mb-1">BUYS</div>
            <div className="text-xs text-green-500 font-mono font-bold">{currentCandle?.buyCount || 0}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-gray-500 font-mono mb-1">SELLS</div>
            <div className="text-xs text-red-500 font-mono font-bold">{currentCandle?.sellCount || 0}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-gray-500 font-mono mb-1">VOL</div>
            <div className="text-xs text-blue-400 font-mono font-bold">{currentCandle?.volume.toFixed(2) || '0.00'}</div>
          </div>
        </div>
      </div>

      {/* Token Input Bar */}
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-1 shadow-xl flex items-center gap-2 relative overflow-hidden">
        <div className="absolute inset-0 bg-green-500/5 pointer-events-none" />
        <div className="bg-gray-900/50 rounded px-2 py-1.5 ml-1">
          <span className="font-mono text-[10px] text-green-500 font-bold">CA:</span>
        </div>
        <input 
          type="text" 
          placeholder="Enter token address..."
          className="bg-transparent border-none outline-none text-xs font-mono text-gray-300 w-full placeholder:text-gray-700"
          readOnly
        />
        <button className="bg-green-600 hover:bg-green-500 text-black text-[10px] font-bold px-3 py-1.5 rounded transition-colors">
          LOAD
        </button>
      </div>
    </motion.div>
  );
}
