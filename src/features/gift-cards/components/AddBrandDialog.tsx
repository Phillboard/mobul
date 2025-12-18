/**
 * Add Brand Dialog Component
 * 
 * Comprehensive dialog for adding new gift card brands with:
 * - Auto-lookup from popular brands database
 * - Clearbit logo integration
 * - Optional Tillo sync
 * - Manual logo upload
 * - Rich metadata entry
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { useToast } from '@shared/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { useBrandLookup } from '@/features/gift-cards/hooks';
import { useTilloBrandSync } from '@/features/gift-cards/hooks';
import { uploadBrandLogo, fileToDataUrl, downloadAndUploadLogo } from '@/features/gift-cards/lib/logo-upload-utils';
import { generateBrandCode, suggestWebsiteUrl } from '@/features/gift-cards/lib/brand-lookup-service';
import { getAllCategories } from '@/features/gift-cards/lib/popular-brands-db';
import { 
  Loader2, 
  Search, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Sparkles,
  ExternalLink,
  Plus,
  Minus,
  AlertTriangle,
  Settings,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Card } from '@/shared/components/ui/card';
import type { BrandFormData, BalanceCheckMethod } from '@/types/giftCards';

interface AddBrandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddBrandDialog({ open, onOpenChange, onSuccess }: AddBrandDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { lookup, isLooking, lookupResult, reset: resetLookup } = useBrandLookup();
  const { syncWithTilloAsync, isSyncing, syncResult, reset: resetSync } = useTilloBrandSync();

  const [step, setStep] = useState<'name' | 'details'>('name');
  const [brandName, setBrandName] = useState('');
  const [formData, setFormData] = useState<BrandFormData>({
    brand_name: '',
    logo_url: '',
    metadata_source: 'manual',
    balance_check_method: 'manual',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [suggestedDenominations, setSuggestedDenominations] = useState<number[]>([]);
  const [customDenomInput, setCustomDenomInput] = useState('');
  const [showApiConfig, setShowApiConfig] = useState(false);

  // Categories for dropdown
  const categories = getAllCategories();

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('name');
      setBrandName('');
      setFormData({
        brand_name: '',
        logo_url: '',
        metadata_source: 'manual',
        balance_check_method: 'manual',
      });
      setLogoFile(null);
      setLogoPreview('');
      setSuggestedDenominations([]);
      setShowApiConfig(false);
      resetLookup();
      resetSync();
    }
  }, [open, resetLookup, resetSync]);

  // Auto-lookup when brand name changes
  const handleBrandNameChange = async (name: string) => {
    setBrandName(name);
    
    if (name.trim().length >= 3) {
      const result = await lookup(name);
      
      if (result.found) {
        // Map lookup sources to valid database values: 'auto_lookup', 'manual', or 'tillo'
        const metadataSource = (result.source === 'popular_db' || result.source === 'clearbit') 
          ? 'auto_lookup' 
          : 'manual';
        
        // Use the full brand name from the lookup result if available
        const fullBrandName = result.brandName || name;
        setBrandName(fullBrandName); // Update the input field with full name
        
        setFormData({
          brand_name: fullBrandName,
          logo_url: result.logoUrl || '',
          website_url: result.website,
          category: result.category,
          description: result.description,
          brand_colors: result.colors,
          metadata_source: metadataSource,
        });
        setLogoPreview(result.logoUrl || '');
      }
    }
  };

  // Handle logo file upload
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoFile(file);
    const dataUrl = await fileToDataUrl(file);
    setLogoPreview(dataUrl);
    
    // Clear logo URL if file is selected
    setFormData(prev => ({ ...prev, logo_url: '', metadata_source: 'manual' }));
  };

  // Handle Tillo sync
  const handleTilloSync = async () => {
    if (!brandName) return;

    try {
      const result = await syncWithTilloAsync(brandName);
      
      if (result.found && result.tillo_brand_code) {
        setFormData(prev => ({
          ...prev,
          tillo_brand_code: result.tillo_brand_code,
          balance_check_method: 'tillo_api', // Auto-set to Tillo when synced
        }));
        
        if (result.denominations) {
          setSuggestedDenominations(result.denominations);
        }
        
        toast({
          title: 'Tillo sync successful',
          description: `Found brand in Tillo: ${result.brand_name}. Balance checking via Tillo API enabled.`,
        });
      } else {
        toast({
          title: 'Brand not found in Tillo',
          description: 'You can still add this brand manually',
          variant: 'default',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Tillo sync failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Add custom denomination
  const handleAddDenomination = () => {
    const value = parseFloat(customDenomInput);
    if (!isNaN(value) && value > 0 && !suggestedDenominations.includes(value)) {
      setSuggestedDenominations(prev => [...prev, value].sort((a, b) => a - b));
      setCustomDenomInput('');
    }
  };

  // Remove denomination
  const handleRemoveDenomination = (value: number) => {
    setSuggestedDenominations(prev => prev.filter(d => d !== value));
  };

  // Proceed to details step
  const handleProceedToDetails = () => {
    if (!brandName.trim()) {
      toast({
        title: 'Brand name required',
        description: 'Please enter a brand name',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.brand_name) {
      setFormData(prev => ({
        ...prev,
        brand_name: brandName,
        brand_code: generateBrandCode(brandName),
        website_url: prev.website_url || suggestWebsiteUrl(brandName),
      }));
    }

    setStep('details');
  };

  // Save brand mutation
  const saveBrand = useMutation({
    mutationFn: async () => {
      // Validate required fields
      if (!formData.brand_name || !formData.logo_url && !logoFile) {
        throw new Error('Brand name and logo are required');
      }

      let finalLogoUrl = formData.logo_url;

      // Upload logo file if provided
      if (logoFile) {
        const uploadResult = await uploadBrandLogo(logoFile, formData.brand_name);
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Failed to upload logo');
        }
        finalLogoUrl = uploadResult.publicUrl!;
      } else if (finalLogoUrl && !finalLogoUrl.includes('supabase')) {
        // If it's an external URL (like Clearbit), download and store locally
        const downloadResult = await downloadAndUploadLogo(finalLogoUrl, formData.brand_name);
        if (downloadResult.success && downloadResult.publicUrl) {
          finalLogoUrl = downloadResult.publicUrl;
        }
        // If download fails, we'll still try to use the external URL as fallback
      }

      // Insert brand with balance check configuration
      const { data: brand, error: brandError } = await supabase
        .from('gift_card_brands')
        .insert({
          brand_name: formData.brand_name,
          brand_code: formData.brand_code || generateBrandCode(formData.brand_name),
          logo_url: finalLogoUrl,
          website_url: formData.website_url,
          category: formData.category,
          description: formData.description,
          terms_url: formData.terms_url,
          brand_colors: formData.brand_colors,
          tillo_brand_code: formData.tillo_brand_code,
          metadata_source: formData.metadata_source,
          is_enabled_by_admin: true,
          is_active: true,
          // Balance check configuration
          balance_check_method: formData.balance_check_method || 'manual',
          balance_check_url: formData.balance_check_url,
          balance_check_api_endpoint: formData.balance_check_api_endpoint,
          balance_check_config: formData.balance_check_config || {},
        })
        .select()
        .single();

      if (brandError) throw brandError;

      // Insert suggested denominations
      if (suggestedDenominations.length > 0 && brand) {
        const denominations = suggestedDenominations.map(denom => ({
          brand_id: brand.id,
          denomination: denom,
          is_enabled_by_admin: true,
          admin_cost_per_card: denom * 0.95, // Default 5% discount
        }));

        const { error: denomError } = await supabase
          .from('gift_card_denominations')
          .insert(denominations);

        if (denomError) {
          console.error('Failed to insert denominations:', denomError);
          // Don't throw - brand is already created
        }
      }

      return brand;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-card-brands'] });
      toast({
        title: 'Brand added successfully',
        description: `${formData.brand_name} has been added to the marketplace`,
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add brand',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Gift Card Brand</DialogTitle>
          <DialogDescription>
            {step === 'name' 
              ? 'Enter a brand name to automatically look up brand information'
              : 'Complete the brand details and logo'}
          </DialogDescription>
        </DialogHeader>

        {step === 'name' ? (
          <div className="space-y-6">
            {/* Brand Name Input */}
            <div className="space-y-2">
              <Label htmlFor="brand-name">Brand Name *</Label>
              <div className="relative">
                <Input
                  id="brand-name"
                  placeholder="e.g., Starbucks, Amazon, Target"
                  value={brandName}
                  onChange={(e) => handleBrandNameChange(e.target.value)}
                  className="pr-10"
                />
                {isLooking && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                We'll automatically look up brand information as you type
              </p>
            </div>

            {/* Lookup Result */}
            {lookupResult && (
              <Alert className={lookupResult.found ? 'border-green-500' : 'border-yellow-500'}>
                {lookupResult.found ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-yellow-500" />
                )}
                <AlertDescription>
                  {lookupResult.found ? (
                    <div className="space-y-2">
                      <p className="font-semibold">Brand found!</p>
                      <div className="flex items-center gap-3">
                        {logoPreview ? (
                          <img 
                            src={logoPreview} 
                            alt={brandName}
                            className="w-12 h-12 object-contain rounded border bg-white"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center">
                            <span className="text-lg font-bold text-muted-foreground">
                              {brandName.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="text-sm space-y-1">
                          {lookupResult.website && (
                            <p className="text-muted-foreground">
                              Website: {lookupResult.website}
                            </p>
                          )}
                          {lookupResult.category && (
                            <Badge variant="outline">{lookupResult.category.replace('_', ' ')}</Badge>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="mt-2">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Auto-detected from {lookupResult.source === 'popular_db' ? 'database' : 'Clearbit'}
                      </Badge>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold">Brand not found</p>
                      <p className="text-sm">You can add this brand manually with a logo upload</p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Tillo Sync Button */}
            {brandName && (
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTilloSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing with Tillo...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Sync with Tillo (Optional)
                    </>
                  )}
                </Button>
                
                {syncResult?.found && (
                  <Badge variant="default">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Tillo: {syncResult.tillo_brand_code}
                  </Badge>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleProceedToDetails} disabled={!brandName}>
                Continue to Details
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Brand Name (readonly) */}
            <div className="space-y-2">
              <Label>Brand Name *</Label>
              <Input value={formData.brand_name} disabled />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep('name')}
              >
                ← Change brand name
              </Button>
            </div>

            {/* Logo Section */}
            <div className="space-y-3">
              <Label>Brand Logo *</Label>
              
              {logoPreview && (
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    className="w-20 h-20 object-contain rounded bg-white"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      // Replace with initials fallback
                      const fallback = document.createElement('div');
                      fallback.className = 'w-20 h-20 rounded bg-muted flex items-center justify-center text-xl font-bold text-muted-foreground';
                      fallback.textContent = formData.brand_name?.substring(0, 2).toUpperCase() || 'NA';
                      target.replaceWith(fallback);
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Logo preview</p>
                    <p className="text-xs text-muted-foreground">
                      {logoFile ? 'Uploaded file' : 'Auto-detected URL'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview('');
                      setFormData(prev => ({ ...prev, logo_url: '' }));
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {!logoPreview && (
                <div className="space-y-3">
                  <div>
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      onChange={handleLogoFileChange}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, or SVG. Max 2MB.
                    </p>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or enter logo URL
                      </span>
                    </div>
                  </div>

                  <Input
                    placeholder="https://example.com/logo.png"
                    value={formData.logo_url || ''}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, logo_url: e.target.value }));
                      setLogoPreview(e.target.value);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Optional Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="website">Website URL</Label>
                <div className="relative">
                  <Input
                    id="website"
                    placeholder="https://example.com"
                    value={formData.website_url || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                  />
                  {formData.website_url && (
                    <a
                      href={formData.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  className="w-full p-2 border rounded-md"
                  value={formData.category || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="">Select category...</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the brand..."
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="terms">Terms & Conditions URL</Label>
              <Input
                id="terms"
                placeholder="https://example.com/terms"
                value={formData.terms_url || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, terms_url: e.target.value }))}
              />
            </div>

            {/* Balance Check Configuration */}
            <Card className="p-4 bg-muted/30">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <Label className="font-semibold">Balance Check Configuration</Label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="balance-method">Balance Check Method</Label>
                    <Select
                      value={formData.balance_check_method || 'manual'}
                      onValueChange={(value: BalanceCheckMethod) => {
                        setFormData(prev => ({ ...prev, balance_check_method: value }));
                        setShowApiConfig(value === 'tillo_api' || value === 'other_api');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual Entry</SelectItem>
                        <SelectItem value="tillo_api">Tillo API</SelectItem>
                        <SelectItem value="other_api">Other API</SelectItem>
                        <SelectItem value="none">None (Not Supported)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      How card balances will be checked
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="balance-url">Customer Balance Check URL</Label>
                    <Input
                      id="balance-url"
                      placeholder="https://brand.com/check-balance"
                      value={formData.balance_check_url || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, balance_check_url: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      URL customers can use to check their balance
                    </p>
                  </div>
                </div>

                {/* Warning for manual entry */}
                {formData.balance_check_method === 'manual' && (
                  <Alert className="border-yellow-500 bg-yellow-500/10">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <AlertDescription className="text-sm">
                      Manual balance entry requires admin to manually update card balances.
                      Consider using Tillo API for automatic balance checking.
                    </AlertDescription>
                  </Alert>
                )}

                {/* API Configuration */}
                {(showApiConfig || formData.balance_check_method === 'tillo_api' || formData.balance_check_method === 'other_api') && (
                  <div className="space-y-3 pt-2 border-t">
                    <Label className="text-sm text-muted-foreground">API Configuration</Label>
                    
                    {formData.balance_check_method === 'tillo_api' && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Tillo API credentials will be used from platform configuration.
                          {formData.tillo_brand_code && (
                            <span className="block mt-1 font-medium text-green-600">
                              ✓ Tillo Brand Code: {formData.tillo_brand_code}
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {formData.balance_check_method === 'other_api' && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="api-endpoint">API Endpoint</Label>
                          <Input
                            id="api-endpoint"
                            placeholder="https://api.brand.com/v1/balance"
                            value={formData.balance_check_api_endpoint || ''}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              balance_check_api_endpoint: e.target.value 
                            }))}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="api-key">API Key</Label>
                            <Input
                              id="api-key"
                              type="password"
                              placeholder="••••••••"
                              value={formData.balance_check_config?.apiKey || ''}
                              onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                balance_check_config: {
                                  ...prev.balance_check_config,
                                  apiKey: e.target.value
                                }
                              }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="response-path">Response Balance Path</Label>
                            <Input
                              id="response-path"
                              placeholder="data.balance.amount"
                              value={formData.balance_check_config?.responseBalancePath || ''}
                              onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                balance_check_config: {
                                  ...prev.balance_check_config,
                                  responseBalancePath: e.target.value
                                }
                              }))}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Denominations */}
            {(suggestedDenominations.length > 0 || syncResult?.found) && (
              <div className="space-y-3">
                <Label>Suggested Denominations</Label>
                <div className="flex flex-wrap gap-2">
                  {suggestedDenominations.map(denom => (
                    <Badge key={denom} variant="secondary" className="gap-2">
                      ${denom}
                      <button
                        type="button"
                        onClick={() => handleRemoveDenomination(denom)}
                        className="hover:text-destructive"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Add denomination"
                    value={customDenomInput}
                    onChange={(e) => setCustomDenomInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddDenomination()}
                    className="w-32"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddDenomination}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={saveBrand.isPending}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => saveBrand.mutate()}
                disabled={saveBrand.isPending || (!formData.logo_url && !logoFile)}
              >
                {saveBrand.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Brand...
                  </>
                ) : (
                  'Add Brand'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

