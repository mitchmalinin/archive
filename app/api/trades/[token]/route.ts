import { NextRequest, NextResponse } from 'next/server';

// Helius Enhanced API (available on free tier - 2 req/s, 1M credits/month)
const HELIUS_API = 'https://api.helius.xyz/v0';

// Wrapped SOL mint address - many swaps use WSOL instead of native SOL
const WSOL_MINT = 'So11111111111111111111111111111111111111112';

interface TokenTransfer {
  userAccount: string;
  tokenAccount: string;
  rawTokenAmount: {
    tokenAmount: string;
    decimals: number;
  };
  mint: string;
}

interface HeliusSwapEvent {
  nativeInput?: {
    account: string;
    amount: string;
  };
  nativeOutput?: {
    account: string;
    amount: string;
  };
  tokenInputs: TokenTransfer[];
  tokenOutputs: TokenTransfer[];
  innerSwaps?: Array<{
    tokenInputs: TokenTransfer[];
    tokenOutputs: TokenTransfer[];
    programInfo: {
      source: string;
      account: string;
    };
  }>;
}

// Token transfer from Helius tokenTransfers array (different structure)
interface HeliusTokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  fromTokenAccount: string;
  toTokenAccount: string;
  tokenAmount: number;
  mint: string;
  tokenStandard: string;
}

interface HeliusTransaction {
  signature: string;
  timestamp: number;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  events?: {
    swap?: HeliusSwapEvent;
  };
  tokenTransfers?: HeliusTokenTransfer[];
}

interface ParsedTrade {
  signature: string;
  timestamp: number;
  wallet: string;
  side: 'buy' | 'sell';
  tokenAmount: number;
  solAmount: number;
  price: number;
  source: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 100);
  // Pool address is more reliable for fetching swaps - swaps happen on pools, not token mints
  const poolAddress = searchParams.get('pool') || token;

  // Get API key from environment
  const apiKey = process.env.HELIUS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Helius API key not configured' },
      { status: 500 }
    );
  }

  try {
    // Fetch SWAP type transactions for the pool address (more reliable than token mint)
    // The pool is where swaps actually happen
    const url = `${HELIUS_API}/addresses/${poolAddress}/transactions?api-key=${apiKey}&limit=${limit}&type=SWAP`;

    console.log(`[Helius] Fetching swaps for pool: ${poolAddress}, token: ${token}`);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      // Disable caching - we need fresh data every time
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Helius] API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Helius API error: ${response.status}` },
        { status: response.status }
      );
    }

    const transactions: HeliusTransaction[] = await response.json();

    console.log(`[Helius] Fetched ${transactions.length} transactions for token ${token}`);

    // Log first transaction for debugging
    if (transactions.length > 0) {
      console.log('[Helius] First transaction type:', transactions[0].type, 'source:', transactions[0].source);
      console.log('[Helius] Has swap event:', !!transactions[0].events?.swap);
      console.log('[Helius] Has tokenTransfers:', !!transactions[0].tokenTransfers?.length);
    }

    // Parse transactions into trades
    const trades: ParsedTrade[] = [];

    for (const tx of transactions) {
      const swap = tx.events?.swap;

      // Try to parse from events.swap first (traditional DEXes)
      if (swap) {
        const trade = parseFromSwapEvent(tx, swap, token);
        if (trade) {
          trades.push(trade);
          continue;
        }
      }

      // Fallback: Parse from tokenTransfers (PUMP_AMM and others without swap events)
      if (tx.tokenTransfers?.length) {
        const trade = parseFromTokenTransfers(tx, token, poolAddress);
        if (trade) {
          trades.push(trade);
        }
      }
    }

    console.log(`[Helius] Parsed ${trades.length} trades from ${transactions.length} transactions`);

    return NextResponse.json({
      trades,
      count: trades.length,
      token,
    });

  } catch (error) {
    console.error('[Helius] Fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trade data' },
      { status: 500 }
    );
  }
}

/**
 * Parse trade from events.swap (traditional DEX swaps)
 */
function parseFromSwapEvent(
  tx: HeliusTransaction,
  swap: HeliusSwapEvent,
  token: string
): ParsedTrade | null {
  // Helper to find SOL/WSOL amount from token transfers
  const findSolInTokens = (tokens: TokenTransfer[]): number => {
    const wsol = tokens.find(t => t.mint === WSOL_MINT);
    if (wsol) {
      const raw = parseInt(wsol.rawTokenAmount.tokenAmount);
      const decimals = wsol.rawTokenAmount.decimals;
      return raw / Math.pow(10, decimals);
    }
    return 0;
  };

  // Check for native SOL first, then WSOL in token transfers
  const hasNativeInput = !!swap.nativeInput?.amount && parseInt(swap.nativeInput.amount) > 0;
  const hasNativeOutput = !!swap.nativeOutput?.amount && parseInt(swap.nativeOutput.amount) > 0;
  const wsolInInput = findSolInTokens(swap.tokenInputs);
  const wsolInOutput = findSolInTokens(swap.tokenOutputs);

  // Determine if this is a buy or sell based on SOL/WSOL flow
  // Buy: SOL/WSOL goes IN, token comes OUT
  // Sell: Token goes IN, SOL/WSOL comes OUT
  const solGoingIn = hasNativeInput || wsolInInput > 0;
  const solComingOut = hasNativeOutput || wsolInOutput > 0;

  // Find the token we're tracking in the swap
  const tokenInOutput = swap.tokenOutputs.find(t => t.mint === token);
  const tokenInInput = swap.tokenInputs.find(t => t.mint === token);

  let side: 'buy' | 'sell' | null = null;
  let tokenData: TokenTransfer | undefined;
  let solAmount = 0;

  if (tokenInOutput && solGoingIn) {
    // User sent SOL/WSOL, got token back = BUY
    side = 'buy';
    tokenData = tokenInOutput;
    solAmount = hasNativeInput
      ? parseInt(swap.nativeInput!.amount) / 1e9
      : wsolInInput;
  } else if (tokenInInput && solComingOut) {
    // User sent token, got SOL/WSOL back = SELL
    side = 'sell';
    tokenData = tokenInInput;
    solAmount = hasNativeOutput
      ? parseInt(swap.nativeOutput!.amount) / 1e9
      : wsolInOutput;
  }

  if (!side || !tokenData || solAmount === 0) {
    return null;
  }

  // Parse token amount with decimals
  const rawAmount = parseInt(tokenData.rawTokenAmount.tokenAmount);
  const decimals = tokenData.rawTokenAmount.decimals;
  const tokenAmount = rawAmount / Math.pow(10, decimals);

  // Calculate price (SOL per token)
  const price = tokenAmount > 0 ? solAmount / tokenAmount : 0;

  return {
    signature: tx.signature,
    timestamp: tx.timestamp * 1000,
    wallet: tx.feePayer,
    side,
    tokenAmount,
    solAmount,
    price,
    source: tx.source,
  };
}

/**
 * Parse trade from tokenTransfers array (PUMP_AMM and others)
 * For PUMP_AMM, swap events are empty but tokenTransfers contains the data
 */
function parseFromTokenTransfers(
  tx: HeliusTransaction,
  token: string,
  poolAddress: string
): ParsedTrade | null {
  const transfers = tx.tokenTransfers || [];

  // Find the token transfer for our target token
  const tokenTransfer = transfers.find(t => t.mint === token);
  if (!tokenTransfer) {
    return null;
  }

  // Find WSOL transfers to calculate SOL amount
  const wsolTransfers = transfers.filter(t => t.mint === WSOL_MINT);

  // Determine buy/sell based on token flow direction relative to pool
  // BUY: Token flows FROM pool TO user (user receives token)
  // SELL: Token flows FROM user TO pool (user sends token)
  const isTokenFromPool = tokenTransfer.fromUserAccount === poolAddress;
  const isTokenToPool = tokenTransfer.toUserAccount === poolAddress;

  let side: 'buy' | 'sell' | null = null;
  let wallet = tx.feePayer;

  if (isTokenFromPool) {
    // Token coming FROM pool = user is BUYING
    side = 'buy';
    wallet = tokenTransfer.toUserAccount;
  } else if (isTokenToPool) {
    // Token going TO pool = user is SELLING
    side = 'sell';
    wallet = tokenTransfer.fromUserAccount;
  } else {
    // Try to infer from WSOL flow
    // If WSOL goes to pool = BUY (user paid SOL for token)
    // If WSOL comes from pool = SELL (user received SOL for token)
    const wsolToPool = wsolTransfers.find(t => t.toUserAccount === poolAddress);
    const wsolFromPool = wsolTransfers.find(t => t.fromUserAccount === poolAddress);

    if (wsolToPool) {
      side = 'buy';
      wallet = wsolToPool.fromUserAccount;
    } else if (wsolFromPool) {
      side = 'sell';
      wallet = wsolFromPool.toUserAccount;
    }
  }

  if (!side) {
    return null;
  }

  const tokenAmount = tokenTransfer.tokenAmount;

  // Calculate total SOL amount from WSOL transfers
  // For buys: sum WSOL going TO pool (user paying)
  // For sells: sum WSOL coming FROM pool (user receiving)
  let solAmount = 0;
  for (const wsol of wsolTransfers) {
    if (side === 'buy' && wsol.toUserAccount === poolAddress) {
      solAmount += wsol.tokenAmount;
    } else if (side === 'sell' && wsol.fromUserAccount === poolAddress) {
      solAmount += wsol.tokenAmount;
    }
  }

  // If we couldn't find direct pool WSOL transfers, sum all WSOL for the user
  if (solAmount === 0) {
    for (const wsol of wsolTransfers) {
      // For Jupiter aggregated swaps, WSOL might flow through intermediaries
      // Just sum the largest WSOL transfer as an approximation
      solAmount = Math.max(solAmount, wsol.tokenAmount);
    }
  }

  if (tokenAmount === 0 || solAmount === 0) {
    return null;
  }

  const price = solAmount / tokenAmount;

  return {
    signature: tx.signature,
    timestamp: tx.timestamp * 1000,
    wallet,
    side,
    tokenAmount,
    solAmount,
    price,
    source: tx.source,
  };
}
