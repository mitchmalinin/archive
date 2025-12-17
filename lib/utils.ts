/**
 * Format a price with appropriate decimal places for small values
 */
export function formatPrice(price: number): string {
  if (price < 0.000001) {
    return `$${price.toExponential(2)}`;
  }
  if (price < 0.01) {
    return `$${price.toFixed(6)}`;
  }
  if (price < 1) {
    return `$${price.toFixed(4)}`;
  }
  return `$${price.toFixed(2)}`;
}

/**
 * Format a timestamp to HH:MM:SS UTC
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().slice(11, 19);
}

/**
 * Format a timestamp to HH:MM:SS for display
 */
export function formatTimeShort(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().slice(11, 19);
}

/**
 * Format a percentage change with sign
 */
export function formatPercent(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

/**
 * Truncate a wallet address to show first and last 4 characters
 */
export function truncateWallet(wallet: string): string {
  if (wallet.length <= 8) return wallet;
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

/**
 * Format SOL amount with appropriate precision
 */
export function formatSol(amount: number): string {
  if (amount >= 1) {
    return `${amount.toFixed(2)} SOL`;
  }
  return `${amount.toFixed(4)} SOL`;
}

/**
 * Format token amount with commas
 */
export function formatTokenAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get the start of the current candle period (30 seconds)
 */
export function getMinuteStart(timestamp: number): number {
  return Math.floor(timestamp / 30_000) * 30_000;
}

/**
 * Pad a number with leading zeros
 */
export function padNumber(num: number, length: number): string {
  return String(num).padStart(length, '0');
}

/**
 * Get candle duration in milliseconds for a timeframe
 */
export function getCandleDurationMs(timeframe: string): number {
  const durations: Record<string, number> = {
    '30s': 30_000,
    '1m': 60_000,
    '5m': 5 * 60_000,
    '15m': 15 * 60_000,
    '1h': 60 * 60_000,
    '4h': 4 * 60 * 60_000,
  };
  return durations[timeframe] || 30_000;
}

/**
 * Get current candle boundary (wall-clock aligned)
 */
export function getCurrentCandleBoundary(timeframe: string): number {
  const durationMs = getCandleDurationMs(timeframe);
  const now = Date.now();
  return Math.floor(now / durationMs) * durationMs;
}

/**
 * Get seconds until next candle boundary (wall-clock timer)
 */
export function getSecondsUntilNextCandle(timeframe: string): number {
  const durationMs = getCandleDurationMs(timeframe);
  const boundary = getCurrentCandleBoundary(timeframe);
  const nextBoundary = boundary + durationMs;
  return Math.max(0, Math.floor((nextBoundary - Date.now()) / 1000));
}
