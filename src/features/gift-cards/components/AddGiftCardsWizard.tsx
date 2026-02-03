/**
 * AddGiftCardsWizard Component
 *
 * Guided multi-step wizard that combines the entire admin gift card setup:
 * Step 1: Select or create a brand
 * Step 2: Set denomination and pricing
 * Step 3: Choose inventory source (CSV upload or Tillo purchase)
 * Step 4: Confirmation / Done
 *
 * Replaces the need to navigate multiple pages/dialogs for the common
 * "add gift cards to the system" workflow.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Separator } from '@/shared/components/ui/separator';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  ShoppingCart,
  Plus,
  Loader2,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { callEdgeFunction } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';
import { useToast } from '@shared/hooks';
import { BrandLogo } from './BrandLogo';
import { FileUploadZone } from '@/features/audiences/components/FileUploadZone';

// ============================================================================
// Types
// ============================================================================

interface AddGiftCardsWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

interface WizardState {
  // Step 1: Brand
  brandId: string | null;
  brandName: string;
  isNewBrand: boolean;
  // Step 2: Denomination
  denomination: number;
  // Step 3: Source
  source: 'csv' | 'manual' | null;
  csvFile: File | null;
}

type WizardStep = 1 | 2 | 3 | 4;

const COMMON_DENOMINATIONS = [5, 10, 15, 20, 25, 50, 100, 250, 500];

// ============================================================================
// Component
// ============================================================================

export function AddGiftCardsWizard({ open, onOpenChange, onComplete }: AddGiftCardsWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<WizardStep>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const [state, setState] = useState<WizardState>({
    brandId: null,
    brandName: '',
    isNewBrand: false,
    denomination: 25,
    source: null,
    csvFile: null,
  });

  // Fetch existing brands
  const { data: existingBrands } = useQuery({
    queryKey: ['all-gift-card-brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_card_brands')
        .select('*')
        .order('brand_name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Reset state when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setStep(1);
      setState({
        brandId: null,
        brandName: '',
        isNewBrand: false,
        denomination: 25,
        source: null,
        csvFile: null,
      });
    }
    onOpenChange(isOpen);
  };

  // ============================================================================
  // Step Handlers
  // ============================================================================

  const handleSelectBrand = (brandId: string, brandName: string) => {
    setState(s => ({ ...s, brandId, brandName, isNewBrand: false }));
    setStep(2);
  };

  const handleCreateNewBrand = async () => {
    if (!state.brandName.trim()) return;

    setIsProcessing(true);
    try {
      const { data: newBrand, error } = await supabase
        .from('gift_card_brands')
        .insert({
          brand_name: state.brandName.trim(),
          brand_code: state.brandName.trim().toUpperCase().replace(/\s+/g, '_'),
          is_enabled_by_admin: true,
        })
        .select('id, brand_name')
        .single();

      if (error) throw error;

      setState(s => ({ ...s, brandId: newBrand.id, isNewBrand: true }));
      await queryClient.invalidateQueries({ queryKey: ['all-gift-card-brands'] });
      setStep(2);
    } catch (error: any) {
      toast({
        title: 'Failed to create brand',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetDenomination = async () => {
    if (!state.brandId || !state.denomination) return;

    setIsProcessing(true);
    try {
      // Ensure denomination exists for this brand
      const { error } = await supabase
        .from('gift_card_denominations')
        .upsert({
          brand_id: state.brandId,
          denomination: state.denomination,
          is_enabled_by_admin: true,
          cost_basis: state.denomination * 0.95,
        }, { onConflict: 'brand_id,denomination' });

      if (error) throw error;

      setStep(3);
    } catch (error: any) {
      toast({
        title: 'Failed to set denomination',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCsvUpload = async () => {
    if (!state.csvFile) return;

    setIsProcessing(true);
    try {
      const csvContent = await state.csvFile.text();

      const data = await callEdgeFunction<{
        success: boolean;
        imported: number;
        duplicates: number;
        pool_id?: string;
      }>(Endpoints.giftCards.import, {
        csv_content: csvContent,
        brand_id: state.brandId,
        card_value: state.denomination,
        pool_name: `${state.brandName}_$${state.denomination}_${new Date().toISOString().split('T')[0]}`,
        provider: state.brandName,
      });

      toast({
        title: 'Import Complete',
        description: `Imported ${data.imported} cards${data.duplicates > 0 ? ` (${data.duplicates} duplicates skipped)` : ''}`,
      });

      await queryClient.invalidateQueries({ queryKey: ['gift-card-pools'] });
      await queryClient.invalidateQueries({ queryKey: ['gift-cards'] });
      setStep(4);
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinish = () => {
    handleOpenChange(false);
    onComplete?.();
  };

  // ============================================================================
  // Render Steps
  // ============================================================================

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              s < step
                ? 'bg-primary text-primary-foreground'
                : s === step
                ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {s < step ? <Check className="h-4 w-4" /> : s}
          </div>
          {s < 4 && (
            <div
              className={`w-8 h-0.5 ${s < step ? 'bg-primary' : 'bg-muted'}`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <Label>Search or create a brand</Label>
        <Input
          placeholder="Type a brand name (e.g., Amazon, Starbucks)"
          value={state.brandName}
          onChange={(e) => setState(s => ({ ...s, brandName: e.target.value }))}
          autoFocus
        />
      </div>

      {state.brandName.length >= 2 && (
        <>
          {/* Matching existing brands */}
          {existingBrands
            ?.filter((b) =>
              b.brand_name.toLowerCase().includes(state.brandName.toLowerCase())
            )
            .slice(0, 5)
            .map((brand) => (
              <Card
                key={brand.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleSelectBrand(brand.id, brand.brand_name)}
              >
                <CardContent className="flex items-center gap-3 p-3">
                  <BrandLogo
                    logoUrl={brand.logo_url}
                    brandName={brand.brand_name}
                    brandWebsite={null}
                    size="sm"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{brand.brand_name}</p>
                    {brand.category && (
                      <p className="text-xs text-muted-foreground">{brand.category}</p>
                    )}
                  </div>
                  <Badge variant={brand.is_enabled_by_admin ? 'default' : 'secondary'}>
                    {brand.is_enabled_by_admin ? 'Active' : 'Disabled'}
                  </Badge>
                </CardContent>
              </Card>
            ))}

          {/* Create new brand option */}
          <Separator />
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleCreateNewBrand}
            disabled={isProcessing || !state.brandName.trim()}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Create new brand: "{state.brandName.trim()}"
          </Button>
        </>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <Check className="h-4 w-4 text-primary" />
        <span className="text-sm">Brand: <strong>{state.brandName}</strong></span>
      </div>

      <div>
        <Label>Select card denomination</Label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {COMMON_DENOMINATIONS.map((d) => (
            <Button
              key={d}
              variant={state.denomination === d ? 'default' : 'outline'}
              size="sm"
              onClick={() => setState(s => ({ ...s, denomination: d }))}
            >
              ${d}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label>Or enter custom amount</Label>
        <Input
          type="number"
          min={1}
          max={1000}
          value={state.denomination}
          onChange={(e) => setState(s => ({ ...s, denomination: Number(e.target.value) }))}
          className="mt-1"
        />
      </div>

      <Button
        onClick={handleSetDenomination}
        disabled={isProcessing || !state.denomination}
        className="w-full"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <ArrowRight className="h-4 w-4 mr-2" />
        )}
        Continue with ${state.denomination} cards
      </Button>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <Check className="h-4 w-4 text-primary" />
        <span className="text-sm">
          Brand: <strong>{state.brandName}</strong> | Denomination: <strong>${state.denomination}</strong>
        </span>
      </div>

      <Label>How do you want to add cards?</Label>

      <div className="grid grid-cols-1 gap-3">
        <Card
          className={`cursor-pointer transition-colors ${
            state.source === 'csv' ? 'ring-2 ring-primary' : 'hover:bg-accent/50'
          }`}
          onClick={() => setState(s => ({ ...s, source: 'csv' }))}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <Upload className="h-8 w-8 text-primary" />
            <div>
              <p className="font-semibold">Upload CSV</p>
              <p className="text-sm text-muted-foreground">
                Import card codes from a CSV file
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${
            state.source === 'manual' ? 'ring-2 ring-primary' : 'hover:bg-accent/50'
          }`}
          onClick={() => {
            setState(s => ({ ...s, source: 'manual' }));
            setStep(4);
          }}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <ShoppingCart className="h-8 w-8 text-primary" />
            <div>
              <p className="font-semibold">Set up for later</p>
              <p className="text-sm text-muted-foreground">
                Configure brand and denomination now, add cards later
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {state.source === 'csv' && (
        <div className="space-y-3">
          <FileUploadZone
            onFileSelect={(file) => setState(s => ({ ...s, csvFile: file }))}
            accept={{ 'text/csv': ['.csv'] }}
            maxSize={10 * 1024 * 1024}
          />
          {state.csvFile && (
            <Alert>
              <AlertDescription>
                Ready: {state.csvFile.name} ({(state.csvFile.size / 1024).toFixed(1)} KB)
              </AlertDescription>
            </Alert>
          )}
          <Button
            onClick={handleCsvUpload}
            disabled={isProcessing || !state.csvFile}
            className="w-full"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload Cards
          </Button>
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4 text-center">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Check className="h-8 w-8 text-primary" />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Setup Complete</h3>
        <p className="text-muted-foreground mt-1">
          {state.brandName} ${state.denomination} cards are ready
          {state.source === 'csv' ? ' and inventory has been uploaded' : ' for inventory to be added'}
        </p>
      </div>

      <Button onClick={handleFinish} className="w-full">
        Done
      </Button>
    </div>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  const stepTitles: Record<WizardStep, string> = {
    1: 'Select Brand',
    2: 'Set Denomination',
    3: 'Add Inventory',
    4: 'Complete',
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Gift Cards</DialogTitle>
          <DialogDescription>
            {stepTitles[step]}
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}

        {/* Back button for steps 2-3 */}
        {step > 1 && step < 4 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((step - 1) as WizardStep)}
            className="mt-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
