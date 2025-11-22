import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Upload, DollarSign, Package, TrendingUp, ShoppingCart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import { BrandPoolsView } from "@/components/gift-cards/BrandPoolsView";
import { CreatePoolDialogV2 } from "@/components/gift-cards/CreatePoolDialogV2";
import { SellGiftCardsDialog } from "@/components/gift-cards/SellGiftCardsDialog";
import { useGiftCardBrands } from "@/hooks/useGiftCardBrands";
import { RecordPurchaseDialog } from "@/components/gift-cards/RecordPurchaseDialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { AdminUploadDialog } from "@/components/gift-cards/AdminUploadDialog";
import { EditPoolPricingDialog } from "@/components/gift-cards/EditPoolPricingDialog";

export default function AdminGiftCardMarketplace() {
  const [createPoolOpen, setCreatePoolOpen] = useState(false);
  const [sellCardsOpen, setSellCardsOpen] = useState(false);
  const [uploadPoolId, setUploadPoolId] = useState<string | null>(null);
  const [recordPurchaseOpen, setRecordPurchaseOpen] = useState(false);
  const [pricingPool, setPricingPool] = useState<any>(null);

  const { data: brands } = useGiftCardBrands();

  const { data: masterPools, isLoading: poolsLoading } = useQuery({
    queryKey: ["admin-master-pools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_pools")
        .select(`
          *,
          gift_card_brands (
            id,
            brand_name,
            brand_code,
            logo_url,
            category,
            provider
          )
        `)
        .eq("is_master_pool", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: salesData } = useQuery({
    queryKey: ["admin-card-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_card_sales")
        .select(`
          *,
          gift_card_pools!admin_card_sales_master_pool_id_fkey(pool_name, gift_card_brands(brand_name)),
          clients!admin_card_sales_buyer_client_id_fkey(name)
        `)
        .order("sale_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: inventoryPurchases } = useQuery({
    queryKey: ["admin-inventory-purchases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_gift_card_inventory")
        .select("*, gift_card_brands(brand_name)")
        .order("purchase_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const totalInventoryValue = masterPools?.reduce((sum, pool) => 
    sum + (pool.available_cards || 0) * Number(pool.card_value), 0
  ) || 0;

  const totalCardsAvailable = masterPools?.reduce((sum, pool) => 
    sum + (pool.available_cards || 0), 0
  ) || 0;

  const thisMonthRevenue = salesData?.reduce((sum, sale) => 
    sum + Number(sale.total_amount), 0
  ) || 0;

  const thisMonthProfit = salesData?.reduce((sum, sale) => 
    sum + (Number(sale.profit) || 0), 0
  ) || 0;

  const handleUploadClick = (poolId: string) => {
    setUploadPoolId(poolId);
  };

  const handlePricingClick = (pool: any) => {
    setPricingPool(pool);
  };

  return (
    <Layout>
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Platform Gift Card Marketplace</h1>
            <p className="text-muted-foreground">Manage master inventory and sell to clients</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setRecordPurchaseOpen(true)}>
              <Package className="h-4 w-4 mr-2" />
              Record Purchase
            </Button>
            <Button onClick={() => setCreatePoolOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Master Pool
            </Button>
            <Button variant="outline" onClick={() => setSellCardsOpen(true)}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Sell Cards
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Inventory Value
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalInventoryValue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cards Available
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCardsAvailable.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                This Month Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{formatCurrency(thisMonthRevenue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                This Month Profit
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(thisMonthProfit)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="inventory" className="space-y-4">
          <TabsList>
            <TabsTrigger value="inventory">Master Inventory</TabsTrigger>
            <TabsTrigger value="sales">Sales History</TabsTrigger>
            <TabsTrigger value="purchases">Purchase Tracking</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-4">
            {poolsLoading ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Loading master pools...
                </CardContent>
              </Card>
            ) : (
              <BrandPoolsView
                pools={masterPools || []}
                brands={brands || []}
                onCreatePool={() => setCreatePoolOpen(true)}
                onUploadCards={handleUploadClick}
                onEditPricing={handlePricingClick}
              />
            )}
          </TabsContent>

          <TabsContent value="sales" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Pool</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Profit</TableHead>
                      <TableHead>Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No sales yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      salesData?.map((sale) => {
                        const margin = sale.total_amount ? ((sale.profit || 0) / sale.total_amount) * 100 : 0;
                        return (
                          <TableRow key={sale.id}>
                            <TableCell>{format(new Date(sale.sale_date), "MMM d, yyyy")}</TableCell>
                            <TableCell>{sale.clients?.name}</TableCell>
                            <TableCell>
                              {sale.gift_card_pools?.gift_card_brands?.brand_name} - {sale.gift_card_pools?.pool_name}
                            </TableCell>
                            <TableCell>{sale.quantity}</TableCell>
                            <TableCell className="font-semibold">{formatCurrency(sale.total_amount)}</TableCell>
                            <TableCell className="text-success font-semibold">
                              {formatCurrency(sale.profit || 0)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{margin.toFixed(1)}%</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchases" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Purchases</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Cost/Card</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>Supplier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryPurchases?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No purchases recorded yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      inventoryPurchases?.map((purchase) => (
                        <TableRow key={purchase.id}>
                          <TableCell>{format(new Date(purchase.purchase_date), "MMM d, yyyy")}</TableCell>
                          <TableCell>{purchase.gift_card_brands?.brand_name}</TableCell>
                          <TableCell>{purchase.quantity}</TableCell>
                          <TableCell>{formatCurrency(purchase.cost_per_card)}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(purchase.total_cost)}</TableCell>
                          <TableCell>{purchase.supplier_name || 'N/A'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
              </CardHeader>
              <CardContent className="text-center py-12 text-muted-foreground">
                Analytics and reporting features coming soon
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <CreatePoolDialogV2
          open={createPoolOpen}
          onOpenChange={setCreatePoolOpen}
          isMasterPool={true}
        />

        <SellGiftCardsDialog
          open={sellCardsOpen}
          onOpenChange={setSellCardsOpen}
        />

        {uploadPoolId && (
          <AdminUploadDialog
            open={!!uploadPoolId}
            onOpenChange={(open) => !open && setUploadPoolId(null)}
            poolId={uploadPoolId}
          />
        )}

        <RecordPurchaseDialog
          open={recordPurchaseOpen}
          onOpenChange={setRecordPurchaseOpen}
        />

        {pricingPool && (
          <EditPoolPricingDialog
            open={!!pricingPool}
            onOpenChange={(open) => !open && setPricingPool(null)}
            pool={pricingPool}
          />
        )}
      </div>
    </Layout>
  );
}