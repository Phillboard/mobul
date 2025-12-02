/**
 * Admin Gift Card Brands & Denominations Page
 * 
 * Admin-only page for:
 * - Managing gift card brands (enable/disable)
 * - Configuring denominations for each brand
 * - Setting cost structures
 * - Uploading bulk CSV inventory
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAllBrands } from '@/hooks/useGiftCardProvisioning';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Upload, CheckCircle, XCircle, DollarSign, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { parseGiftCardCsv, generateUploadBatchId } from '@/lib/gift-cards/provisioning-utils';

export default function AdminGiftCardBrands() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: brands, isLoading } = useAllBrands();
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Toggle brand enabled status
  const toggleBrand = useMutation({
    mutationFn: async ({ brandId, enabled }: { brandId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('gift_card_brands')
        .update({ is_enabled_by_admin: enabled })
        .eq('id', brandId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-card-brands'] });
      toast({ title: 'Brand updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update brand', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gift Card Marketplace</h1>
          <p className="text-muted-foreground">
            Manage gift card brands, denominations, and inventory
          </p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Inventory
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Gift Card Inventory</DialogTitle>
              <DialogDescription>
                Upload a CSV file with gift card codes. Format: CardCode, CardNumber (optional), ExpirationDate (optional)
              </DialogDescription>
            </DialogHeader>
            <BulkUploadForm onSuccess={() => setUploadDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div>Loading brands...</div>
      ) : (
        <div className="grid gap-6">
          {brands?.map((brand) => (
            <Card key={brand.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
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
                      <CardDescription>
                        {brand.brand_code} {brand.tillo_brand_code && `• Tillo: ${brand.tillo_brand_code}`}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`brand-${brand.id}`}>Enabled</Label>
                      <Switch
                        id={`brand-${brand.id}`}
                        checked={brand.is_enabled_by_admin}
                        onCheckedChange={(checked) =>
                          toggleBrand.mutate({ brandId: brand.id, enabled: checked })
                        }
                      />
                    </div>
                    {brand.is_enabled_by_admin ? (
                      <Badge variant="default">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="mr-1 h-3 w-3" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DenominationManager brandId={brand.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Component to manage denominations for a brand
function DenominationManager({ brandId }: { brandId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newDenom, setNewDenom] = useState('');
  const [newCost, setNewCost] = useState('');

  const { data: denominations } = useQuery({
    queryKey: ['gift-card-denominations', 'admin', brandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_card_denominations')
        .select('*')
        .eq('brand_id', brandId)
        .order('denomination');

      if (error) throw error;
      return data;
    },
  });

  const addDenomination = useMutation({
    mutationFn: async () => {
      const denom = parseFloat(newDenom);
      const cost = newCost ? parseFloat(newCost) : denom * 0.95;

      if (isNaN(denom) || denom <= 0) {
        throw new Error('Invalid denomination');
      }

      const { error } = await supabase.from('gift_card_denominations').insert({
        brand_id: brandId,
        denomination: denom,
        is_enabled_by_admin: true,
        admin_cost_per_card: cost,
        tillo_cost_per_card: cost,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-card-denominations', 'admin', brandId] });
      setNewDenom('');
      setNewCost('');
      toast({ title: 'Denomination added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add denomination', description: error.message, variant: 'destructive' });
    },
  });

  const toggleDenomination = useMutation({
    mutationFn: async ({ denomId, enabled }: { denomId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('gift_card_denominations')
        .update({ is_enabled_by_admin: enabled })
        .eq('id', denomId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-card-denominations', 'admin', brandId] });
      toast({ title: 'Denomination updated' });
    },
  });

  const deleteDenomination = useMutation({
    mutationFn: async (denomId: string) => {
      const { error } = await supabase
        .from('gift_card_denominations')
        .delete()
        .eq('id', denomId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-card-denominations', 'admin', brandId] });
      toast({ title: 'Denomination removed' });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          placeholder="Denomination ($)"
          value={newDenom}
          onChange={(e) => setNewDenom(e.target.value)}
          className="w-32"
        />
        <Input
          type="number"
          placeholder="Cost ($)"
          value={newCost}
          onChange={(e) => setNewCost(e.target.value)}
          className="w-32"
        />
        <Button onClick={() => addDenomination.mutate()} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {denominations?.map((denom) => (
          <Card key={denom.id} className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">${denom.denomination}</span>
                {denom.admin_cost_per_card && (
                  <span className="text-xs text-muted-foreground">
                    (cost: ${denom.admin_cost_per_card})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={denom.is_enabled_by_admin}
                  onCheckedChange={(checked) =>
                    toggleDenomination.mutate({ denomId: denom.id, enabled: checked })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteDenomination.mutate(denom.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Component for bulk CSV upload
function BulkUploadForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [brandId, setBrandId] = useState('');
  const [denomination, setDenomination] = useState('');
  const [uploading, setUploading] = useState(false);
  const [parseResult, setParseResult] = useState<{ cards: any[]; errors: string[] } | null>(null);

  const { data: brands } = useAllBrands();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    
    // Parse CSV immediately to show preview
    const result = await parseGiftCardCsv(selectedFile);
    setParseResult(result);
  };

  const handleUpload = async () => {
    if (!file || !brandId || !denomination || !parseResult) {
      toast({ title: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    if (parseResult.cards.length === 0) {
      toast({ title: 'No valid cards found in file', variant: 'destructive' });
      return;
    }

    setUploading(true);

    try {
      const batchId = generateUploadBatchId();
      const cards = parseResult.cards.map((card) => ({
        brand_id: brandId,
        denomination: parseFloat(denomination),
        card_code: card.cardCode,
        card_number: card.cardNumber,
        expiration_date: card.expirationDate,
        status: 'available',
        upload_batch_id: batchId,
      }));

      const { error } = await supabase.from('gift_card_inventory').insert(cards);

      if (error) throw error;

      toast({
        title: 'Upload successful',
        description: `${cards.length} cards uploaded`,
      });
      
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <div>
          <Label>Brand</Label>
          <select
            className="w-full p-2 border rounded"
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
          >
            <option value="">Select brand...</option>
            {brands?.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.brand_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>Denomination ($)</Label>
          <Input
            type="number"
            value={denomination}
            onChange={(e) => setDenomination(e.target.value)}
            placeholder="25.00"
          />
        </div>

        <div>
          <Label>CSV File</Label>
          <Input type="file" accept=".csv" onChange={handleFileChange} />
          <p className="text-xs text-muted-foreground mt-1">
            Format: CardCode, CardNumber (optional), ExpirationDate (optional)
          </p>
        </div>
      </div>

      {parseResult && (
        <Alert>
          <Package className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-semibold">{parseResult.cards.length} valid cards found</p>
              {parseResult.errors.length > 0 && (
                <p className="text-destructive text-sm">{parseResult.errors.length} errors found</p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {parseResult && parseResult.errors.length > 0 && (
        <div className="max-h-32 overflow-y-auto text-sm text-destructive space-y-1">
          {parseResult.errors.map((err, idx) => (
            <div key={idx}>{err}</div>
          ))}
        </div>
      )}

      <Button onClick={handleUpload} disabled={uploading || !parseResult} className="w-full">
        {uploading ? 'Uploading...' : `Upload ${parseResult?.cards.length || 0} Cards`}
      </Button>
    </div>
  );
}

