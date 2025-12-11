/**
 * Admin Gift Card Marketplace - Brand-Denomination System
 * Manage brands, denominations, inventory, and custom pricing
 */

import { Layout } from "@/shared/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Button } from "@/shared/components/ui/button";
import { Plus, Upload, Package, Gift, Settings, DollarSign, CreditCard } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@core/services/supabase";
import { formatCurrency } from '@/shared/utils/utils';
import { useState } from "react";
import { AddBrandDialog } from "@/features/gift-cards/components/AddBrandDialog";
import { ManageDenominationsDialog } from "@/features/gift-cards/components/ManageDenominationsDialog";
import { AdminUploadDialog } from "@/features/gift-cards/components/AdminUploadDialog";
import { useGiftCardBrandsWithDenominations } from '@/features/gift-cards/hooks';
import { Badge } from "@/shared/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { AdminIndividualCardsView } from "@/features/gift-cards/components/AdminIndividualCardsView";
import { ExpandableInventoryRow } from "@/features/gift-cards/components/ExpandableInventoryRow";

export default function AdminGiftCardMarketplace() {
  const [addBrandDialogOpen, setAddBrandDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<{id: string, name: string, logoUrl?: string} | null>(null);
  const [selectedBrandDenom, setSelectedBrandDenom] = useState<{brandId: string, denomination: number} | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Toggle row expansion
  const toggleRowExpansion = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  // Fetch all brands with their denominations
  const { data: brandsWithDenoms, isLoading: brandsLoading } = useGiftCardBrandsWithDenominations(false);

  // Fetch inventory summary
  const { data: inventorySummary } = useQuery({
    queryKey: ["admin-inventory-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_inventory")
        .select(`
          brand_id,
          denomination,
          status,
          gift_card_brands (
            brand_name,
            logo_url
          )
        `);
      
      if (error) throw error;

      // Group by brand and denomination
      const summary = new Map<string, {
        brand_id: string;
        brand_name: string;
        logo_url?: string;
        denomination: number;
        available: number;
        assigned: number;
        delivered: number;
        total_value: number;
      }>();

      data?.forEach((item: any) => {
        const key = `${item.brand_id}-${item.denomination}`;
        if (!summary.has(key)) {
          summary.set(key, {
            brand_id: item.brand_id,
            brand_name: item.gift_card_brands?.brand_name || 'Unknown',
            logo_url: item.gift_card_brands?.logo_url,
            denomination: item.denomination,
            available: 0,
            assigned: 0,
            delivered: 0,
            total_value: 0,
          });
        }

        const stats = summary.get(key)!;
        if (item.status === 'available') stats.available++;
        if (item.status === 'assigned') stats.assigned++;
        if (item.status === 'delivered') stats.delivered++;
        stats.total_value = (stats.available + stats.assigned) * item.denomination;
      });

      return Array.from(summary.values());
    },
  });

  const totalInventoryValue = inventorySummary?.reduce((sum, item) => sum + item.total_value, 0) || 0;
  const totalCardsAvailable = inventorySummary?.reduce((sum, item) => sum + item.available, 0) || 0;
  const totalCardsAssigned = inventorySummary?.reduce((sum, item) => sum + item.assigned, 0) || 0;
  const totalCardsDelivered = inventorySummary?.reduce((sum, item) => sum + item.delivered, 0) || 0;

  return (
    <Layout>
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gift Card Administration</h1>
            <p className="text-muted-foreground">Manage brands, denominations, inventory, and pricing</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setAddBrandDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Brand
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
                CSV Cards Available
              </CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCardsAvailable.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalCardsAssigned} assigned • {totalCardsDelivered} delivered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Brands
              </CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {brandsWithDenoms?.filter(b => b.is_enabled_by_admin || b.is_active).length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Denominations
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {brandsWithDenoms?.reduce((sum, b) => sum + (b.denominations?.length || 0), 0) || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="brands" className="space-y-4">
          <TabsList>
            <TabsTrigger value="brands">Brands & Denominations</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="individual-cards">
              <CreditCard className="h-4 w-4 mr-2" />
              Individual Cards
            </TabsTrigger>
            <TabsTrigger value="pricing">Pricing Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="brands" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Available Brands</CardTitle>
              </CardHeader>
              <CardContent>
                {brandsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading brands...</div>
                ) : brandsWithDenoms && brandsWithDenoms.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Brand</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Denominations</TableHead>
                        <TableHead>CSV Inventory</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {brandsWithDenoms.map((brand: any) => {
                        const brandInventory = inventorySummary?.filter(inv => 
                          brandsWithDenoms.find(b => b.id === inv.brand_id)?.brand_name === brand.brand_name
                        );
                        const totalCards = brandInventory?.reduce((sum, inv) => sum + inv.available, 0) || 0;

                        return (
                          <TableRow key={brand.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {brand.logo_url && (
                                  <img src={brand.logo_url} alt={brand.brand_name} className="h-8 w-auto object-contain" />
                                )}
                                <span className="font-medium">{brand.brand_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {brand.is_enabled_by_admin || brand.is_active ? (
                                <Badge variant="default">Enabled</Badge>
                              ) : (
                                <Badge variant="secondary">Disabled</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {brand.denominations && brand.denominations.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {brand.denominations.map((denom: any) => (
                                    <Badge key={denom.id} variant="outline" className="text-xs">
                                      ${denom.denomination}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">No denominations configured</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={totalCards > 0 ? "default" : "secondary"}>
                                {totalCards} cards
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedBrand({
                                      id: brand.id,
                                      name: brand.brand_name,
                                      logoUrl: brand.logo_url
                                    });
                                    setManageDialogOpen(true);
                                  }}
                                >
                                  <Settings className="h-3 w-3 mr-1" />
                                  Manage
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    // Open upload for first denomination or show selection
                                    const firstDenom = brand.denominations?.[0];
                                    if (firstDenom) {
                                      setSelectedBrandDenom({ 
                                        brandId: brand.id, 
                                        denomination: firstDenom.denomination 
                                      });
                                      setUploadDialogOpen(true);
                                    }
                                  }}
                                >
                                  <Upload className="h-3 w-3 mr-1" />
                                  Upload
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No brands available. Click "Add Brand" to get started.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>CSV Inventory Summary</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Click on a row to expand and view individual cards. Select cards to delete them.
                </p>
              </CardHeader>
              <CardContent>
                {inventorySummary && inventorySummary.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>Brand</TableHead>
                          <TableHead>Denomination</TableHead>
                          <TableHead className="text-right">Available</TableHead>
                          <TableHead className="text-right">Assigned</TableHead>
                          <TableHead className="text-right">Delivered</TableHead>
                          <TableHead className="text-right">Total Value</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventorySummary.map((item) => {
                          const rowKey = `${item.brand_id}-${item.denomination}`;
                          return (
                            <ExpandableInventoryRow
                              key={rowKey}
                              brandId={item.brand_id}
                              brandName={item.brand_name}
                              logoUrl={item.logo_url}
                              denomination={item.denomination}
                              available={item.available}
                              assigned={item.assigned}
                              delivered={item.delivered}
                              totalValue={item.total_value}
                              isExpanded={expandedRows.has(rowKey)}
                              onToggle={() => toggleRowExpansion(rowKey)}
                              onUploadClick={() => {
                                setSelectedBrandDenom({ brandId: item.brand_id, denomination: item.denomination });
                                setUploadDialogOpen(true);
                              }}
                            />
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="font-semibold text-lg mb-2">No CSV inventory yet</h3>
                    <p className="mb-4">Upload gift card codes to enable CSV-first provisioning</p>
                    <p className="text-sm">System will use Tillo API as fallback when CSV inventory is empty</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="individual-cards" className="space-y-4">
            <AdminIndividualCardsView />
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Custom Pricing Configuration</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Set custom prices for gift cards. You can charge any amount (above or below face value).
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-semibold text-lg mb-2">Pricing configuration coming soon</h3>
                  <p className="text-sm">Set custom prices per brand-denomination to control profit margins</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AddBrandDialog 
        open={addBrandDialogOpen} 
        onOpenChange={setAddBrandDialogOpen}
      />

      {selectedBrand && (
        <ManageDenominationsDialog
          open={manageDialogOpen}
          onOpenChange={setManageDialogOpen}
          brandId={selectedBrand.id}
          brandName={selectedBrand.name}
          logoUrl={selectedBrand.logoUrl}
        />
      )}

      {selectedBrandDenom && (
        <AdminUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          brandId={selectedBrandDenom.brandId}
          denomination={selectedBrandDenom.denomination}
        />
      )}
    </Layout>
  );
}

