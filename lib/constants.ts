// Candle duration in milliseconds (30 seconds)
export const CANDLE_DURATION_MS = 30_000;

// Token info
export const TOKEN_NAME = 'RECEIPT';
export const TOKEN_TICKER = 'RECEIPT';

// Fee percentages (Pump.fun standard)
export const PROTOCOL_FEE_PERCENT = 1; // 1%
export const CREATOR_FEE_PERCENT = 0; // Can be set by creator

// UI settings
export const MAX_RECEIPTS_IN_MEMORY = 100;
export const RECEIPT_ANIMATION_DELAY_MS = 50;

// Colors
export const COLORS = {
  buy: '#22c55e',
  sell: '#ef4444',
  terminalBody: '#1f1f23',
  terminalScreen: '#0a0a0a',
  terminalBorder: '#2a2a2e',
  receiptPaper: '#f5f5dc',
  receiptText: '#27272a',
} as const;
