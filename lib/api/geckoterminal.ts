// GeckoTerminal API for OHLCV candle data
// Docs: https://www.geckoterminal.com/dex-api

const GECKO_API_BASE = 'https://api.geckoterminal.com/api/v2';

// OHLCV response types
interface GeckoOHLCVData {
  id: string;
  type: string;
  attributes: {
    ohlcv_list: [number, number, number, number, number, number][]; // [timestamp, open, high, low, close, volume]
  };
}

interface GeckoOHLCVResponse {
  data: GeckoOHLCVData;
}

// Pool info response
interface GeckoPoolData {
  id: string;
  type: string;
  attributes: {
    name: string;
    address: string;
    base_token_price_usd: string;
    quote_token_price_usd: string;
    base_token_price_native_currency: string;
    fdv_usd: string;
    market_cap_usd: string;
    price_change_percentage: {
      h1: string;
      h24: string;
    };
    transactions: {
      h1: { buys: number; sells: number; buyers: number; sellers: number };
      h24: { buys: number; sells: number; buyers: number; sellers: number };
    };
    volume_usd: {
      h1: string;
      h24: string;
    };
  };
  relationships: {
    base_token: { data: { id: string } };
    quote_token: { data: { id: string } };
    dex: { data: { id: string } };
  };
}

interface GeckoPoolsResponse {
  data: GeckoPoolData[];
}

export interface OHLCVCandle {
  timestamp: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Get top pools for a token on Solana
 */
export async function getTokenPools(tokenAddress: string): Promise<GeckoPoolData[]> {
  try {
    const response = await fetch(
      `${GECKO_API_BASE}/networks/solana/tokens/${tokenAddress}/pools?page=1`
    );

    if (!response.ok) {
      console.error('GeckoTerminal pools error:', response.status);
      return [];
    }

    const data: GeckoPoolsResponse = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('GeckoTerminal pools error:', error);
    return [];
  }
}

/**
 * Get OHLCV candle data for a pool
 * @param poolAddress - The pool/pair address
 * @param timeframe - minute, hour, day
 * @param aggregate - Number of units to aggregate (e.g., 1, 5, 15 for minutes)
 * @param limit - Number of candles to fetch (max 1000)
 */
export async function getPoolOHLCV(
  poolAddress: string,
  timeframe: 'minute' | 'hour' | 'day' = 'minute',
  aggregate: number = 1,
  limit: number = 100
): Promise<OHLCVCandle[]> {
  try {
    const response = await fetch(
      `${GECKO_API_BASE}/networks/solana/pools/${poolAddress}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${limit}&currency=usd`
    );

    if (!response.ok) {
      console.error('GeckoTerminal OHLCV error:', response.status);
      return [];
    }

    const data: GeckoOHLCVResponse = await response.json();
    const ohlcvList = data.data?.attributes?.ohlcv_list || [];

    // Convert to our format [timestamp, open, high, low, close, volume]
    return ohlcvList.map(([timestamp, open, high, low, close, volume]) => ({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    }));
  } catch (error) {
    console.error('GeckoTerminal OHLCV error:', error);
    return [];
  }
}

/**
 * Get OHLCV data for a token by finding its best pool first
 */
export async function getTokenOHLCV(
  tokenAddress: string,
  timeframe: 'minute' | 'hour' | 'day' = 'minute',
  aggregate: number = 1,
  limit: number = 100
): Promise<{ candles: OHLCVCandle[]; poolAddress: string | null }> {
  // First get the token's pools
  const pools = await getTokenPools(tokenAddress);

  if (pools.length === 0) {
    return { candles: [], poolAddress: null };
  }

  // Use the first pool (usually highest liquidity)
  const bestPool = pools[0];
  const poolAddress = bestPool.attributes.address;

  // Get OHLCV for the pool
  const candles = await getPoolOHLCV(poolAddress, timeframe, aggregate, limit);

  return { candles, poolAddress };
}

/**
 * Convert GeckoTerminal OHLCV to our ChartCandle format
 */
export function convertToChartCandles(ohlcv: OHLCVCandle[]): Array<{
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}> {
  return ohlcv
    .map((candle) => ({
      time: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }))
    .sort((a, b) => a.time - b.time); // Ensure chronological order
}
