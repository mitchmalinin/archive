import { NextRequest, NextResponse } from 'next/server';
import { setTrackedToken, getTrackedToken } from '../helius/route';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_WEBHOOK_API = 'https://api.helius.xyz/v0/webhooks';

// Store webhook ID for management
let activeWebhookId: string | null = null;

interface HeliusWebhook {
  webhookID: string;
  wallet: string;
  webhookURL: string;
  transactionTypes: string[];
  accountAddresses: string[];
  webhookType: string;
}

// Create a new Helius webhook
async function createWebhook(
  webhookUrl: string,
  tokenAddress: string
): Promise<HeliusWebhook | null> {
  if (!HELIUS_API_KEY) {
    throw new Error('HELIUS_API_KEY not configured');
  }

  const response = await fetch(`${HELIUS_WEBHOOK_API}?api-key=${HELIUS_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      webhookURL: webhookUrl,
      transactionTypes: ['SWAP', 'TRANSFER'],
      accountAddresses: [tokenAddress],
      webhookType: 'enhanced',
      txnStatus: 'success',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Helius] Create webhook error:', error);
    throw new Error(`Failed to create webhook: ${error}`);
  }

  return response.json();
}

// Delete a Helius webhook
async function deleteWebhook(webhookId: string): Promise<boolean> {
  if (!HELIUS_API_KEY) {
    throw new Error('HELIUS_API_KEY not configured');
  }

  const response = await fetch(
    `${HELIUS_WEBHOOK_API}/${webhookId}?api-key=${HELIUS_API_KEY}`,
    { method: 'DELETE' }
  );

  return response.ok;
}

// Get all webhooks
async function listWebhooks(): Promise<HeliusWebhook[]> {
  if (!HELIUS_API_KEY) {
    throw new Error('HELIUS_API_KEY not configured');
  }

  const response = await fetch(`${HELIUS_WEBHOOK_API}?api-key=${HELIUS_API_KEY}`);

  if (!response.ok) {
    throw new Error('Failed to list webhooks');
  }

  return response.json();
}

// POST: Create/update webhook for a token
export async function POST(request: NextRequest) {
  try {
    const { tokenAddress, webhookUrl } = await request.json();

    if (!tokenAddress) {
      return NextResponse.json(
        { error: 'tokenAddress is required' },
        { status: 400 }
      );
    }

    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'webhookUrl is required' },
        { status: 400 }
      );
    }

    if (!HELIUS_API_KEY) {
      return NextResponse.json(
        { error: 'HELIUS_API_KEY not configured in environment' },
        { status: 500 }
      );
    }

    // Delete existing webhook if any
    if (activeWebhookId) {
      try {
        await deleteWebhook(activeWebhookId);
        console.log('[Helius] Deleted previous webhook:', activeWebhookId);
      } catch (error) {
        console.warn('[Helius] Could not delete previous webhook:', error);
      }
    }

    // Create new webhook
    const webhook = await createWebhook(webhookUrl, tokenAddress);

    if (webhook) {
      activeWebhookId = webhook.webhookID;
      setTrackedToken(tokenAddress);

      console.log('[Helius] Created webhook:', webhook.webhookID, 'for token:', tokenAddress);

      return NextResponse.json({
        success: true,
        webhookId: webhook.webhookID,
        tokenAddress,
        webhookUrl,
      });
    }

    return NextResponse.json(
      { error: 'Failed to create webhook' },
      { status: 500 }
    );
  } catch (error) {
    console.error('[Helius] Webhook creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE: Remove active webhook
export async function DELETE() {
  try {
    if (!activeWebhookId) {
      return NextResponse.json({ success: true, message: 'No active webhook' });
    }

    const deleted = await deleteWebhook(activeWebhookId);

    if (deleted) {
      const oldId = activeWebhookId;
      activeWebhookId = null;
      setTrackedToken(null);

      return NextResponse.json({
        success: true,
        deletedWebhookId: oldId,
      });
    }

    return NextResponse.json(
      { error: 'Failed to delete webhook' },
      { status: 500 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET: Get current webhook status
export async function GET() {
  try {
    const webhooks = HELIUS_API_KEY ? await listWebhooks() : [];

    return NextResponse.json({
      hasApiKey: !!HELIUS_API_KEY,
      activeWebhookId,
      trackedToken: getTrackedToken(),
      allWebhooks: webhooks,
    });
  } catch (error) {
    return NextResponse.json({
      hasApiKey: !!HELIUS_API_KEY,
      activeWebhookId,
      trackedToken: getTrackedToken(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
