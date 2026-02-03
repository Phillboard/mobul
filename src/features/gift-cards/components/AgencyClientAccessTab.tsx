/**
 * AgencyClientAccessTab Component
 * 
 * Agency-level tab for managing which brands/denominations clients can access.
 * Only shows brands that are enabled for the agency.
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import { Package, CheckCircle2, Search, Users, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { 
  useAgencyClients, 
  useClientBrandAccessConfig, 
  useUpdateClientBrandAccess,
  useBulkUpdateClientBrandAccess,
} from "../hooks/useClientBrandAccess";

interface AgencyClientAccessTabProps {
  agencyId: string;
  agencyName?: string;
}

export function AgencyClientAccessTab({ agencyId, agencyName }: AgencyClientAccessTabProps) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Data hooks
  const { data: clients, isLoading: isLoadingClients } = useAgencyClients(agencyId);
  const { data: brandConfig, isLoading: isLoadingConfig } = useClientBrandAccessConfig(selectedClientId, agencyId);
  const updateAccess = useUpdateClientBrandAccess();
  const bulkUpdate = useBulkUpdateClientBrandAccess();

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
    if (!selectedClientId) return;
    
    updateAccess.mutate({
      clientId: selectedClientId,
      brandId,
      denomination,
      isEnabled: !currentValue,
    });
  };

  // Handle enable all for a brand
  const handleEnableAllForBrand = (brandId: string, denominations: Array<{ denomination: number; isEnabled: boolean }>) => {
    if (!selectedClientId) return;
    
    const updates = denominations.map(d => ({
      brandId,
      denomination: d.denomination,
      isEnabled: true,
    }));
    
    bulkUpdate.mutate({ clientId: selectedClientId, updates });
  };

  // Handle enable all brands
  const handleEnableAll = () => {
    if (!selectedClientId || !brandConfig) return;
    
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
    
    bulkUpdate.mutate({ clientId: selectedClientId, updates });
  };

  // Handle disable all
  const handleDisableAll = () => {
    if (!selectedClientId || !brandConfig) return;
    
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
    
    bulkUpdate.mutate({ clientId: selectedClientId, updates });
  };

  const selectedClient = clients?.find(c => c.id === selectedClientId);

  return (
    <div className="space-y-6">
      {/* Client Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Client Brand Access
          </CardTitle>
          <CardDescription>
            Control which gift card brands and denominations each client can use in their campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <Select
                value={selectedClientId || ""}
                onValueChange={(value) => setSelectedClientId(value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedClientId && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">
                  {stats.brands} brands enabled
                </Badge>
                <Badge variant="outline">
                  {stats.enabled}/{stats.total} denominations
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      {selectedClientId && brandConfig && brandConfig.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            No brands are currently available for your agency. Contact your platform administrator to enable brands for your agency.
          </AlertDescription>
        </Alert>
      )}

      {/* Brand Configuration */}
      {selectedClientId && brandConfig && brandConfig.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Available Brands for {selectedClient?.name}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleEnableAll}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Enable All
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDisableAll}>
                  Reset
                </Button>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Only showing brands enabled for your agency
            </p>
            
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
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No brands match your search" : "No brands available"}
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

      {/* No Client Selected */}
      {!selectedClientId && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a client to configure their brand access</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
