/**
 * Edit Brand Dialog Component
 * 
 * Dialog for editing existing gift card brands
 * Allows updating all brand metadata except the brand code
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@shared/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { uploadBrandLogo, fileToDataUrl, deleteBrandLogo } from '@/lib/gift-cards/logo-upload-utils';
import { getAllCategories } from '@/lib/gift-cards/popular-brands-db';
import { Loader2, ExternalLink, XCircle, Upload } from 'lucide-react';
import type { GiftCardBrand } from '@/types/giftCards';

interface EditBrandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: GiftCardBrand | null;
  onSuccess?: () => void;
}

export function EditBrandDialog({ open, onOpenChange, brand, onSuccess }: EditBrandDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Partial<GiftCardBrand>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [isChangingLogo, setIsChangingLogo] = useState(false);

  const categories = getAllCategories();

  // Initialize form when brand changes
  useEffect(() => {
    if (brand && open) {
      setFormData(brand);
      setLogoPreview(brand.logo_url || '');
      setLogoFile(null);
      setIsChangingLogo(false);
    }
  }, [brand, open]);

  // Handle logo file upload
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoFile(file);
    const dataUrl = await fileToDataUrl(file);
    setLogoPreview(dataUrl);
  };

  // Handle cancel logo change
  const handleCancelLogoChange = () => {
    setLogoFile(null);
    setLogoPreview(brand?.logo_url || '');
    setIsChangingLogo(false);
  };

  // Update brand mutation
  const updateBrand = useMutation({
    mutationFn: async () => {
      if (!brand || !formData.brand_name) {
        throw new Error('Brand name is required');
      }

      let finalLogoUrl = formData.logo_url;

      // Upload new logo if file is provided
      if (logoFile) {
        const uploadResult = await uploadBrandLogo(
          logoFile,
          formData.brand_name,
          brand.logo_url
        );
        
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Failed to upload logo');
        }
        
        finalLogoUrl = uploadResult.publicUrl!;
      }

      // Update brand in database
      const { error } = await supabase
        .from('gift_card_brands')
        .update({
          brand_name: formData.brand_name,
          logo_url: finalLogoUrl,
          website_url: formData.website_url,
          category: formData.category,
          description: formData.description,
          terms_url: formData.terms_url,
          brand_colors: formData.brand_colors,
          tillo_brand_code: formData.tillo_brand_code,
          updated_at: new Date().toISOString(),
        })
        .eq('id', brand.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-card-brands'] });
      toast({
        title: 'Brand updated successfully',
        description: `${formData.brand_name} has been updated`,
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update brand',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete logo mutation
  const deleteLogo = useMutation({
    mutationFn: async () => {
      if (!brand?.logo_url) return;

      // Delete from storage if it's our uploaded file
      if (brand.logo_url.includes('gift-card-brand-logos')) {
        await deleteBrandLogo(brand.logo_url);
      }

      // Update database to remove logo URL
      const { error } = await supabase
        .from('gift_card_brands')
        .update({ logo_url: null })
        .eq('id', brand.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-card-brands'] });
      setLogoPreview('');
      setFormData(prev => ({ ...prev, logo_url: undefined }));
      toast({
        title: 'Logo deleted',
        description: 'Brand logo has been removed',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete logo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (!brand) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Brand: {brand.brand_name}</DialogTitle>
          <DialogDescription>
            Update brand information and metadata
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Brand Name */}
          <div className="space-y-2">
            <Label htmlFor="brand-name">Brand Name *</Label>
            <Input
              id="brand-name"
              value={formData.brand_name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, brand_name: e.target.value }))}
            />
          </div>

          {/* Brand Code (readonly) */}
          <div className="space-y-2">
            <Label>Brand Code</Label>
            <Input value={brand.brand_code} disabled />
            <p className="text-xs text-muted-foreground">
              Brand code cannot be changed
            </p>
          </div>

          {/* Logo Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Brand Logo *</Label>
              {!isChangingLogo && logoPreview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsChangingLogo(true)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Change Logo
                </Button>
              )}
            </div>

            {logoPreview && !isChangingLogo ? (
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <img 
                  src={logoPreview} 
                  alt="Brand logo" 
                  className="w-20 h-20 object-contain rounded"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">Current logo</p>
                  {brand.metadata_source && (
                    <Badge variant="outline" className="mt-1">
                      {brand.metadata_source}
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteLogo.mutate()}
                  disabled={deleteLogo.isPending}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {logoFile && (
                  <div className="flex items-center gap-4 p-4 border rounded-lg">
                    <img 
                      src={logoPreview} 
                      alt="New logo preview" 
                      className="w-20 h-20 object-contain rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">New logo preview</p>
                      <p className="text-xs text-muted-foreground">{logoFile.name}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelLogoChange}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {!logoFile && (
                  <>
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

                    {isChangingLogo && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelLogoChange}
                      >
                        Cancel
                      </Button>
                    )}
                  </>
                )}
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
            <Label htmlFor="tillo-code">Tillo Brand Code</Label>
            <Input
              id="tillo-code"
              placeholder="e.g., STARBUCKS"
              value={formData.tillo_brand_code || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, tillo_brand_code: e.target.value }))}
            />
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

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={updateBrand.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => updateBrand.mutate()}
              disabled={updateBrand.isPending || !formData.brand_name}
            >
              {updateBrand.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

