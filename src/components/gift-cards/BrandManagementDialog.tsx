import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Image, X, Save } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

interface Brand {
  id: string;
  brand_name: string;
  brand_code: string;
  logo_url?: string | null;
  category?: string | null;
  provider?: string | null;
  balance_check_url?: string | null;
  redemption_instructions?: string | null;
  is_active: boolean;
}

interface BrandManagementDialogProps {
  brand?: Brand | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
}

const BRAND_CATEGORIES = [
  'food',
  'retail',
  'entertainment',
  'travel',
  'gas',
  'grocery',
  'clothing',
  'electronics',
  'home',
  'other'
];

export function BrandManagementDialog({
  brand,
  open,
  onOpenChange,
  mode
}: BrandManagementDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    brand_name: brand?.brand_name || '',
    brand_code: brand?.brand_code || '',
    logo_url: brand?.logo_url || '',
    category: brand?.category || 'other',
    provider: brand?.provider || '',
    balance_check_url: brand?.balance_check_url || '',
    redemption_instructions: brand?.redemption_instructions || '',
    is_active: brand?.is_active ?? true,
  });
  
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(brand?.logo_url || null);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (mode === 'edit' && brand) {
        const { error } = await supabase
          .from('gift_card_brands')
          .update(data)
          .eq('id', brand.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('gift_card_brands')
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-card-brands'] });
      toast({
        title: mode === 'edit' ? 'Brand Updated' : 'Brand Created',
        description: `${formData.brand_name} has been ${mode === 'edit' ? 'updated' : 'created'} successfully`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an image file (PNG, JPG, SVG)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Logo must be smaller than 2MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `brand-logos/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('public-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('public-assets')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, logo_url: urlData.publicUrl }));
      setPreviewUrl(urlData.publicUrl);
      
      toast({
        title: 'Logo Uploaded',
        description: 'Brand logo has been uploaded successfully',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload logo',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUrlInput = (url: string) => {
    setFormData(prev => ({ ...prev, logo_url: url }));
    setPreviewUrl(url);
  };

  const clearLogo = () => {
    setFormData(prev => ({ ...prev, logo_url: '' }));
    setPreviewUrl(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.brand_name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Brand name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.brand_code.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Brand code is required',
        variant: 'destructive',
      });
      return;
    }

    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Edit Brand' : 'Create New Brand'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' 
              ? 'Update the gift card brand details and logo'
              : 'Add a new gift card brand to the marketplace'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Upload Section */}
          <div className="space-y-4">
            <Label>Brand Logo</Label>
            <div className="flex items-start gap-6">
              {/* Preview */}
              <div className="flex-shrink-0">
                {previewUrl ? (
                  <div className="relative">
                    <img 
                      src={previewUrl} 
                      alt="Logo preview" 
                      className="h-24 w-24 object-contain border rounded-lg bg-white"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={clearLogo}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <BrandLogo 
                    brand={{ brand_name: formData.brand_name || 'Brand' }} 
                    size="xl" 
                  />
                )}
              </div>

              {/* Upload Options */}
              <div className="flex-1 space-y-3">
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="logo-upload"
                    disabled={uploading}
                  />
                  <label htmlFor="logo-upload">
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer"
                      disabled={uploading}
                      asChild
                    >
                      <span>
                        {uploading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Upload Logo
                      </span>
                    </Button>
                  </label>
                  <span className="text-xs text-muted-foreground ml-2">
                    PNG, JPG, or SVG (max 2MB)
                  </span>
                </div>
                
                <div className="text-xs text-muted-foreground">or enter URL:</div>
                <Input
                  placeholder="https://example.com/logo.png"
                  value={formData.logo_url}
                  onChange={(e) => handleUrlInput(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Brand Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brand_name">Brand Name *</Label>
              <Input
                id="brand_name"
                placeholder="e.g., Starbucks"
                value={formData.brand_name}
                onChange={(e) => setFormData(prev => ({ ...prev, brand_name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand_code">Brand Code *</Label>
              <Input
                id="brand_code"
                placeholder="e.g., STARBUCKS"
                value={formData.brand_code}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  brand_code: e.target.value.toUpperCase().replace(/\s/g, '_') 
                }))}
                required
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier (auto-uppercase, no spaces)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {BRAND_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Input
                id="provider"
                placeholder="e.g., Tango, Blackhawk"
                value={formData.provider}
                onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance_check_url">Balance Check URL</Label>
            <Input
              id="balance_check_url"
              type="url"
              placeholder="https://www.starbucks.com/card/balance"
              value={formData.balance_check_url}
              onChange={(e) => setFormData(prev => ({ ...prev, balance_check_url: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="redemption_instructions">Redemption Instructions</Label>
            <Textarea
              id="redemption_instructions"
              placeholder="Instructions for how customers can redeem this gift card..."
              value={formData.redemption_instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, redemption_instructions: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {mode === 'edit' ? 'Update Brand' : 'Create Brand'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

