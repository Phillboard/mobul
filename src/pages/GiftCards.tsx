import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PoolCard } from "@/components/gift-cards/PoolCard";
import { GiftCardUploadTab } from "@/components/gift-cards/GiftCardUploadTab";
import { GiftCardInventory } from "@/components/gift-cards/GiftCardInventory";
import { DeliveryHistory } from "@/components/gift-cards/DeliveryHistory";
import { CreatePoolDialog } from "@/components/gift-cards/CreatePoolDialog";
import { GiftCardTesting } from "@/components/gift-cards/GiftCardTesting";
import { GiftCardAnalytics } from "@/components/gift-cards/GiftCardAnalytics";
import { useGiftCardPools } from "@/hooks/useGiftCardPools";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export default function GiftCards() {
  const { currentClient } = useTenant();
  const { pools, isLoading, createPool } = useGiftCardPools(currentClient?.id);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [uploadPoolId, setUploadPoolId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState("pools");
  const { toast } = useToast();
  const { hasRole } = useAuth();

  // Handle purchase success/cancel from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const purchaseStatus = params.get('purchase');
    
    if (purchaseStatus === 'success') {
      toast({
        title: "Purchase successful!",
        description: "Your gift card pool has been created. You can now upload gift cards to it.",
      });
      // Clean up URL
      window.history.replaceState({}, '', '/gift-cards');
    } else if (purchaseStatus === 'cancelled') {
      toast({
        title: "Purchase cancelled",
        description: "Your purchase was cancelled. No charges were made.",
        variant: "destructive",
      });
      // Clean up URL
      window.history.replaceState({}, '', '/gift-cards');
    }
  }, [toast]);

  const handleUploadClick = (poolId: string) => {
    setUploadPoolId(poolId);
    setActiveTab("upload");
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gift Cards</h1>
            <p className="text-muted-foreground mt-1">
              Manage your gift card inventory and deliveries
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Pool
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pools">Pools</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            {hasRole('admin') && <TabsTrigger value="testing">Testing</TabsTrigger>}
          </TabsList>

          <TabsContent value="pools" className="space-y-4">
            {isLoading ? (
              <div className="text-center text-muted-foreground">Loading pools...</div>
            ) : pools?.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  No gift card pools yet. Create your first pool to get started.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Pool
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pools?.map((pool) => (
                  <PoolCard
                    key={pool.id}
                    pool={pool}
                    onUploadClick={handleUploadClick}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload">
            <GiftCardUploadTab 
              clientId={currentClient.id} 
              preselectedPoolId={uploadPoolId}
            />
          </TabsContent>

          <TabsContent value="inventory">
            <GiftCardInventory clientId={currentClient.id} />
          </TabsContent>

          <TabsContent value="deliveries">
            <DeliveryHistory />
          </TabsContent>

          <TabsContent value="analytics">
            <GiftCardAnalytics clientId={currentClient.id} />
          </TabsContent>

          {hasRole('admin') && (
            <TabsContent value="testing">
              <GiftCardTesting />
            </TabsContent>
          )}
        </Tabs>

        <CreatePoolDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onCreatePool={handleCreatePool}
          clientId={currentClient.id}
        />

      </div>
    </Layout>
  );
}
