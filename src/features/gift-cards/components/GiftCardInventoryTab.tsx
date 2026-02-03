/**
 * GiftCardInventoryTab Component
 *
 * Shows inventory summary by brand/denomination with expandable rows.
 * Includes individual cards view and assigned cards view as sub-tabs.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Package, CreditCard, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@core/services/supabase";
import { AdminUploadDialog } from "./AdminUploadDialog";
import { ExpandableInventoryRow } from "./ExpandableInventoryRow";
import { AdminIndividualCardsView } from "./AdminIndividualCardsView";
import { AdminAssignedCardsView } from "./AdminAssignedCardsView";

export function GiftCardInventoryTab() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedBrandDenom, setSelectedBrandDenom] = useState<{ brandId: string; denomination: number } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  // Fetch inventory summary grouped by brand + denomination
  const { data: inventorySummary } = useQuery({
    queryKey: ["admin-inventory-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_inventory")
        .select(`
          brand_id,
          denomination,
          status,
          cost_per_card,
          cost_source,
          gift_card_brands (
            brand_name,
            logo_url
          )
        `);

      if (error) throw error;

      const summary = new Map<string, {
        brand_id: string;
        brand_name: string;
        logo_url?: string;
        denomination: number;
        available: number;
        assigned: number;
        delivered: number;
        total_value: number;
        total_cost: number;
        cost_sources: Set<string>;
        avg_cost: number;
      }>();

      data?.forEach((item: any) => {
        const key = `${item.brand_id}-${item.denomination}`;
        if (!summary.has(key)) {
          summary.set(key, {
            brand_id: item.brand_id,
            brand_name: item.gift_card_brands?.brand_name || "Unknown",
            logo_url: item.gift_card_brands?.logo_url,
            denomination: item.denomination,
            available: 0,
            assigned: 0,
            delivered: 0,
            total_value: 0,
            total_cost: 0,
            cost_sources: new Set(),
            avg_cost: 0,
          });
        }

        const stats = summary.get(key)!;
        if (item.status === "available") stats.available++;
        if (item.status === "assigned") stats.assigned++;
        if (item.status === "delivered") stats.delivered++;
        stats.total_value = (stats.available + stats.assigned) * item.denomination;
        
        // Track costs
        if (item.cost_per_card) {
          stats.total_cost += Number(item.cost_per_card);
        }
        if (item.cost_source) {
          stats.cost_sources.add(item.cost_source);
        }
      });

      // Calculate average costs
      return Array.from(summary.values()).map(s => ({
        ...s,
        avg_cost: (s.available + s.assigned) > 0 
          ? s.total_cost / (s.available + s.assigned) 
          : 0,
        cost_sources: Array.from(s.cost_sources),
      }));
    },
  });

  return (
    <Tabs defaultValue="summary">
      <TabsList>
        <TabsTrigger value="summary">
          <Package className="h-4 w-4 mr-2" />
          Inventory Summary
        </TabsTrigger>
        <TabsTrigger value="individual">
          <CreditCard className="h-4 w-4 mr-2" />
          Individual Cards
        </TabsTrigger>
        <TabsTrigger value="assigned">
          <Users className="h-4 w-4 mr-2" />
          Assigned Cards
        </TabsTrigger>
      </TabsList>

      <TabsContent value="summary" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Inventory by Brand & Denomination</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Click a row to expand and view individual cards.
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
                      <TableHead className="text-right">Avg Cost</TableHead>
                      <TableHead>Source</TableHead>
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
                          avgCost={item.avg_cost}
                          costSources={item.cost_sources}
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
                <h3 className="font-semibold text-lg mb-2">No inventory yet</h3>
                <p className="mb-4">Upload gift card codes or purchase from Tillo to add inventory</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="individual" className="mt-4">
        <AdminIndividualCardsView />
      </TabsContent>

      <TabsContent value="assigned" className="mt-4">
        <AdminAssignedCardsView />
      </TabsContent>

      {selectedBrandDenom && (
        <AdminUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          brandId={selectedBrandDenom.brandId}
          denomination={selectedBrandDenom.denomination}
        />
      )}
    </Tabs>
  );
}
