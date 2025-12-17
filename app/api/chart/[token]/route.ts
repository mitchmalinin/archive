import { NextRequest, NextResponse } from 'next/server';

const SOLANA_TRACKER_API = 'https://data.solanatracker.io';

// Valid timeframe options from Solana Tracker
const VALID_TIMEFRAMES = [
  '1s', '5s', '15s', '30s',
  '1m', '3m', '5m', '15m', '30m',
  '1h', '2h', '4h', '6h', '8h', '12h',
  '1d', '3d', '1w', '1mn'
];

interface OHLCVCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SolanaTrackerResponse {
  oclhv: Array<{
    open: number;
    close: number;
    low: number;
    high: number;
    volume: number;
    time: number;
  }>;
  error?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const searchParams = request.nextUrl.searchParams;

  // Get query params
  const type = searchParams.get('type') || '30s'; // Default to 30s
  const timeFrom = searchParams.get('time_from');
  const timeTo = searchParams.get('time_to');

  // Validate timeframe
  if (!VALID_TIMEFRAMES.includes(type)) {
    return NextResponse.json(
      { error: `Invalid timeframe. Valid options: ${VALID_TIMEFRAMES.join(', ')}` },
      { status: 400 }
    );
  }

  // Get API key from environment
  const apiKey = process.env.SOLANA_TRACKER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Solana Tracker API key not configured' },
      { status: 500 }
    );
  }

  try {
    // Build URL with query params
    const url = new URL(`${SOLANA_TRACKER_API}/chart/${token}`);
    url.searchParams.set('type', type);

    if (timeFrom) url.searchParams.set('time_from', timeFrom);
    if (timeTo) url.searchParams.set('time_to', timeTo);

    // Enable features for better data quality
    url.searchParams.set('removeOutliers', 'true');
    url.searchParams.set('marketCapChart', 'false');
    url.searchParams.set('smartPools', 'true');
    url.searchParams.set('liveCache', 'true');

    const response = await fetch(url.toString(), {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
      },
      // Cache for 5 seconds - short enough to catch new candles, long enough to reduce API calls
      next: { revalidate: 5 },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[SolanaTracker] API error:', response.status, errorData);
      return NextResponse.json(
        { error: errorData.error || `API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data: SolanaTrackerResponse = await response.json();

    if (data.error) {
      return NextResponse.json(
        { error: data.error },
        { status: 400 }
      );
    }

    // Transform to our format (note: Solana Tracker uses "oclhv" not "ohlcv")
    const candles: OHLCVCandle[] = (data.oclhv || []).map((candle) => ({
      time: candle.time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    }));

    // Sort chronologically
    candles.sort((a, b) => a.time - b.time);

    return NextResponse.json({
      candles,
      count: candles.length,
      timeframe: type,
    });

  } catch (error) {
    console.error('[SolanaTracker] Fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}
