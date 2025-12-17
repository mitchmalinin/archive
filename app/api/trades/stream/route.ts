import { tradeEmitter } from '@/lib/tradeEventEmitter';
import type { Trade } from '@/lib/types';

// SSE endpoint for streaming trades to clients
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const connectMessage = `data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`;
      controller.enqueue(encoder.encode(connectMessage));

      // Send recent trades on connect
      const recentTrades = tradeEmitter.getRecentTrades();
      if (recentTrades.length > 0) {
        const recentMessage = `data: ${JSON.stringify({ type: 'recent', trades: recentTrades })}\n\n`;
        controller.enqueue(encoder.encode(recentMessage));
      }

      // Subscribe to new trades
      const unsubscribe = tradeEmitter.subscribe((trade: Trade) => {
        try {
          const message = `data: ${JSON.stringify({ type: 'trade', trade })}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          // Stream closed
          console.log('[SSE] Client disconnected');
        }
      });

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          const ping = `data: ${JSON.stringify({ type: 'ping', timestamp: Date.now() })}\n\n`;
          controller.enqueue(encoder.encode(ping));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on close
      const cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };

      // Handle abort signal if available
      // Note: In Next.js App Router, we can't easily detect client disconnect
      // The stream will error when client disconnects, which is handled above
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
