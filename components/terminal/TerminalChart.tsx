'use client';

import { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, CandlestickSeries, Time } from 'lightweight-charts';
import { useCandleStore } from '@/stores/candleStore';

export function TerminalChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const chartData = useCandleStore((state) => state.chartData);
  const currentCandle = useCandleStore((state) => state.currentCandle);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#22c55e',
        fontSize: 10,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(34, 197, 94, 0.1)' },
        horzLines: { color: 'rgba(34, 197, 94, 0.1)' },
      },
      crosshair: {
        mode: 0,
        vertLine: {
          color: 'rgba(34, 197, 94, 0.3)',
          width: 1,
          style: 2,
        },
        horzLine: {
          color: 'rgba(34, 197, 94, 0.3)',
          width: 1,
          style: 2,
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(34, 197, 94, 0.2)',
        textColor: '#22c55e',
      },
      timeScale: {
        borderColor: 'rgba(34, 197, 94, 0.2)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 3, // Space on the right for the current candle to grow
        barSpacing: 8, // Wider bars for better visibility
      },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      borderVisible: false,
    });

    seriesRef.current = series;

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
    };
  }, []);

  // Single effect to update all chart data (completed + current candle)
  // Using setData instead of update to avoid "cannot update oldest data" errors
  useEffect(() => {
    if (!seriesRef.current) return;

    // Start with completed candles
    const allData: Array<{ time: number; open: number; high: number; low: number; close: number }> =
      chartData.map(c => ({ ...c }));

    // Add current candle if it has trades
    if (currentCandle && currentCandle.tradeCount > 0) {
      const currentTime = Math.floor(currentCandle.startTime / 1000);
      const currentCandleData = {
        time: currentTime,
        open: currentCandle.open,
        high: currentCandle.high,
        low: currentCandle.low === Infinity ? currentCandle.open : currentCandle.low,
        close: currentCandle.close,
      };

      // Check if this time already exists (replace) or is new (add)
      const existingIdx = allData.findIndex(c => c.time === currentTime);
      if (existingIdx >= 0) {
        allData[existingIdx] = currentCandleData;
      } else {
        allData.push(currentCandleData);
      }
    }

    if (allData.length === 0) return;

    // Sort by time ascending
    allData.sort((a, b) => a.time - b.time);

    // Deduplicate - keep only the last entry for each timestamp
    const deduped = allData.filter((candle, i, arr) =>
      i === arr.length - 1 || candle.time !== arr[i + 1].time
    );

    const formattedData: CandlestickData<Time>[] = deduped.map((candle) => ({
      time: candle.time as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    seriesRef.current.setData(formattedData);

    // Zoom in to show only the last ~15 candles for extreme close-up of current action
    if (chartRef.current && formattedData.length > 0) {
      const visibleCandles = 15;
      const startIndex = Math.max(0, formattedData.length - visibleCandles);
      const from = formattedData[startIndex].time;
      const to = formattedData[formattedData.length - 1].time;

      chartRef.current.timeScale().setVisibleRange({ from, to });
    }
  }, [chartData, currentCandle]);

  return (
    <div ref={containerRef} className="w-full h-full" />
  );
}
