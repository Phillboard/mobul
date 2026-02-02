/**
 * Purchase Gift Cards Edge Function
 * 
 * Creates a Stripe checkout session for purchasing gift cards.
 * Requires authenticated user with access to the specified client.
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';

// ============================================================================
// Types
// ============================================================================

interface PurchaseRequest {
  clientId: string;
  quantity: number;
  cardValue: number;
  poolName: string;
  provider?: string;
}

interface PurchaseResponse {
  checkoutUrl: string;
}

// ============================================================================
// Main Handler
// ============================================================================

async function handlePurchaseGiftCards(
  request: PurchaseRequest,
  context: AuthContext,
  rawRequest: Request
): Promise<PurchaseResponse> {
  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('purchase-gift-cards', rawRequest);
  
  const { clientId, quantity, cardValue, poolName, provider } = request;

  // Validate required fields
  if (!clientId || !quantity || !cardValue || !poolName) {
    throw new ApiError('Missing required fields: clientId, quantity, cardValue, poolName', 'VALIDATION_ERROR', 400);
  }

  // Verify user has access to this client
  const { data: clientAccess } = await supabase
    .rpc('user_can_access_client', { _user_id: context.user.id, _client_id: clientId });
  
  if (!clientAccess) {
    throw new ApiError('You do not have access to this client', 'FORBIDDEN', 403);
  }

  // Get Stripe key
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) {
    throw new ApiError('Stripe secret key not configured', 'CONFIGURATION_ERROR', 500);
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16',
  });

  const totalAmount = quantity * cardValue * 100; // Convert to cents

  // Get origin for redirect URLs
  const origin = rawRequest.headers.get('origin') || Deno.env.get('FRONTEND_URL') || '';

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Gift Card Pool: ${poolName}`,
            description: `${quantity} gift cards × $${cardValue} each${provider !== 'Generic' ? ` (${provider})` : ''}`,
          },
          unit_amount: cardValue * 100,
        },
        quantity: quantity,
      },
    ],
    mode: 'payment',
    success_url: `${origin}/gift-cards?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/gift-cards?purchase=cancelled`,
    metadata: {
      clientId,
      quantity: quantity.toString(),
      cardValue: cardValue.toString(),
      poolName,
      provider: provider || 'Generic',
      type: 'gift_card_purchase',
      userId: context.user.id,
    },
  });

  // Log activity
  await activityLogger.giftCard('purchase_initiated', 'success',
    `Gift card purchase initiated - ${quantity} cards at $${cardValue}`,
    {
      userId: context.user.id,
      clientId,
      metadata: {
        pool_name: poolName,
        quantity,
        card_value: cardValue,
        provider,
        stripe_session_id: session.id,
        total_amount: totalAmount / 100,
      },
    }
  );

  console.log(`[PURCHASE] Checkout session created: ${session.id}`);

  return {
    checkoutUrl: session.url!,
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handlePurchaseGiftCards, {
  requireAuth: true,
  parseBody: true,
  auditAction: 'purchase_gift_cards',
}));
