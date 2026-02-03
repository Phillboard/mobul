/**
 * GiftCardBrandsTab Component
 *
 * Displays all gift card brands with their denominations and CSV inventory counts.
 * Includes actions to manage denominations and upload CSV files per brand.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Settings, Upload } from "lucide-react";
import { useGiftCardBrandsWithDenominations } from "@/features/gift-cards/hooks";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@core/services/supabase";
import { AddBrandDialog } from "./AddBrandDialog";
import { ManageDenominationsDialog } from "./ManageDenominationsDialog";
import { AdminUploadDialog } from "./AdminUploadDialog";

export function GiftCardBrandsTab() {
  const [addBrandDialogOpen, setAddBrandDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<{ id: string; name: string; logoUrl?: string } | null>(null);
  const [selectedBrandDenom, setSelectedBrandDenom] = useState<{ brandId: string; denomination: number } | null>(null);

  const { data: brandsWithDenoms, isLoading } = useGiftCardBrandsWithDenominations(false);

  // Fetch inventory counts per brand
  const { data: inventoryCounts } = useQuery({
    queryKey: ["brand-inventory-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_inventory")
        .select("brand_id, status");
      if (error) throw error;

      const counts = new Map<string, number>();
      data?.forEach((item: any) => {
        if (item.status === "available") {
          counts.set(item.brand_id, (counts.get(item.brand_id) || 0) + 1);
        }
      });
      return counts;
    },
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Available Brands</CardTitle>
          <Button size="sm" onClick={() => setAddBrandDialogOpen(true)}>
            Add Brand
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading brands...</div>
          ) : brandsWithDenoms && brandsWithDenoms.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Denominations</TableHead>
                  <TableHead>Inventory</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brandsWithDenoms.map((brand: any) => {
                  const totalCards = inventoryCounts?.get(brand.id) || 0;

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
                          <span className="text-sm text-muted-foreground">No denominations</span>
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
                              setSelectedBrand({ id: brand.id, name: brand.brand_name, logoUrl: brand.logo_url });
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
                              const firstDenom = brand.denominations?.[0];
                              if (firstDenom) {
                                setSelectedBrandDenom({ brandId: brand.id, denomination: firstDenom.denomination });
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

      <AddBrandDialog open={addBrandDialogOpen} onOpenChange={setAddBrandDialogOpen} />

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
    </>
  );
}
