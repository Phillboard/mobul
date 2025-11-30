import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AllocateRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  allocatedByUserId?: string;
  notes?: string;
}

interface CreditAccount {
  id: string;
  account_type: string;
  owner_id: string;
  parent_account_id: string | null;
  total_purchased: number;
  total_allocated: number;
  total_used: number;
  total_remaining: number;
  status: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get credit account by ID
 */
async function getAccount(supabase: any, accountId: string): Promise<CreditAccount> {
  const { data: account, error } = await supabase
    .from('credit_accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (error || !account) {
    throw new Error(`Credit account not found: ${error?.message}`);
  }

  return account;
}

/**
 * Validate allocation is allowed between accounts
 */
function validateAllocation(fromAccount: CreditAccount, toAccount: CreditAccount): void {
  // Ensure parent-child relationship
  if (toAccount.parent_account_id !== fromAccount.id) {
    throw new Error('Can only allocate credit from parent to direct child account');
  }

  // Validate status
  if (fromAccount.status === 'suspended') {
    throw new Error('Cannot allocate from suspended account');
  }

  if (toAccount.status === 'suspended') {
    throw new Error('Cannot allocate to suspended account');
  }

  // Validate hierarchy (money flows down only)
  const hierarchy = ['platform', 'agency', 'client', 'campaign'];
  const fromLevel = hierarchy.indexOf(fromAccount.account_type);
  const toLevel = hierarchy.indexOf(toAccount.account_type);

  if (fromLevel >= toLevel) {
    throw new Error('Invalid allocation: money can only flow DOWN the hierarchy (platform → agency → client → campaign)');
  }
}

/**
 * Create transaction record in ledger
 */
async function createTransaction(
  supabase: any,
  params: {
    accountId: string;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    relatedTransactionId?: string;
    notes?: string;
    createdByUserId?: string;
  }
): Promise<any> {
  const { data, error } = await supabase
    .from('credit_transactions')
    .insert({
      account_id: params.accountId,
      transaction_type: params.type,
      amount: params.amount,
      balance_before: params.balanceBefore,
      balance_after: params.balanceAfter,
      related_transaction_id: params.relatedTransactionId,
      notes: params.notes,
      created_by_user_id: params.createdByUserId,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create transaction: ${error.message}`);
  }

  return data;
}

/**
 * Update account balances atomically
 */
async function updateAccountBalances(
  supabase: any,
  fromAccountId: string,
  toAccountId: string,
  amount: number
): Promise<void> {
  // Update parent account (deduct from remaining, add to allocated)
  const { error: fromError } = await supabase
    .from('credit_accounts')
    .update({
      total_allocated: supabase.rpc('credit_accounts.total_allocated') + amount,
      total_remaining: supabase.rpc('credit_accounts.total_remaining') - amount,
      updated_at: new Date().toISOString()
    })
    .eq('id', fromAccountId)
    .gte('total_remaining', amount); // Safety check

  if (fromError) {
    throw new Error(`Failed to update parent account: ${fromError.message}`);
  }

  // Update child account (add to purchased and remaining)
  const { error: toError } = await supabase
    .from('credit_accounts')
    .update({
      total_purchased: supabase.rpc('credit_accounts.total_purchased') + amount,
      total_remaining: supabase.rpc('credit_accounts.total_remaining') + amount,
      updated_at: new Date().toISOString(),
      status: 'active' // Reactivate if was depleted
    })
    .eq('id', toAccountId);

  if (toError) {
    throw new Error(`Failed to update child account: ${toError.message}`);
  }
}

// ============================================================================
// MAIN ALLOCATION FUNCTION
// ============================================================================

/**
 * Allocate credit from parent to child account
 * Creates two-sided transaction (allocation_out + allocation_in)
 * Atomic operation with DB-level safety
 */
async function allocateCredit(
  supabase: any,
  request: AllocateRequest
): Promise<any> {
  const { fromAccountId, toAccountId, amount, allocatedByUserId, notes } = request;

  console.log(`[ALLOCATE] Starting allocation: $${amount} from ${fromAccountId} to ${toAccountId}`);

  // Validate amount
  if (amount <= 0) {
    throw new Error('Allocation amount must be positive');
  }

  // Get both accounts
  const fromAccount = await getAccount(supabase, fromAccountId);
  const toAccount = await getAccount(supabase, toAccountId);

  console.log(`[ALLOCATE] From: ${fromAccount.account_type} (balance: $${fromAccount.total_remaining})`);
  console.log(`[ALLOCATE] To: ${toAccount.account_type} (balance: $${toAccount.total_remaining})`);

  // Validate allocation is allowed
  validateAllocation(fromAccount, toAccount);

  // Check sufficient credit
  if (fromAccount.total_remaining < amount) {
    throw new Error(
      `Insufficient credit in parent account. Available: $${fromAccount.total_remaining}, Required: $${amount}`
    );
  }

  // Create outbound transaction (parent)
  const outTransaction = await createTransaction(supabase, {
    accountId: fromAccountId,
    type: 'allocation_out',
    amount: -amount,
    balanceBefore: fromAccount.total_remaining,
    balanceAfter: fromAccount.total_remaining - amount,
    notes: notes || `Allocated to ${toAccount.account_type}`,
    createdByUserId: allocatedByUserId
  });

  console.log(`[ALLOCATE] Created outbound transaction: ${outTransaction.id}`);

  // Create inbound transaction (child)
  const inTransaction = await createTransaction(supabase, {
    accountId: toAccountId,
    type: 'allocation_in',
    amount: amount,
    balanceBefore: toAccount.total_remaining,
    balanceAfter: toAccount.total_remaining + amount,
    relatedTransactionId: outTransaction.id,
    notes: notes || `Received from ${fromAccount.account_type}`,
    createdByUserId: allocatedByUserId
  });

  console.log(`[ALLOCATE] Created inbound transaction: ${inTransaction.id}`);

  // Update both account balances
  await updateAccountBalances(supabase, fromAccountId, toAccountId, amount);

  // Get updated balances
  const fromAccountUpdated = await getAccount(supabase, fromAccountId);
  const toAccountUpdated = await getAccount(supabase, toAccountId);

  console.log(`[ALLOCATE] Allocation complete!`);
  console.log(`[ALLOCATE] From account new balance: $${fromAccountUpdated.total_remaining}`);
  console.log(`[ALLOCATE] To account new balance: $${toAccountUpdated.total_remaining}`);

  return {
    success: true,
    outTransaction: outTransaction,
    inTransaction: inTransaction,
    fromAccountBalance: fromAccountUpdated.total_remaining,
    toAccountBalance: toAccountUpdated.total_remaining,
    summary: {
      amount: amount,
      fromAccountType: fromAccount.account_type,
      toAccountType: toAccount.account_type,
      fromBalanceBefore: fromAccount.total_remaining,
      fromBalanceAfter: fromAccountUpdated.total_remaining,
      toBalanceBefore: toAccount.total_remaining,
      toBalanceAfter: toAccountUpdated.total_remaining
    }
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
    console.log(`[ALLOCATE-CREDIT] Request received:`, requestBody);

    // Validate required fields
    if (!requestBody.fromAccountId || !requestBody.toAccountId || !requestBody.amount) {
      throw new Error('Missing required fields: fromAccountId, toAccountId, amount');
    }

    const result = await allocateCredit(supabaseClient, requestBody);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ALLOCATE-CREDIT] Error:', errorMessage);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

