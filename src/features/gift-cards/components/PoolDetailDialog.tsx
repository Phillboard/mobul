/**
 * PoolDetailDialog Component
 * 
 * Purpose: Comprehensive view of a gift card pool with detailed statistics,
 *          card listing, balance history, and settings management.
 * Used by: BrandPoolsView, AdminGiftCardMarketplace, GiftCards page
 * 
 * Key Features:
 * - Pool statistics overview with utilization metrics
 * - Searchable cards table with reveal/mask functionality
 * - Balance checking (manual trigger for all cards)
 * - CSV export with permission-based masking
 * - Balance check history
 * - Pool settings editor (admin only)
 * - Brand logo and pool name display
 * 
 * Props:
 * @param {string | null} poolId - UUID of pool to display (null closes dialog)
 * @param {boolean} open - Dialog open state
 * @param {(open: boolean) => void} onOpenChange - Callback to control dialog state
 * 
 * State Management:
 * - Queries: pool data, cards, balance history
 * - Mutations: balance checks, CSV export
 * 
 * Related Components: 
 * - PoolStats (statistics cards)
 * - PoolCardsTable (card listing)
 * - PoolBalanceHistory (balance check history)
 * - PoolSettings (configuration editor)
 * 
 * Edge Functions:
 * - check-gift-card-balance: Verifies card balances
 * - export-pool-cards: Generates CSV export
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { callEdgeFunction } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { RefreshCw, Download } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from '@shared/utils/currency';
import { calculatePoolStats } from "@/features/campaigns/utils/giftCardUtils";
import { useToast } from '@shared/hooks';
import { PoolStats } from "./PoolStats";
import { PoolCardsTable } from "./PoolCardsTable";
import { PoolBalanceHistory } from "./PoolBalanceHistory";
import { PoolSettings } from "./PoolSettings";
import { AutoPopulatePoolButton } from "./AutoPopulatePoolButton";
import { USER_ROLES } from '@/shared/utils/terminology';

interface PoolDetailDialogProps {
  poolId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PoolDetailDialog({ poolId, open, onOpenChange }: PoolDetailDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCheckingBalances, setIsCheckingBalances] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch current user to check admin status
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      return { ...user, role: userRole?.role };
    },
  });

  const isAdmin = currentUser?.role === USER_ROLES.ADMIN;

  // Fetch pool details with brand info
  const { data: pool, isLoading: poolLoading } = useQuery({
    queryKey: ["gift-card-pool", poolId],
    queryFn: async () => {
      if (!poolId) return null;
      const { data, error } = await supabase
        .from("gift_card_pools")
        .select("*, gift_card_brands(*)")
        .eq("id", poolId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!poolId,
  });

  // Fetch all cards in pool (from both inventory and legacy tables)
  const { data: cards, isLoading: cardsLoading } = useQuery({
    queryKey: ["gift-cards", poolId],
    queryFn: async () => {
      if (!poolId) return [];

      // Primary: fetch from gift_card_inventory
      const { data: inventoryCards } = await supabase
        .from("gift_card_inventory")
        .select("id, card_code, card_number, denomination, status, current_balance, last_balance_check, balance_check_status, delivered_at, expiration_date, created_at, assigned_to_recipient_id")
        .eq("legacy_pool_id", poolId)
        .order("created_at", { ascending: false });

      // Fallback: fetch any remaining legacy cards
      const { data: legacyCards } = await supabase
        .from("gift_cards")
        .select("*")
        .eq("pool_id", poolId)
        .order("created_at", { ascending: false });

      // Deduplicate by card_code
      const inventoryCodes = new Set((inventoryCards || []).map(c => c.card_code));
      const uniqueLegacy = (legacyCards || []).filter(c => !inventoryCodes.has(c.card_code));

      // Normalize inventory cards to match expected shape
      const normalized = (inventoryCards || []).map(c => ({
        ...c,
        card_value: c.denomination,
        pool_id: poolId,
        expires_at: c.expiration_date,
      }));

      return [...normalized, ...uniqueLegacy];
    },
    enabled: !!poolId,
  });

  // Fetch balance check history for pool cards
  const { data: balanceHistory } = useQuery({
    queryKey: ["balance-history", poolId],
    queryFn: async () => {
      if (!poolId) return [];
      const cardIds = cards?.map(c => c.id) || [];
      if (cardIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("gift_card_balance_history")
        .select("*, gift_cards(card_code)")
        .in("gift_card_id", cardIds)
        .order("checked_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!poolId && !!cards,
  });

  /**
   * Triggers balance check for all cards in the pool
   * Calls check-gift-card-balance edge function
   */
  const handleCheckBalances = async () => {
    if (!poolId || !cards || cards.length === 0) return;

    setIsCheckingBalances(true);
    try {
      const data = await callEdgeFunction<{ results?: any[] }>(
        Endpoints.giftCards.checkBalance,
        { poolId }
      );

      // Invalidate queries to reactively refresh card and balance data
      await queryClient.invalidateQueries({ queryKey: ["gift-cards", poolId] });
      await queryClient.invalidateQueries({ queryKey: ["balance-history", poolId] });
      await queryClient.invalidateQueries({ queryKey: ["gift-card-pool", poolId] });

      toast({
        title: "Balance Check Complete",
        description: `Checked ${data.results?.length || 0} cards. Balances updated.`,
      });
    } catch (error: any) {
      console.error('Balance check error:', error);
      toast({
        title: "Balance Check Failed",
        description: error.message || "Failed to check card balances",
        variant: "destructive",
      });
    } finally {
      setIsCheckingBalances(false);
    }
  };

  /**
   * Exports pool cards to CSV
   * Calls export-pool-cards edge function
   * Permission-based masking: admins get option for full codes
   */
  const handleExportCSV = async () => {
    if (!poolId) return;

    setIsExporting(true);
    try {
      const data = await callEdgeFunction<string>(
        Endpoints.giftCards.exportPool,
        {
          poolId,
          includeSensitiveData: isAdmin, // Only admins can export full codes
        }
      );

      // Create blob and download
      const blob = new Blob([data as string], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pool_${poolId}_cards_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: "CSV file has been downloaded",
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export cards",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!pool) return null;

  // Calculate pool statistics
  const stats = calculatePoolStats(pool);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-full h-[90vh] p-10">
        <DialogHeader className="space-y-6">
          <div className="flex items-center gap-8">
            {pool.gift_card_brands?.logo_url && (
              <img 
                src={pool.gift_card_brands.logo_url} 
                alt={pool.gift_card_brands.brand_name}
                className="h-20 w-20 object-contain"
              />
            )}
            <div>
              <DialogTitle className="text-4xl mb-3">{pool.pool_name}</DialogTitle>
              <p className="text-lg text-muted-foreground">
                {pool.gift_card_brands?.brand_name} • {formatCurrency(pool.card_value)} cards
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Pool Statistics */}
        <PoolStats stats={stats} />

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <Button 
            variant="outline" 
            className="shadow-sm hover:shadow h-12 px-8 text-base"
            onClick={handleCheckBalances}
            disabled={isCheckingBalances || !cards || cards.length === 0}
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${isCheckingBalances ? 'animate-spin' : ''}`} />
            {isCheckingBalances ? 'Checking...' : 'Check All Balances'}
          </Button>
          <Button 
            variant="outline" 
            className="shadow-sm hover:shadow h-12 px-8 text-base"
            onClick={handleExportCSV}
            disabled={isExporting || !cards || cards.length === 0}
          >
            <Download className="h-5 w-5 mr-2" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="cards" className="mt-10">
          <TabsList className="bg-muted/50 h-14 p-1 gap-2">
            <TabsTrigger value="cards" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-8 text-lg h-12">Cards ({cards?.length || 0})</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-8 text-lg h-12">Balance History</TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-8 text-lg h-12">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="cards" className="mt-8 space-y-6 overflow-auto max-h-[50vh]">
            <PoolCardsTable 
              cards={cards || []}
              cardValue={Number(pool.card_value)}
              isLoading={cardsLoading}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-8 overflow-auto max-h-[50vh]">
            <PoolBalanceHistory history={balanceHistory || []} />
          </TabsContent>

          <TabsContent value="settings" className="mt-8 overflow-auto max-h-[50vh]">
            <PoolSettings 
              pool={pool}
              isAdmin={isAdmin}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}