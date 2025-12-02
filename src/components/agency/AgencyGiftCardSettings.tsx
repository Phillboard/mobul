/**
 * Agency Gift Card Settings Component
 * 
 * Allows agency admins to:
 * - View available brands/denominations
 * - Configure which ones their clients can use
 * - Set agency billing preferences
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useEnabledBrands } from '@/hooks/useGiftCardProvisioning';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Gift, Info, Percent } from 'lucide-react';

interface AgencyGiftCardSettingsProps {
  agencyId: string;
}

export function AgencyGiftCardSettings({ agencyId }: AgencyGiftCardSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: enabledBrands } = useEnabledBrands();

  // Fetch agency settings
  const { data: agency } = useQuery({
    queryKey: ['agency', agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', agencyId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch agency available gift cards
  const { data: agencyGiftCards } = useQuery({
    queryKey: ['agency-available-gift-cards', agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_available_gift_cards')
        .select('*')
        .eq('agency_id', agencyId);

      if (error) throw error;
      return data;
    },
  });

  // Fetch all enabled denominations
  const { data: allDenominations } = useQuery({
    queryKey: ['all-enabled-denominations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_card_denominations')
        .select('*, gift_card_brands!inner(*)')
        .eq('is_enabled_by_admin', true)
        .eq('gift_card_brands.is_enabled_by_admin', true);

      if (error) throw error;
      return data;
    },
  });

  // Toggle agency gift card
  const toggleGiftCard = useMutation({
    mutationFn: async ({
      brandId,
      denomination,
      enabled,
    }: {
      brandId: string;
      denomination: number;
      enabled: boolean;
    }) => {
      if (enabled) {
        const { error } = await supabase.from('agency_available_gift_cards').upsert({
          agency_id: agencyId,
          brand_id: brandId,
          denomination: denomination,
          is_enabled: true,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('agency_available_gift_cards')
          .delete()
          .eq('agency_id', agencyId)
          .eq('brand_id', brandId)
          .eq('denomination', denomination);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-available-gift-cards', agencyId] });
      toast({ title: 'Updated successfully' });
    },
  });

  // Update agency markup
  const updateMarkup = useMutation({
    mutationFn: async (markup: number) => {
      const { error } = await supabase
        .from('agencies')
        .update({ gift_card_markup_percentage: markup })
        .eq('id', agencyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency', agencyId] });
      toast({ title: 'Markup updated' });
    },
  });

  const isEnabled = (brandId: string, denomination: number) => {
    return agencyGiftCards?.some(
      (agc: any) => agc.brand_id === brandId && agc.denomination === denomination && agc.is_enabled
    );
  };

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
        <h2 className="text-2xl font-bold">Agency Gift Card Configuration</h2>
        <p className="text-muted-foreground">
          Configure which gift cards your clients can use
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Agency Markup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Set your markup percentage on gift card sales. This applies to all clients under your agency.
              </AlertDescription>
            </Alert>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label>Markup Percentage</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="7.5"
                  defaultValue={agency?.gift_card_markup_percentage || 0}
                  onBlur={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value !== agency?.gift_card_markup_percentage) {
                      updateMarkup.mutate(value);
                    }
                  }}
                />
              </div>
              <Button onClick={() => updateMarkup.mutate(agency?.gift_card_markup_percentage || 0)}>
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  <CardTitle>{brand.brand_name}</CardTitle>
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
                          onCheckedChange={(checked) =>
                            toggleGiftCard.mutate({
                              brandId: brand.id,
                              denomination: denom.denomination,
                              enabled: checked,
                            })
                          }
                          disabled={toggleGiftCard.isPending}
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
    </div>
  );
}

export default AgencyGiftCardSettings;

