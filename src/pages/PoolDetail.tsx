/**
 * PoolDetail Page
 * 
 * Full-page view of a gift card pool with detailed statistics,
 * card listing, balance history, and settings management.
 * 
 * Converted from PoolDetailDialog to full page for better UX
 */

import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Download, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from '@/lib/utils/currencyUtils';
import { calculatePoolStats } from '@/lib/campaign/giftCardUtils";
import { useToast } from "@/hooks/use-toast";
import { PoolStats } from "@/components/gift-cards/PoolStats";
import { PoolCardsTable } from "@/components/gift-cards/PoolCardsTable";
import { PoolBalanceHistory } from "@/components/gift-cards/PoolBalanceHistory";
import { PoolSettings } from "@/components/gift-cards/PoolSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export default function PoolDetail() {
  const { poolId } = useParams<{ poolId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
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
        .eq("user_id', user.id)
        .single();
      
      return { ...user, role: userRole?.role };
    },
  });

  const isAdmin = currentUser?.role === 'admin';

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

  // Fetch all cards in pool
  const { data: cards, isLoading: cardsLoading } = useQuery({
    queryKey: ["gift-cards", poolId],
    queryFn: async () => {
      if (!poolId) return [];
      const { data, error } = await supabase
        .from("gift_cards")
        .select("*")
        .eq("pool_id", poolId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
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

  const handleCheckBalances = async () => {
    if (!poolId || !cards || cards.length === 0) return;

    setIsCheckingBalances(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-gift-card-balance', {
        body: { poolId },
      });

      if (error) throw error;

      toast({
        title: "Balance Check Complete",
        description: `Checked ${data.results?.length || 0} cards. Refresh to see updated balances.`,
      });

      setTimeout(() => {
        window.location.reload();
      }, 1000);
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

  const handleExportCSV = async () => {
    if (!poolId) return;

    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-pool-cards', {
        body: {
          poolId,
          includeSensitiveData: isAdmin,
        },
      });

      if (error) throw error;

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

  if (poolLoading || !pool) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading pool details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const stats = calculatePoolStats(pool);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/gift-cards">Gift Cards</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/gift-cards">
                {pool.gift_card_brands?.brand_name || 'Brand'}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{pool.pool_name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/gift-cards')}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-4">
              {pool.gift_card_brands?.logo_url && (
                <img 
                  src={pool.gift_card_brands.logo_url} 
                  alt={pool.gift_card_brands.brand_name}
                  className="h-16 w-16 object-contain"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold">{pool.pool_name}</h1>
                <p className="text-muted-foreground">
                  {pool.gift_card_brands?.brand_name} • {formatCurrency(pool.card_value)} cards
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={handleCheckBalances}
              disabled={isCheckingBalances || !cards || cards.length === 0}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isCheckingBalances ? 'animate-spin' : ''}`} />
              {isCheckingBalances ? 'Checking...' : 'Check Balances'}
            </Button>
            <Button 
              variant="outline"
              onClick={handleExportCSV}
              disabled={isExporting || !cards || cards.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </div>

        {/* Pool Statistics */}
        <PoolStats stats={stats} />

        {/* Tabs */}
        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="cards">
              <TabsList>
                <TabsTrigger value="cards">Cards ({cards?.length || 0})</TabsTrigger>
                <TabsTrigger value="history">Balance History</TabsTrigger>
                {isAdmin && <TabsTrigger value="settings">Settings</TabsTrigger>}
              </TabsList>

              <TabsContent value="cards" className="mt-6 space-y-6">
                <PoolCardsTable 
                  cards={cards || []}
                  cardValue={Number(pool.card_value)}
                  isLoading={cardsLoading}
                />
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                <PoolBalanceHistory history={balanceHistory || []} />
              </TabsContent>

              {isAdmin && (
                <TabsContent value="settings" className="mt-6">
                  <PoolSettings 
                    pool={pool}
                    isAdmin={isAdmin}
                  />
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

