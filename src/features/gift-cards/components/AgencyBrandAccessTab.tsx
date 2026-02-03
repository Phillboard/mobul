/**
 * AgencyBrandAccessTab Component
 * 
 * Admin tab for managing which brands/denominations agencies can access.
 * Part of the Admin Gift Cards dashboard.
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/shared/components/ui/dialog";
import { Package, Copy, RefreshCw, CheckCircle2, Search, Building2 } from "lucide-react";
import { 
  useAgencies, 
  useAgencyBrandAccessConfig, 
  useUpdateAgencyBrandAccess,
  useBulkUpdateAgencyBrandAccess,
  useCopyAgencyBrandAccess,
  useInitializeAgencyDefaults,
} from "../hooks/useAgencyBrandAccess";
import { toast } from "sonner";

export function AgencyBrandAccessTab() {
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySourceId, setCopySourceId] = useState<string | null>(null);

  // Data hooks
  const { data: agencies, isLoading: isLoadingAgencies, error: agenciesError } = useAgencies();
  const { data: brandConfig, isLoading: isLoadingConfig } = useAgencyBrandAccessConfig(selectedAgencyId);
  const updateAccess = useUpdateAgencyBrandAccess();
  const bulkUpdate = useBulkUpdateAgencyBrandAccess();
  const copyAccess = useCopyAgencyBrandAccess();
  const initDefaults = useInitializeAgencyDefaults();

  // Filter brands by search
  const filteredBrands = useMemo(() => {
    if (!brandConfig) return [];
    if (!searchQuery) return brandConfig;
    
    const query = searchQuery.toLowerCase();
    return brandConfig.filter(b => 
      b.brandName.toLowerCase().includes(query)
    );
  }, [brandConfig, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!brandConfig) return { total: 0, enabled: 0, brands: 0 };
    
    let enabled = 0;
    let total = 0;
    const brandsWithEnabled = new Set<string>();
    
    brandConfig.forEach(brand => {
      brand.denominations.forEach(d => {
        total++;
        if (d.isEnabled) {
          enabled++;
          brandsWithEnabled.add(brand.brandId);
        }
      });
    });
    
    return { total, enabled, brands: brandsWithEnabled.size };
  }, [brandConfig]);

  // Handle individual toggle
  const handleToggle = (brandId: string, denomination: number, currentValue: boolean) => {
    if (!selectedAgencyId) return;
    
    updateAccess.mutate({
      agencyId: selectedAgencyId,
      brandId,
      denomination,
      isEnabled: !currentValue,
    });
  };

  // Handle enable all for a brand
  const handleEnableAllForBrand = (brandId: string, denominations: Array<{ denomination: number; isEnabled: boolean }>) => {
    if (!selectedAgencyId) return;
    
    const updates = denominations.map(d => ({
      brandId,
      denomination: d.denomination,
      isEnabled: true,
    }));
    
    bulkUpdate.mutate({ agencyId: selectedAgencyId, updates });
  };

  // Handle enable all brands
  const handleEnableAll = () => {
    if (!selectedAgencyId || !brandConfig) return;
    
    const updates: Array<{ brandId: string; denomination: number; isEnabled: boolean }> = [];
    brandConfig.forEach(brand => {
      brand.denominations.forEach(d => {
        updates.push({
          brandId: brand.brandId,
          denomination: d.denomination,
          isEnabled: true,
        });
      });
    });
    
    bulkUpdate.mutate({ agencyId: selectedAgencyId, updates });
  };

  // Handle disable all
  const handleDisableAll = () => {
    if (!selectedAgencyId || !brandConfig) return;
    
    const updates: Array<{ brandId: string; denomination: number; isEnabled: boolean }> = [];
    brandConfig.forEach(brand => {
      brand.denominations.forEach(d => {
        updates.push({
          brandId: brand.brandId,
          denomination: d.denomination,
          isEnabled: false,
        });
      });
    });
    
    bulkUpdate.mutate({ agencyId: selectedAgencyId, updates });
  };

  // Handle copy from another agency
  const handleCopy = () => {
    if (!selectedAgencyId || !copySourceId) return;
    
    copyAccess.mutate({
      sourceAgencyId: copySourceId,
      targetAgencyId: selectedAgencyId,
    }, {
      onSuccess: () => {
        setCopyDialogOpen(false);
        setCopySourceId(null);
      },
    });
  };

  const selectedAgency = agencies?.find(a => a.id === selectedAgencyId);

  return (
    <div className="space-y-6">
      {/* Agency Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Agency Brand Access
          </CardTitle>
          <CardDescription>
            Control which gift card brands and denominations each agency can offer to their clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md">
              {isLoadingAgencies ? (
                <div className="h-10 flex items-center text-sm text-muted-foreground">
                  Loading agencies...
                </div>
              ) : agenciesError ? (
                <div className="text-sm text-destructive">
                  Error loading agencies: {agenciesError.message}
                </div>
              ) : agencies && agencies.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No agencies found. Create agencies first to configure brand access.
                </div>
              ) : (
                <Select
                  value={selectedAgencyId || ""}
                  onValueChange={(value) => setSelectedAgencyId(value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an agency..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agencies?.map((agency) => (
                      <SelectItem key={agency.id} value={agency.id}>
                        {agency.name}
                        {agency.gift_card_markup_percentage ? (
                          <span className="text-muted-foreground ml-2">
                            ({agency.gift_card_markup_percentage}% markup)
                          </span>
                        ) : null}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            {selectedAgencyId && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">
                  {stats.brands} brands enabled
                </Badge>
                <Badge variant="outline">
                  {stats.enabled}/{stats.total} denominations
                </Badge>
                {stats.enabled === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => initDefaults.mutate(selectedAgencyId)}
                    disabled={initDefaults.isPending}
                  >
                    {initDefaults.isPending ? "Setting up..." : "Quick Setup (Starbucks + Dominos)"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Brand Configuration */}
      {selectedAgencyId && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Available Brands for {selectedAgency?.name}
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Copy from Agency Dialog */}
                <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy from Agency
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Copy Brand Configuration</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="text-sm text-muted-foreground mb-4">
                        Copy all brand access settings from another agency to {selectedAgency?.name}.
                        This will overwrite existing settings.
                      </p>
                      <Select
                        value={copySourceId || ""}
                        onValueChange={(value) => setCopySourceId(value || null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select source agency..." />
                        </SelectTrigger>
                        <SelectContent>
                          {agencies?.filter(a => a.id !== selectedAgencyId).map((agency) => (
                            <SelectItem key={agency.id} value={agency.id}>
                              {agency.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCopy} 
                        disabled={!copySourceId || copyAccess.isPending}
                      >
                        {copyAccess.isPending ? "Copying..." : "Copy Settings"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" size="sm" onClick={handleEnableAll}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Enable All
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDisableAll}>
                  Reset
                </Button>
              </div>
            </div>
            
            {/* Search */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 max-w-sm"
              />
            </div>
          </CardHeader>

          <CardContent>
            {isLoadingConfig ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading brand configuration...
              </div>
            ) : filteredBrands.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-2">
                  {searchQuery ? "No brands match your search" : "No brands configured in the system yet"}
                </p>
                {!searchQuery && (
                  <p className="text-sm text-muted-foreground">
                    Go to the <strong>Brands</strong> tab to add gift card brands first, then return here to assign them to agencies.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBrands.map((brand) => {
                  const enabledCount = brand.denominations.filter(d => d.isEnabled).length;
                  const allEnabled = enabledCount === brand.denominations.length;
                  
                  return (
                    <div
                      key={brand.brandId}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      {/* Brand Info */}
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {brand.logoUrl ? (
                          <img
                            src={brand.logoUrl}
                            alt={brand.brandName}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Package className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{brand.brandName}</span>
                          <Badge variant={allEnabled ? "default" : enabledCount > 0 ? "secondary" : "outline"} className="text-xs">
                            {enabledCount}/{brand.denominations.length}
                          </Badge>
                          {!allEnabled && enabledCount < brand.denominations.length && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => handleEnableAllForBrand(brand.brandId, brand.denominations)}
                            >
                              Enable all
                            </Button>
                          )}
                        </div>
                        
                        {/* Denomination Checkboxes */}
                        <div className="flex flex-wrap gap-3">
                          {brand.denominations.map((denom) => (
                            <label
                              key={denom.denomination}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Checkbox
                                checked={denom.isEnabled}
                                onCheckedChange={() => handleToggle(brand.brandId, denom.denomination, denom.isEnabled)}
                                disabled={updateAccess.isPending}
                              />
                              <span className="text-sm">${denom.denomination}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Agency Selected */}
      {!selectedAgencyId && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select an agency to configure their brand access</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
