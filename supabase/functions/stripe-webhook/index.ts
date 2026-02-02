/**
 * Stripe Webhook Edge Function
 * 
 * Handles Stripe webhook events for payment processing.
 * Verifies signatures using Stripe SDK.
 */

import { withApiGateway, ApiError, type PublicContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';
import { createWebhookResponse } from '../_shared/webhook-utils.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';

// ============================================================================
// Types
// ============================================================================

interface StripeWebhookResponse {
  received: boolean;
  event_type?: string;
  processed?: boolean;
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleStripeWebhook(
  _request: unknown,
  _context: PublicContext,
  rawRequest: Request
): Promise<Response> {
  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('stripe-webhook', rawRequest);

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!stripeKey || !webhookSecret) {
    throw new ApiError('Stripe configuration missing', 'CONFIG_ERROR', 500);
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16',
  });

  // Get signature from header
  const signature = rawRequest.headers.get('stripe-signature');
  if (!signature) {
    throw new ApiError('No signature provided', 'UNAUTHORIZED', 401);
  }

  // Read raw body for signature verification
  const body = await rawRequest.text();

  // Verify signature using Stripe SDK
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature verification failed';
    throw new ApiError(message, 'SIGNATURE_INVALID', 400);
  }

  console.log('[STRIPE-WEBHOOK] Event type:', event.type);

  let processed = false;

  // Handle successful payment
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.metadata?.type === 'gift_card_purchase' && session.payment_status === 'paid') {
      const { clientId, quantity, cardValue, poolName, provider } = session.metadata;

      // Create the gift card pool
      const { data: pool, error: poolError } = await supabase
        .from('gift_card_pools')
        .insert({
          client_id: clientId,
          pool_name: poolName,
          card_value: parseFloat(cardValue),
          provider: provider || 'Generic',
          total_cards: 0,
          available_cards: 0,
        })
        .select()
        .single();

      if (poolError) {
        console.error('[STRIPE-WEBHOOK] Error creating pool:', poolError);
        throw new ApiError(`Failed to create pool: ${poolError.message}`, 'DATABASE_ERROR', 500);
      }

      console.log(`[STRIPE-WEBHOOK] Created gift card pool: ${pool.id}`);
      processed = true;

      // Log activity
      await activityLogger.system('payment_received', 'success', {
        clientId,
        description: `Gift card purchase completed - ${quantity} cards at $${cardValue} each`,
        metadata: {
          pool_id: pool.id,
          pool_name: poolName,
          quantity: parseInt(quantity),
          card_value: parseFloat(cardValue),
          provider,
          stripe_session_id: session.id,
          total_amount: parseInt(quantity) * parseFloat(cardValue),
        },
      });
    }
  }

  // Handle other event types as needed
  if (event.type === 'payment_intent.succeeded') {
    console.log('[STRIPE-WEBHOOK] Payment intent succeeded');
    processed = true;
  }

  if (event.type === 'payment_intent.payment_failed') {
    console.log('[STRIPE-WEBHOOK] Payment intent failed');
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    await activityLogger.system('payment_failed', 'failed', {
      description: `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
      metadata: {
        payment_intent_id: paymentIntent.id,
        error: paymentIntent.last_payment_error,
      },
    });
    processed = true;
  }

  const responseData: StripeWebhookResponse = {
    received: true,
    event_type: event.type,
    processed,
  };

  return createWebhookResponse(responseData, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
    },
  });
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleStripeWebhook, {
  requireAuth: false, // Webhooks authenticate via signature
  parseBody: false, // We need raw body for signature verification
  auditAction: 'stripe_webhook_received',
}));
