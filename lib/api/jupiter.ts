// Jupiter Token API service for token metadata
// Docs: https://station.jup.ag/docs/utility/token-api

const JUPITER_API_BASE = 'https://api.jup.ag/tokens/v1';

export interface JupiterTokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string | null;
  tags?: string[];
  daily_volume?: number;
  created_at?: string;
  freeze_authority?: string | null;
  mint_authority?: string | null;
  permanent_delegate?: string | null;
  minted_at?: string | null;
  extensions?: {
    coingeckoId?: string;
  };
}

/**
 * Get detailed token information by mint address
 */
export async function getTokenInfo(mintAddress: string): Promise<JupiterTokenInfo | null> {
  if (!mintAddress) {
    return null;
  }

  try {
    const response = await fetch(`${JUPITER_API_BASE}/token/${mintAddress}`);

    if (!response.ok) {
      // Token not found (404) or unauthorized (401) - silently fall back to DexScreener data
      // This is expected for new tokens, pump.fun tokens, etc.
      return null;
    }

    return await response.json();
  } catch {
    // Network errors - silently fall back to DexScreener data
    return null;
  }
}

/**
 * Validate if a string looks like a Solana address (base58, ~32-44 chars)
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;

  // Base58 characters (excluding 0, O, I, l)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}
