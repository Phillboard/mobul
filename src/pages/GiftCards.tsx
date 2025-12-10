import { useState } from "react";
import { Layout } from "@/shared/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Button } from "@/shared/components/ui/button";
import { Plus } from "lucide-react";
import { GiftCardUploadTab } from "@/features/gift-cards/components/GiftCardUploadTab";
import { GiftCardInventory } from "@/features/gift-cards/components/GiftCardInventory";
import { DeliveryHistory } from "@/features/gift-cards/components/DeliveryHistory";
import { CreatePoolDialogV2 } from "@/features/gift-cards/components/CreatePoolDialogV2";
import { GiftCardTesting } from "@/features/gift-cards/components/GiftCardTesting";
import { GiftCardAnalytics } from "@/features/gift-cards/components/GiftCardAnalytics";
import { SellGiftCardsDialog } from "@/features/gift-cards/components/SellGiftCardsDialog";
import { BrandPoolsView } from "@/features/gift-cards/components/BrandPoolsView";
import { useGiftCardPools } from '@/features/gift-cards/hooks';
import { useGiftCardBrands } from '@/features/gift-cards/hooks';
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from '@/shared/hooks';
import { ClientMarketplace } from "@/features/gift-cards/components/ClientMarketplace";
import { useAuth } from "@core/auth/AuthProvider";
import { useEffect } from "react";

export default function GiftCards() {
  const { currentClient } = useTenant();
  const { pools, isLoading, createPool } = useGiftCardPools(currentClient?.id);
  const { data: brands = [] } = useGiftCardBrands();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [uploadPoolId, setUploadPoolId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState("pools");
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);
  const { toast } = useToast();
  const { hasRole } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const purchaseStatus = params.get('purchase');
    
    if (purchaseStatus === 'success') {
      toast({
        title: "Purchase successful!",
        description: "Your gift card pool has been created. You can now upload gift cards to it.",
      });
      window.history.replaceState({}, '', '/gift-cards');
    } else if (purchaseStatus === 'cancelled') {
      toast({
        title: "Purchase cancelled",
        description: "Your purchase was cancelled. No charges were made.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/gift-cards');
    }
  }, [toast]);

  const handleUploadClick = (poolId: string) => {
    setUploadPoolId(poolId);
    setActiveTab("inventory");
  };

  const handleCreatePool = (pool: any) => {
    createPool.mutate(pool);
  };

  if (!currentClient) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Please select a client</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Gift Card Manager
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your gift card inventory organized by brand
            </p>
          </div>
          <div className="flex gap-2">
            {hasRole('admin') && (
              <Button variant="outline" onClick={() => setIsSellDialogOpen(true)}>
                Sell Cards
              </Button>
            )}
            <Button variant="neon" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Pool
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pools">Pools</TabsTrigger>
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="activity">Activity & History</TabsTrigger>
            {hasRole('admin') && <TabsTrigger value="analytics">Analytics & Testing</TabsTrigger>}
          </TabsList>

          <TabsContent value="pools" className="space-y-4">
            {isLoading ? (
              <div className="text-center text-muted-foreground">Loading pools...</div>
            ) : (
              <BrandPoolsView
                pools={pools || []}
                brands={brands}
                onCreatePool={() => setIsCreateDialogOpen(true)}
                onUploadCards={handleUploadClick}
              />
            )}
          </TabsContent>

          <TabsContent value="marketplace">
            <ClientMarketplace clientId={currentClient.id} />
          </TabsContent>

          <TabsContent value="inventory">
            <div className="space-y-4">
              <GiftCardUploadTab 
                clientId={currentClient.id} 
                preselectedPoolId={uploadPoolId}
              />
              <GiftCardInventory clientId={currentClient.id} />
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <DeliveryHistory />
          </TabsContent>

          {hasRole('admin') && (
            <TabsContent value="analytics" className="space-y-6">
              <GiftCardAnalytics clientId={currentClient.id} />
              <GiftCardTesting />
            </TabsContent>
          )}
        </Tabs>

        <CreatePoolDialogV2
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        />

        <SellGiftCardsDialog
          open={isSellDialogOpen}
          onOpenChange={setIsSellDialogOpen}
        />

      </div>
    </Layout>
  );
}
