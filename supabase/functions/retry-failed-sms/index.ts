/**
 * Retry Failed SMS Edge Function
 * 
 * Finds failed SMS log entries and retries them through the gift card SMS function.
 * Respects retry limits (max 3 attempts per entry).
 */

import { withApiGateway, ApiError, callEdgeFunction } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';

interface RetryResult {
  logEntryId: string;
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

  console.log('[RETRY-SMS] Checking for failed SMS log entries...');

  // Find failed entries in sms_delivery_log with retry count < 3
  // Join with recipients to get client_id and condition_id for proper template resolution
  const { data: failedEntries, error: fetchError } = await supabase
    .from('sms_delivery_log')
    .select(`
      id,
      recipient_id,
      gift_card_id,
      phone_number,
      retry_count,
      recipients!inner(
        first_name, 
        last_name, 
        client_id, 
        condition_id,
        campaign:campaigns(client_id)
      )
    `)
    .eq('delivery_status', 'failed')
    .lt('retry_count', 3)
    .order('created_at', { ascending: true })
    .limit(10);

  if (fetchError) {
    console.error('[RETRY-SMS] Error fetching failed entries:', fetchError);
    throw new ApiError(`Failed to fetch entries: ${fetchError.message}`, 'DATABASE_ERROR', 500);
  }

  if (!failedEntries || failedEntries.length === 0) {
    console.log('[RETRY-SMS] No failed entries to retry');
    return {
      success: true,
      message: 'No entries to retry',
      retriedCount: 0,
      results: [],
    };
  }

  console.log(`[RETRY-SMS] Found ${failedEntries.length} failed entries to retry`);

  const results: RetryResult[] = [];

  for (const entry of failedEntries) {
    try {
      console.log(`[RETRY-SMS] Retrying entry ${entry.id}...`);

      // Fetch gift card details from gift_card_inventory
      let cardCode: string | undefined;
      let cardValue: number | undefined;
      let brandName: string | undefined;

      if (entry.gift_card_id) {
        const { data: giftCard } = await supabase
          .from('gift_card_inventory')
          .select(`
            card_code,
            denomination,
            brand:gift_card_brands(brand_name)
          `)
          .eq('id', entry.gift_card_id)
          .single();

        if (giftCard) {
          cardCode = giftCard.card_code;
          cardValue = giftCard.denomination;
          brandName = (giftCard.brand as any)?.brand_name;
        }
      }

      if (!cardCode || !cardValue) {
        console.warn(`[RETRY-SMS] Entry ${entry.id} missing card details, skipping`);
        results.push({
          logEntryId: entry.id,
          success: false,
          error: 'Missing gift card details',
        });
        continue;
      }

      // Increment retry count and set to pending
      await supabase
        .from('sms_delivery_log')
        .update({
          retry_count: (entry.retry_count || 0) + 1,
          delivery_status: 'pending',
          last_retry_at: new Date().toISOString(),
        })
        .eq('id', entry.id);

      // Get client_id from recipient's campaign or direct reference
      const clientId = entry.recipients?.client_id 
        || (entry.recipients?.campaign as any)?.client_id;

      // Call the gift card SMS function
      // Pass conditionId to ensure proper template and link URL resolution
      const result = await callEdgeFunction<{
        giftCardCode: string;
        giftCardValue: number;
        recipientPhone: string;
        recipientName: string;
        recipientId?: string;
        giftCardId?: string;
        clientId?: string;
        conditionId?: string;
        brandName?: string;
      }, unknown>('send-gift-card-sms', {
        giftCardCode: cardCode,
        giftCardValue: cardValue,
        recipientPhone: entry.phone_number,
        recipientName: entry.recipients?.first_name || '',
        recipientId: entry.recipient_id,
        giftCardId: entry.gift_card_id,
        clientId: clientId,
        conditionId: entry.recipients?.condition_id,
        brandName: brandName,
      });

      results.push({
        logEntryId: entry.id,
        success: true,
        result,
      });

      console.log(`[RETRY-SMS] Success for ${entry.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[RETRY-SMS] Failed for ${entry.id}:`, errorMessage);
      
      results.push({
        logEntryId: entry.id,
        success: false,
        error: errorMessage,
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`[RETRY-SMS] Completed: ${successCount}/${results.length} successful`);

  return {
    success: true,
    retriedCount: failedEntries.length,
    results,
  };
}

Deno.serve(withApiGateway(handleRetryFailedSMS, {
  requireAuth: false,
  parseBody: false, // No body needed
}));
