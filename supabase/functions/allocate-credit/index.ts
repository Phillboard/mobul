/**
 * Allocate Credit Edge Function
 * 
 * Allocates credits from parent to child account in the hierarchy.
 * Platform → Agency → Client → Campaign
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';
import {
  validateAccountAllocation,
  createTransactionRecord,
  calculateAllocationBalances,
  type CreditAccount,
} from '../_shared/business-rules/credit-rules.ts';

// ============================================================================
// Types
// ============================================================================

interface AllocateRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  allocatedByUserId?: string;
  notes?: string;
}

interface AllocateResponse {
  success: boolean;
  outTransaction: { id: string };
  inTransaction: { id: string };
  fromAccountBalance: number;
  toAccountBalance: number;
  summary: {
    amount: number;
    fromAccountType: string;
    toAccountType: string;
    fromBalanceBefore: number;
    fromBalanceAfter: number;
    toBalanceBefore: number;
    toBalanceAfter: number;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getAccount(
  supabase: ReturnType<typeof createServiceClient>,
  accountId: string
): Promise<CreditAccount> {
  const { data: account, error } = await supabase
    .from('credit_accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (error || !account) {
    throw new ApiError(`Credit account not found: ${error?.message}`, 'NOT_FOUND', 404);
  }

  return account as CreditAccount;
}

async function createTransaction(
  supabase: ReturnType<typeof createServiceClient>,
  params: {
    accountId: string;
    type: 'allocation_out' | 'allocation_in';
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    relatedTransactionId?: string;
    notes?: string;
    createdByUserId?: string;
  }
) {
  const record = createTransactionRecord(params);

  const { data, error } = await supabase
    .from('credit_transactions')
    .insert(record)
    .select()
    .single();

  if (error) {
    throw new ApiError(`Failed to create transaction: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  return data;
}

async function updateAccountBalances(
  supabase: ReturnType<typeof createServiceClient>,
  fromAccountId: string,
  toAccountId: string,
  fromAccount: CreditAccount,
  toAccount: CreditAccount,
  amount: number
): Promise<void> {
  const balances = calculateAllocationBalances(fromAccount, toAccount, amount);

  // Update parent account (deduct from remaining, add to allocated)
  const { error: fromError } = await supabase
    .from('credit_accounts')
    .update({
      total_allocated: balances.fromAllocatedAfter,
      total_remaining: balances.fromBalanceAfter,
      updated_at: new Date().toISOString(),
    })
    .eq('id', fromAccountId)
    .gte('total_remaining', amount);

  if (fromError) {
    throw new ApiError(`Failed to update parent account: ${fromError.message}`, 'DATABASE_ERROR', 500);
  }

  // Update child account (add to purchased and remaining)
  const { error: toError } = await supabase
    .from('credit_accounts')
    .update({
      total_purchased: balances.toPurchasedAfter,
      total_remaining: balances.toBalanceAfter,
      updated_at: new Date().toISOString(),
      status: 'active',
    })
    .eq('id', toAccountId);

  if (toError) {
    throw new ApiError(`Failed to update child account: ${toError.message}`, 'DATABASE_ERROR', 500);
  }
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleAllocateCredit(
  request: AllocateRequest,
  context: AuthContext
): Promise<AllocateResponse> {
  const { fromAccountId, toAccountId, amount, notes } = request;
  const allocatedByUserId = request.allocatedByUserId || context.user.id;

  // Validate required fields
  if (!fromAccountId || !toAccountId || !amount) {
    throw new ApiError('Missing required fields: fromAccountId, toAccountId, amount', 'VALIDATION_ERROR', 400);
  }

  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('allocate-credit');

  console.log(`[ALLOCATE-CREDIT] Starting allocation: $${amount} from ${fromAccountId} to ${toAccountId}`);

  // Get both accounts
  const fromAccount = await getAccount(supabase, fromAccountId);
  const toAccount = await getAccount(supabase, toAccountId);

  console.log(`[ALLOCATE-CREDIT] From: ${fromAccount.account_type} (balance: $${fromAccount.total_remaining})`);
  console.log(`[ALLOCATE-CREDIT] To: ${toAccount.account_type} (balance: $${toAccount.total_remaining})`);

  // Validate allocation using shared business rules
  const validation = validateAccountAllocation({
    fromAccount,
    toAccount,
    amount,
  });

  if (!validation.valid) {
    throw new ApiError(validation.error || 'Invalid allocation', 'VALIDATION_ERROR', 400);
  }

  // Calculate balances
  const balances = calculateAllocationBalances(fromAccount, toAccount, amount);

  // Create outbound transaction (parent)
  const outTransaction = await createTransaction(supabase, {
    accountId: fromAccountId,
    type: 'allocation_out',
    amount: -amount,
    balanceBefore: fromAccount.total_remaining,
    balanceAfter: balances.fromBalanceAfter,
    notes: notes || `Allocated to ${toAccount.account_type}`,
    createdByUserId: allocatedByUserId,
  });

  console.log(`[ALLOCATE-CREDIT] Created outbound transaction: ${outTransaction.id}`);

  // Create inbound transaction (child)
  const inTransaction = await createTransaction(supabase, {
    accountId: toAccountId,
    type: 'allocation_in',
    amount: amount,
    balanceBefore: toAccount.total_remaining,
    balanceAfter: balances.toBalanceAfter,
    relatedTransactionId: outTransaction.id,
    notes: notes || `Received from ${fromAccount.account_type}`,
    createdByUserId: allocatedByUserId,
  });

  console.log(`[ALLOCATE-CREDIT] Created inbound transaction: ${inTransaction.id}`);

  // Update both account balances
  await updateAccountBalances(supabase, fromAccountId, toAccountId, fromAccount, toAccount, amount);

  // Get updated balances
  const fromAccountUpdated = await getAccount(supabase, fromAccountId);
  const toAccountUpdated = await getAccount(supabase, toAccountId);

  console.log(`[ALLOCATE-CREDIT] Allocation complete!`);
  console.log(`[ALLOCATE-CREDIT] From account new balance: $${fromAccountUpdated.total_remaining}`);
  console.log(`[ALLOCATE-CREDIT] To account new balance: $${toAccountUpdated.total_remaining}`);

  // Log activity
  await activityLogger.system('credit_allocated', 'success', {
    userId: allocatedByUserId,
    description: `Credit allocated: $${amount} from ${fromAccount.account_type} to ${toAccount.account_type}`,
    metadata: {
      amount,
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
      from_account_type: fromAccount.account_type,
      to_account_type: toAccount.account_type,
      from_balance_after: fromAccountUpdated.total_remaining,
      to_balance_after: toAccountUpdated.total_remaining,
      notes,
    },
  });

  return {
    success: true,
    outTransaction: { id: outTransaction.id },
    inTransaction: { id: inTransaction.id },
    fromAccountBalance: fromAccountUpdated.total_remaining,
    toAccountBalance: toAccountUpdated.total_remaining,
    summary: {
      amount,
      fromAccountType: fromAccount.account_type,
      toAccountType: toAccount.account_type,
      fromBalanceBefore: fromAccount.total_remaining,
      fromBalanceAfter: fromAccountUpdated.total_remaining,
      toBalanceBefore: toAccount.total_remaining,
      toBalanceAfter: toAccountUpdated.total_remaining,
    },
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleAllocateCredit, {
  requireAuth: true,
  requiredRole: ['admin', 'platform_admin', 'agency_admin'],
  parseBody: true,
  auditAction: 'allocate_credit',
}));
