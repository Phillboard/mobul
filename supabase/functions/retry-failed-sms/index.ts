/**
 * Retry Failed SMS Edge Function
 * 
 * Finds failed SMS deliveries and retries them through the gift card SMS function.
 * Respects retry limits (max 3 attempts per delivery).
 */

import { withApiGateway, ApiError, callEdgeFunction } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';

interface RetryResult {
  deliveryId: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

interface RetryFailedSMSResponse {
  success: boolean;
  message?: string;
  retriedCount: number;
  results: RetryResult[];
}

async function handleRetryFailedSMS(): Promise<RetryFailedSMSResponse> {
  const supabase = createServiceClient();

  console.log('[RETRY-SMS] Checking for failed SMS deliveries...');

  // Find failed deliveries with retry count < 3
  const { data: failedDeliveries, error: fetchError } = await supabase
    .from('gift_card_deliveries')
    .select(`
      *,
      gift_cards!inner(card_code, card_number, gift_card_pools!inner(card_value)),
      recipients!inner(phone, first_name, last_name)
    `)
    .eq('sms_status', 'failed')
    .lt('retry_count', 3)
    .order('created_at', { ascending: true })
    .limit(10);

  if (fetchError) {
    console.error('[RETRY-SMS] Error fetching failed deliveries:', fetchError);
    throw new ApiError(`Failed to fetch deliveries: ${fetchError.message}`, 'DATABASE_ERROR', 500);
  }

  if (!failedDeliveries || failedDeliveries.length === 0) {
    console.log('[RETRY-SMS] No failed deliveries to retry');
    return {
      success: true,
      message: 'No deliveries to retry',
      retriedCount: 0,
      results: [],
    };
  }

  console.log(`[RETRY-SMS] Found ${failedDeliveries.length} failed deliveries to retry`);

  const results: RetryResult[] = [];

  for (const delivery of failedDeliveries) {
    try {
      console.log(`[RETRY-SMS] Retrying delivery ${delivery.id}...`);

      // Increment retry count and set to pending
      await supabase
        .from('gift_card_deliveries')
        .update({
          retry_count: delivery.retry_count + 1,
          sms_status: 'pending',
        })
        .eq('id', delivery.id);

      // Call the gift card SMS function
      const result = await callEdgeFunction<{
        deliveryId: string;
        giftCardCode: string;
        giftCardValue: number;
        recipientPhone: string;
        recipientName: string;
        customMessage?: string;
      }, unknown>('send-gift-card-sms', {
        deliveryId: delivery.id,
        giftCardCode: delivery.gift_cards.card_code,
        giftCardValue: delivery.gift_cards.gift_card_pools.card_value,
        recipientPhone: delivery.recipients.phone,
        recipientName: delivery.recipients.first_name,
        customMessage: delivery.sms_message,
      });

      results.push({
        deliveryId: delivery.id,
        success: true,
        result,
      });

      console.log(`[RETRY-SMS] Success for ${delivery.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[RETRY-SMS] Failed for ${delivery.id}:`, errorMessage);
      
      results.push({
        deliveryId: delivery.id,
        success: false,
        error: errorMessage,
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`[RETRY-SMS] Completed: ${successCount}/${results.length} successful`);

  return {
    success: true,
    retriedCount: failedDeliveries.length,
    results,
  };
}

Deno.serve(withApiGateway(handleRetryFailedSMS, {
  requireAuth: false,
  parseBody: false, // No body needed
}));
