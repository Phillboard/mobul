import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { useToast } from '@shared/hooks';

interface CreditAccount {
  id: string;
  entity_type: 'platform' | 'agency' | 'client';
  entity_id: string;
  balance: number;
  reserved_balance: number;
  currency: string;
  low_balance_threshold: number;
  created_at: string;
  updated_at: string;
}

interface CreditTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

export function useCreditBalance(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['credit-balance', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_credit_balance', {
          p_entity_type: entityType,
          p_entity_id: entityId
        });
      
      if (error) throw error;
      return data as number;
    },
    enabled: !!entityType && !!entityId,
  });
}

export function useCreditAccount(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['credit-account', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_accounts')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error
      return data as CreditAccount | null;
    },
    enabled: !!entityType && !!entityId,
  });
}

export function useCreditTransactionHistory(
  entityType: string, 
  entityId: string, 
  limit: number = 100
) {
  return useQuery({
    queryKey: ['credit-transactions', entityType, entityId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_credit_transaction_history', {
          p_entity_type: entityType,
          p_entity_id: entityId,
          p_limit: limit
        });
      
      if (error) throw error;
      return data as CreditTransaction[];
    },
    enabled: !!entityType && !!entityId,
  });
}

export function useAllocateCredits() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      amount,
      description,
    }: {
      entityType: string;
      entityId: string;
      amount: number;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .rpc('allocate_credits_atomic', {
          p_entity_type: entityType,
          p_entity_id: entityId,
          p_amount: amount,
          p_description: description,
          p_user_id: (await supabase.auth.getUser()).data.user?.id
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['credit-balance', variables.entityType, variables.entityId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['credit-account', variables.entityType, variables.entityId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['credit-transactions', variables.entityType, variables.entityId] 
      });
      
      toast({
        title: "Credits Allocated",
        description: `Successfully added $${variables.amount.toFixed(2)} in credits`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Allocation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeductCredits() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      amount,
      referenceType,
      referenceId,
      description,
    }: {
      entityType: string;
      entityId: string;
      amount: number;
      referenceType?: string;
      referenceId?: string;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .rpc('deduct_credits_atomic', {
          p_entity_type: entityType,
          p_entity_id: entityId,
          p_amount: amount,
          p_reference_type: referenceType,
          p_reference_id: referenceId,
          p_description: description,
          p_user_id: (await supabase.auth.getUser()).data.user?.id
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['credit-balance', variables.entityType, variables.entityId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['credit-account', variables.entityType, variables.entityId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['credit-transactions', variables.entityType, variables.entityId] 
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Deduction Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useTransferCredits() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fromEntityType,
      fromEntityId,
      toEntityType,
      toEntityId,
      amount,
      description,
    }: {
      fromEntityType: string;
      fromEntityId: string;
      toEntityType: string;
      toEntityId: string;
      amount: number;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .rpc('transfer_credits_atomic', {
          p_from_entity_type: fromEntityType,
          p_from_entity_id: fromEntityId,
          p_to_entity_type: toEntityType,
          p_to_entity_id: toEntityId,
          p_amount: amount,
          p_description: description,
          p_user_id: (await supabase.auth.getUser()).data.user?.id
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate both accounts
      queryClient.invalidateQueries({ 
        queryKey: ['credit-balance', variables.fromEntityType, variables.fromEntityId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['credit-balance', variables.toEntityType, variables.toEntityId] 
      });
      
      toast({
        title: "Transfer Complete",
        description: `Successfully transferred $${variables.amount.toFixed(2)}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Transfer Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook to check if entity has sufficient credits
export function useCheckSufficientCredits(
  entityType: string,
  entityId: string,
  requiredAmount: number
) {
  const { data: balance } = useCreditBalance(entityType, entityId);
  
  return {
    hasSufficientCredits: balance !== undefined && balance >= requiredAmount,
    balance: balance || 0,
    shortfall: balance !== undefined ? Math.max(0, requiredAmount - balance) : requiredAmount,
  };
}

