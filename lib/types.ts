// Core trade data from WebSocket/mock
export interface Trade {
  id: string;
  timestamp: number;
  wallet: string;
  side: 'buy' | 'sell';
  solAmount: number;
  tokenAmount: number;
  price: number;
  signature?: string; // Transaction signature for Solscan link (real txs only)
}

// OHLC candle data
export interface Candle {
  id: string;
  candleNumber: number; // Sequential candle number for display
  startTime: number;
  endTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  tradeCount: number;
  buyCount: number;
  sellCount: number;
  trades: Trade[];
  fees: {
    total: number;
    creator: number;
    protocol: number;
  };
}

// Receipt types
export interface SummaryReceipt {
  type: 'summary';
  id: string;
  receiptNumber: number;
  candle: Candle;
  isExpanded: boolean;
}

export type Receipt = SummaryReceipt;

// Filter state
export type TradeFilter = 'all' | 'buys' | 'sells';

// Chart data format for lightweight-charts
export interface ChartCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}
