/**
 * Client Gift Card Settings Page
 * 
 * Allows client admins to:
 * - View available brands/denominations (enabled by admin)
 * - Toggle which ones they want to use in campaigns
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Switch } from '@/shared/components/ui/switch';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { useToast } from '@/shared/hooks';
import { useEnabledBrands, useToggleClientGiftCard, useClientAvailableGiftCards } from '@/features/gift-cards/hooks';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { useTenant } from '@/contexts/TenantContext';
import { CheckCircle, Gift, Info } from 'lucide-react';

export function ClientGiftCards() {
  const { toast } = useToast();
  const { currentClient } = useTenant();
  const clientId = currentClient?.id;
  
  const { data: enabledBrands, isLoading: brandsLoading } = useEnabledBrands();
  const { data: clientGiftCards } = useClientAvailableGiftCards(clientId);
  const toggleMutation = useToggleClientGiftCard();

  // Fetch denominations for enabled brands
  const { data: allDenominations } = useQuery({
    queryKey: ['all-enabled-denominations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_card_denominations')
        .select('*, gift_card_brands!inner(*)')
        .eq('is_enabled_by_admin', true)
        .eq('gift_card_brands.is_enabled_by_admin', true)
        .order('denomination');

      if (error) throw error;
      return data;
    },
  });

  // Check if a brand-denomination is enabled for this client
  const isEnabled = (brandId: string, denomination: number) => {
    return clientGiftCards?.some(
      (cgc: any) => cgc.brand_id === brandId && cgc.denomination === denomination && cgc.is_enabled
    );
  };

  const handleToggle = async (brandId: string, denomination: number, currentlyEnabled: boolean) => {
    if (!clientId) {
      toast({
        title: 'Error',
        description: 'No client selected',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await toggleMutation.mutateAsync({
        clientId,
        brandId,
        denomination,
        enabled: !currentlyEnabled,
      });
      
      toast({
        title: !currentlyEnabled ? 'Gift card enabled' : 'Gift card disabled',
        description: `This gift card ${!currentlyEnabled ? 'can now' : 'can no longer'} be used in campaigns`,
      });
    } catch (error: any) {
      toast({
        title: 'Failed to update',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (!clientId) {
    return (
      <div className="p-8">
        <Alert>
          <AlertDescription>
            No client context found. Please ensure you are logged in as a client user.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (brandsLoading) {
    return <div>Loading...</div>;
  }

  // Group denominations by brand
  const denominationsByBrand = allDenominations?.reduce((acc: any, denom: any) => {
    const brandId = denom.brand_id;
    if (!acc[brandId]) {
      acc[brandId] = {
        brand: denom.gift_card_brands,
        denominations: [],
      };
    }
    acc[brandId].denominations.push(denom);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Gift Card Settings</h2>
        <p className="text-muted-foreground">
          Select which gift cards you want to use in your campaigns
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Only gift cards you enable here will be available when creating campaigns
        </AlertDescription>
      </Alert>

      {enabledBrands?.length === 0 ? (
        <Alert>
          <AlertDescription>
            No gift cards are currently available. Contact your administrator.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6">
          {Object.values(denominationsByBrand || {}).map((brandData: any) => {
            const brand = brandData.brand;
            const denominations = brandData.denominations;

            return (
              <Card key={brand.id}>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    {brand.logo_url && (
                      <img
                        src={brand.logo_url}
                        alt={brand.brand_name}
                        className="w-12 h-12 rounded object-contain"
                      />
                    )}
                    <div>
                      <CardTitle>{brand.brand_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{brand.category || 'Gift Card'}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {denominations.map((denom: any) => {
                      const enabled = isEnabled(brand.id, denom.denomination);
                      return (
                        <div
                          key={denom.id}
                          className={`p-4 border rounded-lg flex items-center justify-between ${
                            enabled ? 'bg-primary/5 border-primary' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Gift className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">${denom.denomination}</span>
                          </div>
                          <Switch
                            checked={enabled}
                            onCheckedChange={() => handleToggle(brand.id, denom.denomination, enabled)}
                            disabled={toggleMutation.isPending}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {clientGiftCards && clientGiftCards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Enabled Gift Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {clientGiftCards
                .filter((cgc: any) => cgc.is_enabled)
                .map((cgc: any) => (
                  <Badge key={cgc.id} variant="default">
                    {cgc.gift_card_brands.brand_name} - ${cgc.denomination}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ClientGiftCards;

