/**
 * Custom hooks for individual gift card inventory management
 * Provides data fetching, mutations, and balance checking functionality
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { useToast } from '@shared/hooks';

// Types
export interface InventoryCardFilters {
  brandId?: string;
  denomination?: number;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface InventoryCard {
  id: string;
  brand_id: string;
  denomination: number;
  card_code: string;
  card_number: string | null;
  status: string;
  current_balance: number | null;
  last_balance_check: string | null;
  balance_check_status: string | null;
  balance_check_error: string | null;
  expiration_date: string | null;
  uploaded_at: string | null;
  uploaded_by_user_id: string | null;
  upload_batch_id: string | null;
  assigned_to_recipient_id: string | null;
  assigned_to_campaign_id: string | null;
  assigned_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  created_at: string | null;
  gift_card_brands?: {
    brand_name: string;
    logo_url: string | null;
    balance_check_method: string | null;
  };
  recipients?: {
    first_name: string;
    last_name: string;
    email: string | null;
  };
  campaigns?: {
    name: string;
  };
}

export interface BalanceHistoryEntry {
  id: string;
  inventory_card_id: string;
  previous_balance: number | null;
  new_balance: number | null;
  change_amount: number | null;
  check_method: string;
  check_status: string;
  error_message: string | null;
  checked_by_user_id: string | null;
  checked_at: string;
  metadata: Record<string, any> | null;
}

export interface InventorySummary {
  brand_id: string;
  brand_name: string;
  logo_url: string | null;
  balance_check_method: string | null;
  denomination: number;
  available_count: number;
  assigned_count: number;
  delivered_count: number;
  expired_count: number;
  total_count: number;
  total_value: number;
  total_current_balance: number | null;
  unchecked_count: number;
  error_count: number;
  last_balance_check: string | null;
}

// Query keys for cache management
export const inventoryCardKeys = {
  all: ["inventory-cards"] as const,
  lists: () => [...inventoryCardKeys.all, "list"] as const,
  list: (filters: InventoryCardFilters) => [...inventoryCardKeys.lists(), filters] as const,
  details: () => [...inventoryCardKeys.all, "detail"] as const,
  detail: (id: string) => [...inventoryCardKeys.details(), id] as const,
  balanceHistory: (id: string) => [...inventoryCardKeys.all, "balance-history", id] as const,
  summary: () => [...inventoryCardKeys.all, "summary"] as const,
};

/**
 * Hook to fetch individual inventory cards with filters
 */
export function useIndividualCards(filters: InventoryCardFilters = {}) {
  const { brandId, denomination, status, search, limit = 100, offset = 0 } = filters;

  return useQuery({
    queryKey: inventoryCardKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from("gift_card_inventory")
        .select(`
          *,
          gift_card_brands (
            brand_name,
            logo_url,
            balance_check_method
          ),
          recipients (
            first_name,
            last_name,
            email
          ),
          campaigns (
            name
          )
        `)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (brandId) {
        query = query.eq("brand_id", brandId);
      }

      if (denomination) {
        query = query.eq("denomination", denomination);
      }

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      if (search) {
        // Search by last 4 digits of card code
        query = query.ilike("card_code", `%${search}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching inventory cards:", error);
        throw error;
      }

      return {
        cards: data as InventoryCard[],
        total: count || data?.length || 0,
      };
    },
  });
}

/**
 * Hook to fetch a single card's details
 */
export function useCardDetail(cardId: string | null) {
  return useQuery({
    queryKey: inventoryCardKeys.detail(cardId || ""),
    queryFn: async () => {
      if (!cardId) return null;

      const { data, error } = await supabase
        .from("gift_card_inventory")
        .select(`
          *,
          gift_card_brands (
            brand_name,
            logo_url,
            balance_check_method,
            balance_check_url
          ),
          recipients (
            first_name,
            last_name,
            email,
            phone
          ),
          campaigns (
            name,
            status
          )
        `)
        .eq("id", cardId)
        .single();

      if (error) throw error;
      return data as InventoryCard;
    },
    enabled: !!cardId,
  });
}

/**
 * Hook to fetch balance history for a card
 */
export function useCardBalanceHistory(cardId: string | null) {
  return useQuery({
    queryKey: inventoryCardKeys.balanceHistory(cardId || ""),
    queryFn: async () => {
      if (!cardId) return [];

      const { data, error } = await supabase
        .from("gift_card_inventory_balance_history")
        .select("*")
        .eq("inventory_card_id", cardId)
        .order("checked_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as BalanceHistoryEntry[];
    },
    enabled: !!cardId,
  });
}

/**
 * Hook to fetch inventory summary
 */
export function useInventorySummary() {
  return useQuery({
    queryKey: inventoryCardKeys.summary(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_inventory_summary")
        .select("*")
        .order("brand_name", { ascending: true });

      if (error) {
        // If view doesn't exist, fallback to manual aggregation
        console.warn("Summary view not available, using fallback query");
        const { data: cards, error: cardsError } = await supabase
          .from("gift_card_inventory")
          .select(`
            brand_id,
            denomination,
            status,
            current_balance,
            balance_check_status,
            last_balance_check,
            gift_card_brands (
              brand_name,
              logo_url,
              balance_check_method
            )
          `);

        if (cardsError) throw cardsError;

        // Manual aggregation
        const summaryMap = new Map<string, InventorySummary>();
        
        cards?.forEach((card: any) => {
          const key = `${card.brand_id}-${card.denomination}`;
          if (!summaryMap.has(key)) {
            summaryMap.set(key, {
              brand_id: card.brand_id,
              brand_name: card.gift_card_brands?.brand_name || "Unknown",
              logo_url: card.gift_card_brands?.logo_url,
              balance_check_method: card.gift_card_brands?.balance_check_method,
              denomination: card.denomination,
              available_count: 0,
              assigned_count: 0,
              delivered_count: 0,
              expired_count: 0,
              total_count: 0,
              total_value: 0,
              total_current_balance: 0,
              unchecked_count: 0,
              error_count: 0,
              last_balance_check: null,
            });
          }

          const summary = summaryMap.get(key)!;
          summary.total_count++;
          
          if (card.status === "available") summary.available_count++;
          if (card.status === "assigned") summary.assigned_count++;
          if (card.status === "delivered") summary.delivered_count++;
          if (card.status === "expired") summary.expired_count++;
          
          if (card.status === "available" || card.status === "assigned") {
            summary.total_value += card.denomination;
          }
          
          if (card.current_balance) {
            summary.total_current_balance = (summary.total_current_balance || 0) + card.current_balance;
          }
          
          if (card.balance_check_status === "unchecked") summary.unchecked_count++;
          if (card.balance_check_status === "error") summary.error_count++;
          
          if (card.last_balance_check && (!summary.last_balance_check || card.last_balance_check > summary.last_balance_check)) {
            summary.last_balance_check = card.last_balance_check;
          }
        });

        return Array.from(summaryMap.values());
      }

      return data as InventorySummary[];
    },
  });
}

/**
 * Hook to delete a single card
 */
export function useDeleteCard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ cardId, force = false }: { cardId: string; force?: boolean }) => {
      const { data, error } = await supabase
        .rpc("delete_inventory_card", {
          p_card_id: cardId,
          p_force: force,
        });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || "Failed to delete card");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryCardKeys.all });
      toast({
        title: "Card Deleted",
        description: "The gift card has been removed from inventory.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to delete multiple cards
 */
export function useBulkDeleteCards() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ cardIds, force = false }: { cardIds: string[]; force?: boolean }) => {
      const results = await Promise.all(
        cardIds.map(async (cardId) => {
          const { data, error } = await supabase
            .rpc("delete_inventory_card", {
              p_card_id: cardId,
              p_force: force,
            });

          return {
            cardId,
            success: !error && (data as any)?.success,
            error: error?.message || (data as any)?.error,
          };
        })
      );

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      return { results, successCount, failCount };
    },
    onSuccess: ({ successCount, failCount }) => {
      queryClient.invalidateQueries({ queryKey: inventoryCardKeys.all });
      
      if (failCount === 0) {
        toast({
          title: "Cards Deleted",
          description: `Successfully deleted ${successCount} cards.`,
        });
      } else {
        toast({
          title: "Partial Success",
          description: `Deleted ${successCount} cards. ${failCount} cards could not be deleted.`,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Bulk Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to check balance for a single card
 */
export function useCheckCardBalance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (cardId: string) => {
      const { callEdgeFunction } = await import('@core/api/client');
      const { Endpoints } = await import('@core/api/endpoints');
      
      const data = await callEdgeFunction<{
        success: boolean;
        error?: string;
        results?: Array<{
          status: string;
          newBalance?: number;
          error?: string;
        }>;
      }>(Endpoints.giftCards.checkInventoryBalance, { cardIds: [cardId] });

      if (!data.success) throw new Error(data.error || "Balance check failed");

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: inventoryCardKeys.all });
      
      const result = data.results?.[0];
      if (result?.status === "success") {
        toast({
          title: "Balance Checked",
          description: `Current balance: $${result.newBalance?.toFixed(2) || "0.00"}`,
        });
      } else if (result?.status === "manual_required") {
        toast({
          title: "Manual Entry Required",
          description: "This brand requires manual balance entry.",
        });
      } else {
        toast({
          title: "Balance Check Issue",
          description: result?.error || "Could not determine balance",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Balance Check Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to check balances for multiple cards
 */
export function useBulkCheckBalances() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      cardIds, 
      brandId, 
      denomination 
    }: { 
      cardIds?: string[]; 
      brandId?: string; 
      denomination?: number;
    }) => {
      const { callEdgeFunction } = await import('@core/api/client');
      const { Endpoints } = await import('@core/api/endpoints');
      
      const data = await callEdgeFunction<{
        success: boolean;
        error?: string;
        summary?: {
          checked: number;
          success: number;
          error: number;
          manual: number;
        };
      }>(Endpoints.giftCards.checkInventoryBalance, { cardIds, brandId, denomination, limit: 200 });

      if (!data.success) throw new Error(data.error || "Bulk balance check failed");

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: inventoryCardKeys.all });
      
      const { summary } = data;
      toast({
        title: "Balance Check Complete",
        description: `Checked ${summary.checked} cards: ${summary.success} success, ${summary.error} errors, ${summary.manual} require manual entry.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Bulk Balance Check Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to manually update card balance
 */
export function useUpdateCardBalance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      cardId, 
      balance, 
      notes 
    }: { 
      cardId: string; 
      balance: number; 
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .rpc("update_inventory_card_balance", {
          p_card_id: cardId,
          p_new_balance: balance,
          p_status: "manual",
          p_error_message: notes || null,
        });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || "Failed to update balance");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryCardKeys.all });
      toast({
        title: "Balance Updated",
        description: "Card balance has been manually updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to update card notes
 */
export function useUpdateCardNotes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ cardId, notes }: { cardId: string; notes: string }) => {
      const { error } = await supabase
        .from("gift_card_inventory")
        .update({ notes })
        .eq("id", cardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryCardKeys.all });
      toast({
        title: "Notes Updated",
        description: "Card notes have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

