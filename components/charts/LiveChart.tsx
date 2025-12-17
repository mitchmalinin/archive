'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeries } from 'lightweight-charts';
import { useTokenStore } from '@/stores/tokenStore';
import { useUIStore, getSolanaTrackerTimeframe } from '@/stores/uiStore';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface LiveChartProps {
  onNewCandle?: (completedCandle: CandleData, newCandle: CandleData) => void;
}

async function fetchCandles(tokenAddress: string, timeframe: string): Promise<CandleData[]> {
  try {
    const response = await fetch(`/api/chart/${tokenAddress}?type=${timeframe}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.candles || [];
  } catch (error) {
    console.error('[LiveChart] Fetch error:', error);
    return [];
  }
}

export function LiveChart({ onNewCandle }: LiveChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lastCandleCountRef = useRef<number>(0);
  const lastCandleTimeRef = useRef<number>(0);
  const previousCandlesRef = useRef<CandleData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);

  const selectedToken = useTokenStore((state) => state.selectedToken);
  const chartTimeframe = useUIStore((state) => state.chartTimeframe);

  // Use token address for Solana Tracker API (it expects token mint, not pool address)
  const chartAddress = selectedToken?.address;

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'rgba(255, 255, 255, 0.3)',
          width: 1,
          style: 2,
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.3)',
          width: 1,
          style: 2,
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        scaleMargins: {
          top: 0.2,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: true,
      },
      handleScale: false,
      handleScroll: false,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;

    // Handle resize
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Fetch and update candles
  const updateCandles = useCallback(async () => {
    if (!chartAddress || !seriesRef.current) return;

    const timeframe = getSolanaTrackerTimeframe(chartTimeframe);
    const candles = await fetchCandles(chartAddress, timeframe);

    if (candles.length === 0) return;

    // Sort by time and convert to lightweight-charts format
    const sortedCandles = [...candles].sort((a, b) => a.time - b.time);

    const chartData: CandlestickData[] = sortedCandles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    seriesRef.current.setData(chartData);

    // Get the latest candle
    const latestCandle = sortedCandles[sortedCandles.length - 1];
    const isInitialLoad = lastCandleTimeRef.current === 0;

    // Detect new candle by timestamp change (not count)
    const hasNewCandle = latestCandle && latestCandle.time > lastCandleTimeRef.current;

    // If new candle detected and not initial load, trigger callback
    if (hasNewCandle && !isInitialLoad && onNewCandle) {
      // The completed candle is the second-to-last (or the one we were tracking)
      const completedCandle = sortedCandles[sortedCandles.length - 2];

      if (completedCandle) {
        console.log('[LiveChart] NEW CANDLE DETECTED!', {
          previousTime: new Date(lastCandleTimeRef.current * 1000).toISOString(),
          newTime: new Date(latestCandle.time * 1000).toISOString(),
          completedCandle: completedCandle,
        });

        // Call the callback with the completed candle
        onNewCandle(completedCandle, latestCandle);
      }
    }

    // Update tracking refs
    if (latestCandle) {
      lastCandleTimeRef.current = latestCandle.time;
    }
    previousCandlesRef.current = sortedCandles;

    // Only adjust visible range on initial load or when new candles are added
    const candleCount = chartData.length;
    const shouldAdjustRange = lastCandleCountRef.current === 0 || candleCount > lastCandleCountRef.current;

    if (chartRef.current && chartData.length > 0 && shouldAdjustRange) {
      const timeScale = chartRef.current.timeScale();
      const lastIndex = chartData.length - 1;
      const firstVisibleIndex = Math.max(0, lastIndex - 14);

      // Set visible range to last 15 candles with some padding on the right for the current candle
      timeScale.setVisibleLogicalRange({
        from: firstVisibleIndex - 0.5,
        to: lastIndex + 2, // Extra space on right to see current candle building
      });

      lastCandleCountRef.current = candleCount;
    }

    // Update current price
    if (latestCandle) {
      setCurrentPrice(latestCandle.close);

      // Calculate price change from first visible candle
      const firstCandle = sortedCandles[Math.max(0, sortedCandles.length - 30)];
      if (firstCandle && firstCandle.open > 0) {
        const change = ((latestCandle.close - firstCandle.open) / firstCandle.open) * 100;
        setPriceChange(change);
      }
    }
  }, [chartAddress, chartTimeframe, onNewCandle]);

  // Reset tracking refs when token/pair/timeframe changes
  useEffect(() => {
    lastCandleCountRef.current = 0;
    lastCandleTimeRef.current = 0;
    previousCandlesRef.current = [];
  }, [chartAddress, chartTimeframe]);

  // Initial load and polling
  useEffect(() => {
    if (!chartAddress) return;

    // Initial fetch
    updateCandles();

    // Poll every 2 seconds for real-time candle updates
    const interval = setInterval(updateCandles, 2000);

    return () => clearInterval(interval);
  }, [chartAddress, chartTimeframe, updateCandles]);

  // Format price for display
  const formatPrice = (price: number): string => {
    if (price >= 1) return price.toFixed(4);
    if (price >= 0.0001) return price.toFixed(6);
    return price.toExponential(4);
  };

  return (
    <div className="relative w-full h-full bg-black rounded overflow-hidden">
      {/* Top overlay - price on left, timeframe on right */}
      <div className="absolute top-2 left-2 right-2 z-10 flex justify-between items-start">
        {/* Left: Ticker + Price + % change */}
        {currentPrice !== null && (
          <div className="font-mono text-sm">
            <span className="text-gray-400 text-xs mr-2">{(selectedToken?.symbol || 'TOKEN').toUpperCase()}</span>
            <span className="text-white font-bold">${formatPrice(currentPrice)}</span>
            <span className={`ml-2 ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
          </div>
        )}

        {/* Right: Timeframe badge */}
        <div className="bg-green-500/20 border border-green-500/50 px-2 py-0.5 rounded">
          <span className="text-green-400 font-mono text-xs font-bold">{chartTimeframe.toUpperCase()}</span>
        </div>
      </div>

      {/* Chart container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading state */}
      {!selectedToken && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          Select a token to view chart
        </div>
      )}
    </div>
  );
}
