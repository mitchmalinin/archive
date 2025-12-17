// DexScreener API service for token search and price data
// Docs: https://docs.dexscreener.com/api/reference

const DEXSCREENER_API_BASE = 'https://api.dexscreener.com';

// Types for DexScreener API responses
export interface DexToken {
  address: string;
  name: string;
  symbol: string;
}

export interface DexPairTxns {
  buys: number;
  sells: number;
}

export interface DexPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: DexToken;
  quoteToken: { symbol: string; address?: string };
  priceNative: string;
  priceUsd: string;
  txns: {
    m5: DexPairTxns;
    h1: DexPairTxns;
    h6: DexPairTxns;
    h24: DexPairTxns;
  };
  volume: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity?: {
    usd?: number;
    base: number;
    quote: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
}

interface SearchResponse {
  schemaVersion: string;
  pairs: DexPair[];
}

interface TokenPairsResponse {
  schemaVersion: string;
  pairs: DexPair[];
}

/**
 * Search for tokens/pairs by name, symbol, or address
 * Rate limit: 300 requests per minute
 * Returns deduplicated results (one pair per token, best liquidity)
 */
export async function searchTokens(query: string): Promise<DexPair[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const response = await fetch(
      `${DEXSCREENER_API_BASE}/latest/dex/search?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error(`DexScreener search failed: ${response.status}`);
    }

    const data: SearchResponse = await response.json();

    // Filter to only Solana pairs
    const solanaPairs = (data.pairs || []).filter(pair => pair.chainId === 'solana');

    // Deduplicate by token address - keep only the best pair per token
    const tokenMap = new Map<string, DexPair>();
    for (const pair of solanaPairs) {
      const tokenAddr = pair.baseToken.address;
      const existing = tokenMap.get(tokenAddr);

      if (!existing) {
        tokenMap.set(tokenAddr, pair);
      } else {
        // Keep the one with higher liquidity
        const existingLiq = existing.liquidity?.usd || 0;
        const newLiq = pair.liquidity?.usd || 0;
        if (newLiq > existingLiq) {
          tokenMap.set(tokenAddr, pair);
        }
      }
    }

    return Array.from(tokenMap.values());
  } catch (error) {
    console.error('DexScreener search error:', error);
    return [];
  }
}

/**
 * Get all trading pairs for a specific token on Solana
 * Rate limit: 300 requests per minute
 */
export async function getTokenPairs(tokenAddress: string): Promise<DexPair[]> {
  if (!tokenAddress) {
    return [];
  }

  try {
    const response = await fetch(
      `${DEXSCREENER_API_BASE}/token-pairs/v1/solana/${tokenAddress}`
    );

    if (!response.ok) {
      throw new Error(`DexScreener token pairs failed: ${response.status}`);
    }

    const data = await response.json();
    // API returns array directly for v1 endpoint
    return Array.isArray(data) ? data : (data.pairs || []);
  } catch (error) {
    console.error('DexScreener token pairs error:', error);
    return [];
  }
}

/**
 * Get pair data by pair address
 * Rate limit: 300 requests per minute
 */
export async function getPairData(pairAddress: string): Promise<DexPair | null> {
  if (!pairAddress) {
    return null;
  }

  try {
    const response = await fetch(
      `${DEXSCREENER_API_BASE}/latest/dex/pairs/solana/${pairAddress}`
    );

    if (!response.ok) {
      throw new Error(`DexScreener pair data failed: ${response.status}`);
    }

    const data = await response.json();
    return data.pairs?.[0] || data.pair || null;
  } catch (error) {
    console.error('DexScreener pair data error:', error);
    return null;
  }
}

/**
 * Get the best pair for a token (highest liquidity)
 */
export function getBestPair(pairs: DexPair[]): DexPair | null {
  if (!pairs.length) return null;

  // Sort by liquidity (USD) descending, then by volume
  return pairs.sort((a, b) => {
    const liquidityA = a.liquidity?.usd || 0;
    const liquidityB = b.liquidity?.usd || 0;
    if (liquidityA !== liquidityB) {
      return liquidityB - liquidityA;
    }
    return (b.volume?.h24 || 0) - (a.volume?.h24 || 0);
  })[0];
}

// Boosted token response type
export interface BoostedToken {
  url: string;
  chainId: string;
  tokenAddress: string;
  icon?: string;
  header?: string;
  openGraph?: string;
  description?: string;
  links?: Array<{ type: string; label: string; url: string }>;
  totalAmount?: number;
  amount?: number;
}

/**
 * Get trending/boosted tokens from DexScreener
 * Rate limit: 60 requests per minute
 */
export async function getTrendingTokens(): Promise<DexPair[]> {
  try {
    // Get top boosted tokens
    const response = await fetch(`${DEXSCREENER_API_BASE}/token-boosts/top/v1`);

    if (!response.ok) {
      throw new Error(`DexScreener trending failed: ${response.status}`);
    }

    const boostedTokens: BoostedToken[] = await response.json();

    // Filter to Solana only and get first 10
    const solanaTokens = boostedTokens
      .filter(t => t.chainId === 'solana')
      .slice(0, 10);

    if (solanaTokens.length === 0) {
      return [];
    }

    // Fetch pair data for each token
    const pairPromises = solanaTokens.map(async (token) => {
      try {
        const pairs = await getTokenPairs(token.tokenAddress);
        return getBestPair(pairs);
      } catch {
        return null;
      }
    });

    const pairs = await Promise.all(pairPromises);
    return pairs.filter((p): p is DexPair => p !== null);
  } catch (error) {
    console.error('DexScreener trending error:', error);
    return [];
  }
}
