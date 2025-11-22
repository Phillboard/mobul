import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Gift, Plus, Upload, Eye, AlertCircle, DollarSign } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { PoolDetailDialog } from "./PoolDetailDialog";

type GiftCardPool = Tables<"gift_card_pools">;
type GiftCardBrand = Tables<"gift_card_brands">;

interface BrandPoolsViewProps {
  pools: GiftCardPool[];
  brands: GiftCardBrand[];
  onCreatePool: () => void;
  onUploadCards: (poolId: string) => void;
  onEditPricing?: (pool: GiftCardPool) => void;
}

export function BrandPoolsView({ pools, brands, onCreatePool, onUploadCards, onEditPricing }: BrandPoolsViewProps) {
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  
  // Group pools by brand
  const poolsByBrand = pools.reduce((acc, pool) => {
    const brandId = pool.brand_id || 'unknown';
    if (!acc[brandId]) {
      acc[brandId] = [];
    }
    acc[brandId].push(pool);
    return acc;
  }, {} as Record<string, GiftCardPool[]>);

  const getPoolHealth = (pool: GiftCardPool): 'healthy' | 'warning' | 'critical' => {
    if (pool.available_cards === 0) return 'critical';
    if (pool.available_cards <= (pool.low_stock_threshold || 10)) return 'warning';
    return 'healthy';
  };

  const getHealthColor = (health: 'healthy' | 'warning' | 'critical') => {
    switch (health) {
      case 'healthy': return 'text-success bg-success/10 border-success/20';
      case 'warning': return 'text-warning bg-warning/10 border-warning/20';
      case 'critical': return 'text-destructive bg-destructive/10 border-destructive/20';
    }
  };

  if (pools.length === 0) {
    return (
      <div className="text-center py-12">
        <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No gift card pools yet</h3>
        <p className="text-muted-foreground mb-4">
          Create your first pool to start managing gift cards
        </p>
        <Button onClick={onCreatePool}>
          <Plus className="h-4 w-4 mr-2" />
          Create First Pool
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {brands.map((brand) => {
        const brandPools = poolsByBrand[brand.id] || [];
        if (brandPools.length === 0) return null;

        const totalAvailable = brandPools.reduce((sum, p) => sum + (p.available_cards || 0), 0);
        const totalValue = brandPools.reduce((sum, p) => sum + ((p.available_cards || 0) * p.card_value), 0);
        const hasLowStock = brandPools.some(p => getPoolHealth(p) !== 'healthy');

        return (
          <Card key={brand.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {brand.logo_url ? (
                    <img 
                      src={brand.logo_url} 
                      alt={brand.brand_name}
                      className="h-10 w-auto object-contain"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Gift className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-2xl">{brand.brand_name}</CardTitle>
                    <p className="text-base text-muted-foreground">
                      {totalAvailable} cards available · ${totalValue.toFixed(2)} total value
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={onCreatePool}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Pool
                  </Button>
                </div>
              </div>
              
              {hasLowStock && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    One or more pools have low inventory. Consider adding more cards.
                  </AlertDescription>
                </Alert>
              )}
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                {brandPools.map((pool) => {
                  const health = getPoolHealth(pool);
                  const utilizationPercent = pool.total_cards > 0 
                    ? ((pool.claimed_cards + pool.delivered_cards) / pool.total_cards * 100).toFixed(0)
                    : 0;

                  return (
                    <div 
                      key={pool.id}
                      className={`p-6 rounded-lg border-2 ${getHealthColor(health)} transition-all hover:shadow-md`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-lg">{pool.pool_name}</h4>
                          <p className="text-base text-muted-foreground">
                            ${pool.card_value.toFixed(2)} per card
                          </p>
                        </div>
                        <Badge variant={health === 'healthy' ? 'default' : 'destructive'} className="text-sm px-3 py-1">
                          {pool.available_cards} available
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 mb-4 text-base">
                        <div>
                          <div className="text-muted-foreground">Total</div>
                          <div className="font-semibold text-lg">{pool.total_cards}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Claimed</div>
                          <div className="font-semibold text-lg">{pool.claimed_cards}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Delivered</div>
                          <div className="font-semibold text-lg">{pool.delivered_cards}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Failed</div>
                          <div className="font-semibold text-lg">{pool.failed_cards}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-base">
                          <span className="text-muted-foreground">Utilization</span>
                          <span className="font-medium text-lg">{utilizationPercent}%</span>
                        </div>
                        <div className="h-3 rounded-full bg-background overflow-hidden shadow-inner">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${utilizationPercent}%` }}
                          />
                        </div>
                      </div>
                      
                      {pool.last_auto_balance_check && (
                        <p className="text-sm text-muted-foreground mb-4">
                          Last checked: {formatDistanceToNow(new Date(pool.last_auto_balance_check), { addSuffix: true })}
                        </p>
                      )}
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onUploadCards(pool.id)}
                        >
                          <Upload className="h-3 w-3 mr-2" />
                          Add Cards
                        </Button>
                        {onEditPricing && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onEditPricing(pool)}
                          >
                            <DollarSign className="h-3 w-3 mr-2" />
                            Pricing
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedPoolId(pool.id)}
                        >
                          <Eye className="h-3 w-3 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <PoolDetailDialog
        poolId={selectedPoolId}
        open={!!selectedPoolId}
        onOpenChange={(open) => !open && setSelectedPoolId(null)}
      />
    </div>
  );
}
