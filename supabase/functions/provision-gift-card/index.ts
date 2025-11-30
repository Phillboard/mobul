import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ProvisionRequest {
  campaignId: string;
  brandId: string;
  denomination: number;
  recipientId?: string;
  redemptionCode: string;
  deliveryMethod?: 'sms' | 'email';
  deliveryAddress?: string;
  redemptionIp?: string;
  redemptionUserAgent?: string;
}

interface CreditCheckResult {
  sufficient: boolean;
  accountId: string;
  availableCredit: number;
  accountType: string;
}

interface ProvisionedCard {
  id: string;
  card_code: string;
  card_number?: string;
  card_value: number;
  pool_id: string;
  cost_per_card?: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if campaign has sufficient credit for the redemption
 * Supports both shared credit and isolated budget models
 */
async function checkCampaignCredit(
  supabase: any,
  campaignId: string,
  requiredAmount: number
): Promise<CreditCheckResult> {
  console.log(`[CREDIT-CHECK] Checking credit for campaign ${campaignId}, required: $${requiredAmount}`);

  // Get campaign details
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, client_id, uses_shared_credit, credit_account_id')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) {
    throw new Error(`Campaign not found: ${campaignError?.message}`);
  }

  if (campaign.uses_shared_credit) {
    // Use client's shared credit pool
    const { data: clientAccount, error: clientAccountError } = await supabase
      .from('credit_accounts')
      .select('*')
      .eq('account_type', 'client')
      .eq('owner_id', campaign.client_id)
      .single();

    if (clientAccountError) {
      throw new Error(`Client credit account not found: ${clientAccountError.message}`);
    }

    return {
      sufficient: clientAccount.total_remaining >= requiredAmount,
      accountId: clientAccount.id,
      availableCredit: clientAccount.total_remaining,
      accountType: 'client'
    };
  } else {
    // Use campaign's isolated budget
    if (!campaign.credit_account_id) {
      throw new Error('Campaign has isolated budget enabled but no credit account');
    }

    const { data: campaignAccount, error: campaignAccountError } = await supabase
      .from('credit_accounts')
      .select('*')
      .eq('id', campaign.credit_account_id)
      .single();

    if (campaignAccountError) {
      throw new Error(`Campaign credit account not found: ${campaignAccountError.message}`);
    }

    return {
      sufficient: campaignAccount.total_remaining >= requiredAmount,
      accountId: campaignAccount.id,
      availableCredit: campaignAccount.total_remaining,
      accountType: 'campaign'
    };
  }
}

/**
 * Try to claim a card from CSV pool
 * Priority 1: Cheapest, instant fulfillment
 */
async function tryClaimFromCSV(
  supabase: any,
  brandId: string,
  denomination: number
): Promise<ProvisionedCard | null> {
  console.log(`[CSV] Attempting to claim from CSV pool: brand=${brandId}, denom=${denomination}`);

  // Find CSV pool with available cards
  const { data: pool, error: poolError } = await supabase
    .from('gift_card_pools')
    .select('id, cost_per_card, available_cards')
    .eq('brand_id', brandId)
    .eq('card_value', denomination)
    .eq('pool_type', 'csv')
    .eq('is_active', true)
    .gt('available_cards', 0)
    .order('cost_per_card', { ascending: true }) // Cheapest first
    .limit(1)
    .single();

  if (poolError || !pool) {
    console.log(`[CSV] No CSV pool available: ${poolError?.message}`);
    return null;
  }

  // Atomically claim a card using existing claim function
  const { data: claimedCards, error: claimError } = await supabase.rpc('claim_available_card', {
    p_pool_id: pool.id,
    p_recipient_id: null,
    p_call_session_id: null
  });

  if (claimError || !claimedCards || claimedCards.length === 0) {
    console.log(`[CSV] Failed to claim card: ${claimError?.message}`);
    return null;
  }

  const card = claimedCards[0];
  console.log(`[CSV] Successfully claimed card from CSV pool: ${card.card_id}`);

  return {
    id: card.card_id,
    card_code: card.card_code,
    card_number: card.card_number,
    card_value: card.card_value,
    pool_id: pool.id,
    cost_per_card: pool.cost_per_card
  };
}

/**
 * Try to provision a card from API provider
 * Priority 2: On-demand, unlimited quantity
 */
async function tryProvisionFromAPI(
  supabase: any,
  brandId: string,
  denomination: number
): Promise<ProvisionedCard | null> {
  console.log(`[API] Attempting to provision from API: brand=${brandId}, denom=${denomination}`);

  // Find API provider configuration
  const { data: pool, error: poolError } = await supabase
    .from('gift_card_pools')
    .select('id, api_provider, api_config, cost_per_card')
    .eq('brand_id', brandId)
    .eq('card_value', denomination)
    .eq('pool_type', 'api_config')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (poolError || !pool) {
    console.log(`[API] No API configuration found: ${poolError?.message}`);
    return null;
  }

  // Call existing API provisioning function
  const { data: provisionResult, error: provisionError } = await supabase.functions.invoke(
    'provision-gift-card-from-api',
    {
      body: {
        poolId: pool.id,
        recipientId: null,
        callSessionId: null
      }
    }
  );

  if (provisionError || !provisionResult?.success) {
    console.error(`[API] Provisioning failed: ${provisionError?.message || provisionResult?.error}`);
    return null;
  }

  console.log(`[API] Successfully provisioned card from API`);

  return {
    id: provisionResult.card.id,
    card_code: provisionResult.card.cardCode,
    card_number: provisionResult.card.cardNumber,
    card_value: provisionResult.card.cardValue,
    pool_id: pool.id,
    cost_per_card: pool.cost_per_card
  };
}

/**
 * Atomically deduct credit from account
 * DB-level constraint ensures we never overdraft
 */
async function deductCreditAtomic(
  supabase: any,
  accountId: string,
  amount: number,
  metadata: {
    redemptionId: string;
    source: string;
    cardId: string;
    campaignId: string;
  }
): Promise<void> {
  console.log(`[CREDIT-DEDUCT] Deducting $${amount} from account ${accountId}`);

  // Get current balance for transaction record
  const { data: accountBefore } = await supabase
    .from('credit_accounts')
    .select('total_remaining, total_used')
    .eq('id', accountId)
    .single();

  // Atomic update with DB-level constraint check
  const { data: updatedAccount, error: updateError } = await supabase
    .from('credit_accounts')
    .update({
      total_used: accountBefore.total_used + amount,
      total_remaining: accountBefore.total_remaining - amount,
      updated_at: new Date().toISOString()
    })
    .eq('id', accountId)
    .gte('total_remaining', amount) // DB-level safety - will fail if insufficient
    .select()
    .single();

  if (updateError || !updatedAccount) {
    console.error(`[CREDIT-DEDUCT] Atomic deduction failed: ${updateError?.message}`);
    throw new Error('Insufficient credit - atomic deduction failed');
  }

  // Record transaction in ledger
  const { error: transactionError } = await supabase
    .from('credit_transactions')
    .insert({
      account_id: accountId,
      transaction_type: 'redemption',
      amount: -amount,
      balance_before: accountBefore.total_remaining,
      balance_after: updatedAccount.total_remaining,
      metadata: metadata
    });

  if (transactionError) {
    console.error(`[CREDIT-DEDUCT] Failed to record transaction: ${transactionError.message}`);
    // Don't throw - credit was deducted, transaction record is optional
  }

  // Check if account is now depleted
  if (updatedAccount.total_remaining <= 0 && updatedAccount.status !== 'depleted') {
    await supabase
      .from('credit_accounts')
      .update({ status: 'depleted' })
      .eq('id', accountId);
  }

  console.log(`[CREDIT-DEDUCT] Success. New balance: $${updatedAccount.total_remaining}`);
}

/**
 * Alert admin of critical provisioning failures
 */
async function alertAdmin(
  supabase: any,
  message: string,
  metadata: any
): Promise<void> {
  console.error(`[ADMIN-ALERT] ${message}`, metadata);

  // Log to system alerts (you can expand this to send emails, Slack, etc.)
  await supabase
    .from('system_alerts')
    .insert({
      severity: 'critical',
      alert_type: 'provisioning_failure',
      message: message,
      metadata: metadata,
      created_at: new Date().toISOString()
    })
    .then(() => console.log('[ADMIN-ALERT] Alert recorded'))
    .catch((err: any) => console.error('[ADMIN-ALERT] Failed to record alert:', err));
}

// ============================================================================
// MAIN PROVISIONING FUNCTION
// ============================================================================

/**
 * Unified gift card provisioning with waterfall logic
 * CSV → API (2-tier for Phase 2)
 * Buffer will be added in Phase 3
 */
async function provisionGiftCard(
  supabase: any,
  request: ProvisionRequest
): Promise<any> {
  const { campaignId, brandId, denomination, recipientId, redemptionCode, deliveryMethod, deliveryAddress, redemptionIp, redemptionUserAgent } = request;

  console.log(`[PROVISION] Starting provisioning: campaign=${campaignId}, brand=${brandId}, denom=${denomination}`);

  // STEP 1: CHECK CREDIT FIRST (zero financial risk)
  const creditCheck = await checkCampaignCredit(supabase, campaignId, denomination);
  
  if (!creditCheck.sufficient) {
    console.error(`[PROVISION] Insufficient credit. Required: $${denomination}, Available: $${creditCheck.availableCredit}`);
    throw new Error(`Insufficient credit - campaign has $${creditCheck.availableCredit} but needs $${denomination}`);
  }

  console.log(`[PROVISION] Credit check passed. Available: $${creditCheck.availableCredit}`);

  let provisionedCard: ProvisionedCard | null = null;
  let source: 'csv' | 'api' = 'csv';

  // STEP 2: Try CSV Pool (Priority 1)
  provisionedCard = await tryClaimFromCSV(supabase, brandId, denomination);
  
  if (!provisionedCard) {
    // STEP 3: Try On-Demand API (Priority 2)
    console.log(`[PROVISION] CSV pool empty, trying API`);
    provisionedCard = await tryProvisionFromAPI(supabase, brandId, denomination);
    source = 'api';
  }

  // STEP 4: All sources failed
  if (!provisionedCard) {
    console.error(`[PROVISION] All provisioning sources exhausted`);
    await alertAdmin(supabase, `Unable to provision ${brandId} $${denomination} - all sources exhausted`, {
      campaignId,
      brandId,
      denomination,
      redemptionCode
    });
    throw new Error('Service temporarily unavailable - unable to provision gift card');
  }

  console.log(`[PROVISION] Card provisioned from ${source}`);

  // STEP 5: Deduct credit atomically
  await deductCreditAtomic(supabase, creditCheck.accountId, denomination, {
    redemptionId: redemptionCode,
    source: source,
    cardId: provisionedCard.id,
    campaignId: campaignId
  });

  // STEP 6: Create redemption record
  const { data: redemption, error: redemptionError } = await supabase
    .from('gift_card_redemptions')
    .insert({
      campaign_id: campaignId,
      recipient_id: recipientId,
      redemption_code: redemptionCode,
      gift_card_id: provisionedCard.id,
      brand_id: brandId,
      denomination: denomination,
      amount_charged: denomination,
      cost_basis: provisionedCard.cost_per_card || denomination,
      account_charged_id: creditCheck.accountId,
      status: 'provisioned',
      provisioning_source: source,
      delivery_method: deliveryMethod,
      delivery_address: deliveryAddress,
      redemption_ip: redemptionIp,
      redemption_user_agent: redemptionUserAgent,
      redeemed_at: new Date().toISOString()
    })
    .select()
    .single();

  if (redemptionError) {
    console.error(`[PROVISION] Failed to create redemption record: ${redemptionError.message}`);
    // Continue anyway - card was provisioned and credit deducted
  }

  console.log(`[PROVISION] Provisioning complete. Redemption ID: ${redemption?.id}`);

  return {
    success: true,
    redemption: redemption,
    card: {
      id: provisionedCard.id,
      cardCode: provisionedCard.card_code,
      cardNumber: provisionedCard.card_number,
      cardValue: provisionedCard.card_value
    },
    source: source,
    creditRemaining: creditCheck.availableCredit - denomination
  };
}

// ============================================================================
// HTTP HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const requestBody = await req.json();
    console.log(`[PROVISION-GIFT-CARD] Request received:`, requestBody);

    const result = await provisionGiftCard(supabaseClient, requestBody);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PROVISION-GIFT-CARD] Error:', errorMessage);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

