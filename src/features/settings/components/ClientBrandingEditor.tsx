import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@core/services/supabase';
import { useToast } from '@shared/hooks';
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ClientBrandingEditorProps {
  client: any;
  onSaved: () => void;
  onCancel: () => void;
}

const COLOR_PRESETS = {
  professional: {
    primary: "#2563eb",
    secondary: "#64748b",
    accent: "#0ea5e9",
  },
  creative: {
    primary: "#8b5cf6",
    secondary: "#ec4899",
    accent: "#f59e0b",
  },
  nature: {
    primary: "#059669",
    secondary: "#84cc16",
    accent: "#eab308",
  },
  elegant: {
    primary: "#7c3aed",
    secondary: "#db2777",
    accent: "#f43f5e",
  },
};

export function ClientBrandingEditor({ client, onSaved, onCancel }: ClientBrandingEditorProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: client.name,
    logo_url: client.logo_url,
    tagline: client.tagline || "",
    website_url: client.website_url || "",
    brand_colors: client.brand_colors_json || { primary: "#2563eb", secondary: "#8b5cf6", accent: "#ec4899" },
  });

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Logo must be less than 2MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.match(/^image\/(png|jpg|jpeg|svg\+xml)$/)) {
      toast({
        title: "Invalid file type",
        description: "Logo must be PNG, JPG, or SVG",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingLogo(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${client.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Delete old logo if exists
      if (client.logo_url) {
        const oldPath = client.logo_url.split("/").pop();
        if (oldPath) {
          await supabase.storage.from("client-logos").remove([oldPath]);
        }
      }

      // Upload new logo
      const { error: uploadError, data } = await supabase.storage
        .from("client-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("client-logos")
        .getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, logo_url: publicUrl }));

      toast({
        title: "Logo uploaded",
        description: "Your logo has been uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!client.logo_url) return;

    try {
      const oldPath = client.logo_url.split("/").pop();
      if (oldPath) {
        await supabase.storage.from("client-logos").remove([oldPath]);
      }

      setFormData((prev) => ({ ...prev, logo_url: null }));

      toast({
        title: "Logo removed",
        description: "Your logo has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const applyColorPreset = (preset: keyof typeof COLOR_PRESETS) => {
    setFormData((prev) => ({
      ...prev,
      brand_colors: COLOR_PRESETS[preset],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("clients")
        .update({
          name: formData.name,
          logo_url: formData.logo_url,
          tagline: formData.tagline,
          website_url: formData.website_url,
          brand_colors_json: formData.brand_colors,
        })
        .eq("id", client.id);

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Client branding has been updated successfully",
      });
      onSaved();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleColorChange = (colorKey: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      brand_colors: {
        ...prev.brand_colors,
        [colorKey]: value,
      },
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-3">
          <Label>Company Logo</Label>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 rounded-lg">
              <AvatarImage src={formData.logo_url || ""} alt={formData.name} />
              <AvatarFallback className="rounded-lg text-2xl bg-primary/10">
                {formData.name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingLogo}
              >
                {isUploadingLogo ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Logo
                  </>
                )}
              </Button>
              {formData.logo_url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveLogo}
                >
                  <X className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                PNG, JPG or SVG. Max 2MB.
              </p>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline (Optional)</Label>
            <Input
              id="tagline"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              placeholder="Your company slogan"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website (Optional)</Label>
          <Input
            id="website"
            type="url"
            value={formData.website_url}
            onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
            placeholder="https://example.com"
          />
        </div>

        {/* Brand Colors */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Brand Colors</Label>
            <div className="flex gap-2">
              {Object.keys(COLOR_PRESETS).map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyColorPreset(preset as keyof typeof COLOR_PRESETS)}
                  className="capitalize"
                >
                  {preset}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color" className="text-sm">Primary</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={formData.brand_colors.primary}
                  onChange={(e) => handleColorChange("primary", e.target.value)}
                  className="h-10 w-20"
                />
                <Input
                  type="text"
                  value={formData.brand_colors.primary}
                  onChange={(e) => handleColorChange("primary", e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary-color" className="text-sm">Secondary</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={formData.brand_colors.secondary}
                  onChange={(e) => handleColorChange("secondary", e.target.value)}
                  className="h-10 w-20"
                />
                <Input
                  type="text"
                  value={formData.brand_colors.secondary}
                  onChange={(e) => handleColorChange("secondary", e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent-color" className="text-sm">Accent</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="accent-color"
                  type="color"
                  value={formData.brand_colors.accent}
                  onChange={(e) => handleColorChange("accent", e.target.value)}
                  className="h-10 w-20"
                />
                <Input
                  type="text"
                  value={formData.brand_colors.accent}
                  onChange={(e) => handleColorChange("accent", e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t">
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
