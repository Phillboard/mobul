/**
 * useRevokeGiftCard Hook
 * 
 * Mutation hook for revoking gift cards.
 * Calls the revoke-gift-card edge function and invalidates all affected queries.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@core/services/supabase";
import { useToast } from "@/shared/hooks/use-toast";

interface RevokeGiftCardParams {
  assignmentId: string;
  reason: string;
}

interface RevokeGiftCardResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    assignmentId: string;
    recipientName: string;
    cardValue: number | null;
    brandName: string | null;
    originalStatus: string;
    revokedAt: string;
    revokedBy: string;
    cardReturnedToInventory: boolean;
  };
}

export function useRevokeGiftCard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ assignmentId, reason }: RevokeGiftCardParams): Promise<RevokeGiftCardResponse> => {
      const { data, error } = await supabase.functions.invoke('revoke-gift-card', {
        body: { assignmentId, reason }
      });

      // Handle network/request errors
      if (error) {
        // Check if we have error details in the data (common with HTTP errors)
        const errorMessage = data?.error || data?.message || error.message || 'Failed to revoke gift card';
        console.error('Revoke error:', { error, data, errorMessage });
        throw new Error(errorMessage);
      }

      // Handle business logic errors from the function
      if (!data.success) {
        const errorMessage = data.error || data.message || 'Failed to revoke gift card';
        console.error('Revoke failed:', { data, errorMessage });
        throw new Error(errorMessage);
      }

      return data;
    },

    onSuccess: (data) => {
      // Show success toast
      toast({
        title: "Gift Card Revoked",
        description: data.data?.cardReturnedToInventory 
          ? `Card returned to inventory. Recipient: ${data.data.recipientName}`
          : `Gift card revoked for ${data.data?.recipientName}`,
      });

      // Invalidate all affected query keys
      const queryKeysToInvalidate = [
        'reward-stats',
        'reward-summary', 
        'campaign-gift-deliveries',
        'gift-card-summary',
        'admin-inventory-summary',
        'gift-card-revoke-log',
        'campaign-gift-card-inventory',
        'admin-assigned-cards',
        'recipient-gift-cards',
        'gift-card-billing-ledger',
      ];

      queryKeysToInvalidate.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });

      // Also invalidate any queries that might include these as partial keys
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && (
            key.includes('gift') || 
            key.includes('reward') || 
            key.includes('delivery') ||
            key.includes('inventory')
          );
        }
      });
    },

    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Revoke Failed",
        description: error.message,
      });
    },
  });
}

/**
 * Hook to fetch revoke log entries for audit
 */
export function useRevokeLog(options?: { campaignId?: string; limit?: number }) {
  return {
    queryKey: ['gift-card-revoke-log', options?.campaignId, options?.limit],
    queryFn: async () => {
      let query = supabase
        .from('gift_card_revoke_log')
        .select('*')
        .order('revoked_at', { ascending: false });

      if (options?.campaignId) {
        query = query.eq('campaign_id', options.campaignId);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  };
}
