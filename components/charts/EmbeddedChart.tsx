'use client';

interface EmbeddedChartProps {
  tokenAddress: string;
  chain?: string;
}

/**
 * Embedded real-time chart from GeckoTerminal
 * Clean, minimal chart with accurate real-time price data
 */
export function EmbeddedChart({ tokenAddress, chain = 'solana' }: EmbeddedChartProps) {
  // GeckoTerminal embed - ultra clean chart view
  // embed=1, info=0, swaps=0 - minimal mode
  // resolution=30S for 30-second candles
  // grayscale=0, chart_left_toolbar=hidden, chart_top_toolbar=hidden
  const chartUrl = `https://www.geckoterminal.com/${chain}/pools/${tokenAddress}?embed=1&info=0&swaps=0&resolution=30S&grayscale=0&chart_left_toolbar=hidden&chart_top_toolbar=hidden`;

  return (
    <iframe
      src={chartUrl}
      width="100%"
      height="100%"
      frameBorder="0"
      allowFullScreen
      className="bg-black"
      title="Token Price Chart"
      style={{ border: 'none' }}
    />
  );
}
