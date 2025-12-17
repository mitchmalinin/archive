import { NextRequest, NextResponse } from 'next/server';
import { tradeEmitter } from '@/lib/tradeEventEmitter';
import { generateId } from '@/lib/utils';
import type { Trade } from '@/lib/types';

// Helius webhook payload types
interface HeliusTokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  fromTokenAccount: string;
  toTokenAccount: string;
  tokenAmount: number;
  mint: string;
  tokenStandard: string;
}

interface HeliusNativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number;
}

interface HeliusAccountData {
  account: string;
  nativeBalanceChange: number;
  tokenBalanceChanges: Array<{
    userAccount: string;
    tokenAccount: string;
    mint: string;
    rawTokenAmount: {
      tokenAmount: string;
      decimals: number;
    };
  }>;
}

interface HeliusEnhancedTransaction {
  signature: string;
  timestamp: number;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  nativeTransfers?: HeliusNativeTransfer[];
  tokenTransfers?: HeliusTokenTransfer[];
  accountData?: HeliusAccountData[];
  description?: string;
}

// Store the current token we're tracking (set via the register endpoint)
let trackedTokenMint: string | null = null;

export function setTrackedToken(mint: string | null) {
  trackedTokenMint = mint;
}

export function getTrackedToken(): string | null {
  return trackedTokenMint;
}

// Parse Helius transaction into our Trade format
function parseHeliusTransaction(tx: HeliusEnhancedTransaction): Trade | null {
  try {
    // Skip if no token transfers
    if (!tx.tokenTransfers?.length && !tx.nativeTransfers?.length) {
      return null;
    }

    // Find the relevant token transfer (if we're tracking a specific token)
    const tokenTransfer = tx.tokenTransfers?.find(
      (t) => !trackedTokenMint || t.mint === trackedTokenMint
    );

    // Find SOL transfer
    const solTransfer = tx.nativeTransfers?.[0];

    if (!tokenTransfer && !solTransfer) {
      return null;
    }

    // Determine trade side based on SOL flow
    // If user sent SOL and received tokens = BUY
    // If user received SOL and sent tokens = SELL
    const wallet = tx.feePayer;
    let side: 'buy' | 'sell' = 'buy';
    let solAmount = 0;
    let tokenAmount = 0;

    if (tx.accountData) {
      // Find the trader's account data
      const traderAccount = tx.accountData.find(
        (a) => a.account === wallet
      );

      if (traderAccount) {
        // Negative SOL change = buying tokens
        // Positive SOL change = selling tokens
        if (traderAccount.nativeBalanceChange < 0) {
          side = 'buy';
          solAmount = Math.abs(traderAccount.nativeBalanceChange) / 1e9; // Convert lamports to SOL
        } else if (traderAccount.nativeBalanceChange > 0) {
          side = 'sell';
          solAmount = traderAccount.nativeBalanceChange / 1e9;
        }

        // Get token amount from balance changes
        const tokenChange = traderAccount.tokenBalanceChanges?.find(
          (tc) => !trackedTokenMint || tc.mint === trackedTokenMint
        );
        if (tokenChange) {
          const decimals = tokenChange.rawTokenAmount.decimals;
          tokenAmount = Math.abs(
            parseInt(tokenChange.rawTokenAmount.tokenAmount) / Math.pow(10, decimals)
          );
        }
      }
    }

    // Fallback to transfer data if accountData didn't work
    if (solAmount === 0 && solTransfer) {
      solAmount = solTransfer.amount / 1e9;
      // If feePayer sent SOL, it's a buy
      side = solTransfer.fromUserAccount === wallet ? 'buy' : 'sell';
    }

    if (tokenAmount === 0 && tokenTransfer) {
      tokenAmount = tokenTransfer.tokenAmount;
    }

    // Skip dust trades
    if (solAmount < 0.001) {
      return null;
    }

    // Calculate price
    const price = tokenAmount > 0 ? solAmount / tokenAmount : 0;

    const trade: Trade = {
      id: generateId(),
      timestamp: tx.timestamp * 1000, // Convert to ms
      wallet,
      side,
      solAmount,
      tokenAmount,
      price,
      signature: tx.signature,
    };

    return trade;
  } catch (error) {
    console.error('Error parsing Helius transaction:', error);
    return null;
  }
}

// POST handler for Helius webhooks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Helius sends an array of transactions
    const transactions: HeliusEnhancedTransaction[] = Array.isArray(body)
      ? body
      : [body];

    let processedCount = 0;

    for (const tx of transactions) {
      const trade = parseHeliusTransaction(tx);
      if (trade) {
        tradeEmitter.emit(trade);
        processedCount++;
        console.log(
          `[Helius Webhook] Trade: ${trade.side.toUpperCase()} ${trade.solAmount.toFixed(2)} SOL by ${trade.wallet.slice(0, 8)}...`
        );
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      total: transactions.length,
    });
  } catch (error) {
    console.error('[Helius Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// GET handler for health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    trackedToken: trackedTokenMint,
    listeners: tradeEmitter.getListenerCount(),
    recentTrades: tradeEmitter.getRecentTrades().length,
  });
}
