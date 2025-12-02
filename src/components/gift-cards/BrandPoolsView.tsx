/**
 * BrandPoolsView Component
 * 
 * Purpose: Displays gift card pools organized by brand
 * Used by: GiftCards page
 * 
 * Key Features:
 * - Group pools by brand
 * - Display pool statistics
 * - Quick actions (create pool, upload cards)
 * - Visual brand organization
 * 
 * Related Components: PoolCard, BrandLogo
 */

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Upload } from "lucide-react";
import { PoolCard } from "./PoolCard";
import { BrandLogo } from "./BrandLogo";

interface Pool {
  id: string;
  pool_name: string;
  brand_id: string;
  denomination: number;
  total_cards: number;
  available_cards: number;
  reserved_cards: number;
  is_active: boolean;
  pool_type: string;
  brands?: {
    id: string;
    brand_name: string;
    logo_url: string | null;
  };
}

interface Brand {
  id: string;
  brand_name: string;
  logo_url: string | null;
}

interface BrandPoolsViewProps {
  pools: Pool[];
  brands: Brand[];
  onCreatePool: () => void;
  onUploadCards: (poolId: string) => void;
}

export function BrandPoolsView({ pools, brands, onCreatePool, onUploadCards }: BrandPoolsViewProps) {
  // Group pools by brand
  const poolsByBrand = useMemo(() => {
    const grouped = new Map<string, { brand: Brand; pools: Pool[] }>();

    pools.forEach((pool) => {
      const brandId = pool.brand_id;
      const brand = brands.find(b => b.id === brandId) || pool.brands;

      if (!brand) return;

      if (!grouped.has(brandId)) {
        grouped.set(brandId, { brand: brand as Brand, pools: [] });
      }

      grouped.get(brandId)!.pools.push(pool);
    });

    return Array.from(grouped.values());
  }, [pools, brands]);

  if (pools.length === 0) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-6 mb-4">
            <Plus className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Pools Yet</h3>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            Create your first gift card pool to start managing inventory organized by brand and denomination.
          </p>
          <Button onClick={onCreatePool} size="lg" variant="neon">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Pool
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {poolsByBrand.map(({ brand, pools: brandPools }) => (
        <Card key={brand.id} className="border-2 overflow-hidden">
          <CardHeader className="bg-muted/30 border-b-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <BrandLogo
                  brandName={brand.brand_name}
                  logoUrl={brand.logo_url}
                  size="lg"
                />
                <div>
                  <CardTitle className="text-2xl">{brand.brand_name}</CardTitle>
                  <CardDescription className="text-base mt-1">
                    {brandPools.length} pool{brandPools.length !== 1 ? 's' : ''} •{' '}
                    {brandPools.reduce((sum, p) => sum + p.available_cards, 0)} cards available
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {brandPools.map((pool) => (
                <PoolCard
                  key={pool.id}
                  pool={pool}
                  onUploadCards={() => onUploadCards(pool.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

