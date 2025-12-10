import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { GiftCardUploadTab } from "@/components/gift-cards/GiftCardUploadTab";
import { GiftCardInventory } from "@/components/gift-cards/GiftCardInventory";
import { DeliveryHistory } from "@/components/gift-cards/DeliveryHistory";
import { CreatePoolDialogV2 } from "@/components/gift-cards/CreatePoolDialogV2";
import { GiftCardTesting } from "@/components/gift-cards/GiftCardTesting";
import { GiftCardAnalytics } from "@/components/gift-cards/GiftCardAnalytics";
import { SellGiftCardsDialog } from "@/components/gift-cards/SellGiftCardsDialog";
import { BrandPoolsView } from "@/components/gift-cards/BrandPoolsView";
import { useGiftCardPools } from "@/hooks/useGiftCardPools";
import { useGiftCardBrands } from "@/hooks/useGiftCardBrands";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { ClientMarketplace } from "@/components/gift-cards/ClientMarketplace";
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
