/**
 * CompanySettings Component
 * 
 * Consolidated company settings combining:
 * - Business Profile (from GeneralSettings)
 * - Brand Identity (from ClientBrandingEditor)
 * - Contact Information (new)
 */

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Separator } from "@/shared/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@core/auth/AuthProvider';
import { P } from '@/core/auth/permissionRegistry';
import { supabase } from '@core/services/supabase';
import { useToast } from '@shared/hooks';
import {
  Loader2, Building2, Palette, Upload, X, MapPin, Globe, Phone, Mail,
  Check, ListChecks
} from "lucide-react";
import {
  SettingsPageLayout,
  SettingsCard,
  SettingsSection,
  SettingsEmptyState,
} from './ui';
import { CustomFieldManager } from '@/features/contacts/components/CustomFieldManager';
import { CustomFieldTemplates } from './CustomFieldTemplates';
import { PermissionGate } from '@core/auth/components/PermissionGate';

const INDUSTRIES = [
  { value: "roofing", label: "Roofing" },
  { value: "rei", label: "Real Estate Investment" },
  { value: "auto_service", label: "Auto Service" },
  { value: "auto_warranty", label: "Auto Warranty" },
  { value: "auto_buyback", label: "Auto Buy-Back" },
  { value: "hvac", label: "HVAC" },
  { value: "plumbing", label: "Plumbing" },
  { value: "solar", label: "Solar" },
  { value: "insurance", label: "Insurance" },
  { value: "financial_services", label: "Financial Services" },
  { value: "healthcare", label: "Healthcare" },
  { value: "other", label: "Other" },
];

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
];

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

export function CompanySettings() {
  const { currentClient, refetchTenantData } = useTenant();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    tagline: "",
    industry: "",
    timezone: "America/New_York",
    website_url: "",
    support_email: "",
    support_phone: "",
    address: "",
    logo_url: "",
    brand_colors: { primary: "#2563eb", secondary: "#64748b", accent: "#0ea5e9" },
  });

  useEffect(() => {
    if (currentClient) {
      setFormData({
        name: currentClient.name || "",
        tagline: currentClient.tagline || "",
        industry: currentClient.industry || "",
        timezone: currentClient.timezone || "America/New_York",
        website_url: currentClient.website_url || "",
        support_email: currentClient.support_email || "",
        support_phone: currentClient.support_phone || "",
        address: currentClient.address || "",
        logo_url: currentClient.logo_url || "",
        brand_colors: currentClient.brand_colors_json || { primary: "#2563eb", secondary: "#64748b", accent: "#0ea5e9" },
      });
    }
  }, [currentClient]);

  const canEdit = hasPermission(P.SETTINGS_GENERAL);

  // Logo upload handler
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentClient) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be less than 2MB", variant: "destructive" });
      return;
    }

    if (!file.type.match(/^image\/(png|jpg|jpeg|svg\+xml)$/)) {
      toast({ title: "Invalid file type", description: "Logo must be PNG, JPG, or SVG", variant: "destructive" });
      return;
    }

    setIsUploadingLogo(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${currentClient.id}-${Date.now()}.${fileExt}`;

      // Delete old logo if exists
      if (formData.logo_url) {
        const oldPath = formData.logo_url.split("/").pop();
        if (oldPath) {
          await supabase.storage.from("client-logos").remove([oldPath]);
        }
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from("client-logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("client-logos")
        .getPublicUrl(fileName);

      setFormData((prev) => ({ ...prev, logo_url: publicUrl }));
      toast({ title: "Logo uploaded", description: "Your logo has been uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!formData.logo_url) return;

    try {
      const oldPath = formData.logo_url.split("/").pop();
      if (oldPath) {
        await supabase.storage.from("client-logos").remove([oldPath]);
      }
      setFormData((prev) => ({ ...prev, logo_url: "" }));
      toast({ title: "Logo removed" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleColorChange = (colorKey: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      brand_colors: { ...prev.brand_colors, [colorKey]: value },
    }));
  };

  const applyColorPreset = (preset: keyof typeof COLOR_PRESETS) => {
    setFormData((prev) => ({ ...prev, brand_colors: COLOR_PRESETS[preset] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("clients")
        .update({
          name: formData.name,
          tagline: formData.tagline,
          industry: formData.industry as any,
          timezone: formData.timezone,
          website_url: formData.website_url,
          support_email: formData.support_email,
          support_phone: formData.support_phone,
          address: formData.address,
          logo_url: formData.logo_url || null,
          brand_colors_json: formData.brand_colors,
        })
        .eq("id", currentClient.id);

      if (error) throw error;

      await refetchTenantData();
      toast({ title: "Settings Saved", description: "Company settings have been updated successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentClient) {
    return (
      <SettingsPageLayout title="Company" description="Configure your company settings">
        <SettingsEmptyState
          icon={Building2}
          title="Select a Client"
          description="Please select a client from the dropdown above to configure company settings."
        />
      </SettingsPageLayout>
    );
  }

  return (
    <SettingsPageLayout 
      title="Company Settings" 
      description="Manage your company profile, branding, and contact information"
      actions={
        canEdit && (
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        )
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <Building2 className="h-4 w-4 mr-2" />
            Business Profile
          </TabsTrigger>
          <TabsTrigger value="branding">
            <Palette className="h-4 w-4 mr-2" />
            Brand Identity
          </TabsTrigger>
          <TabsTrigger value="contact">
            <MapPin className="h-4 w-4 mr-2" />
            Contact Info
          </TabsTrigger>
          <TabsTrigger value="custom-fields">
            <ListChecks className="h-4 w-4 mr-2" />
            Custom Fields
          </TabsTrigger>
        </TabsList>

        {/* Business Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <SettingsCard
            title="Organization Information"
            description="Basic information about your organization"
            icon={Building2}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!canEdit}
                  placeholder="Enter company name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  disabled={!canEdit}
                  placeholder="Your company slogan"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(value) => setFormData({ ...formData, industry: value })}
                  disabled={!canEdit}
                >
                  <SelectTrigger id="industry">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((industry) => (
                      <SelectItem key={industry.value} value={industry.value}>
                        {industry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                  disabled={!canEdit}
                >
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SettingsCard>
        </TabsContent>

        {/* Brand Identity Tab */}
        <TabsContent value="branding" className="space-y-6">
          <SettingsCard
            title="Company Logo"
            description="Upload your company logo for use across the platform"
            icon={Palette}
          >
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24 rounded-lg">
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
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingLogo || !canEdit}
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
                {formData.logo_url && canEdit && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleRemoveLogo}>
                    <X className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  PNG, JPG or SVG. Max 2MB.
                </p>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard
            title="Brand Colors"
            description="Customize your brand colors for consistency"
            icon={Palette}
          >
            <div className="space-y-4">
              {/* Color Presets */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Quick presets:</span>
                {Object.keys(COLOR_PRESETS).map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyColorPreset(preset as keyof typeof COLOR_PRESETS)}
                    disabled={!canEdit}
                    className="capitalize"
                  >
                    {preset}
                  </Button>
                ))}
              </div>

              <Separator />

              {/* Color Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-color" className="text-sm">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="primary-color"
                      type="color"
                      value={formData.brand_colors.primary}
                      onChange={(e) => handleColorChange("primary", e.target.value)}
                      className="h-10 w-16 cursor-pointer"
                      disabled={!canEdit}
                    />
                    <Input
                      type="text"
                      value={formData.brand_colors.primary}
                      onChange={(e) => handleColorChange("primary", e.target.value)}
                      className="flex-1 font-mono text-sm"
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary-color" className="text-sm">Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="secondary-color"
                      type="color"
                      value={formData.brand_colors.secondary}
                      onChange={(e) => handleColorChange("secondary", e.target.value)}
                      className="h-10 w-16 cursor-pointer"
                      disabled={!canEdit}
                    />
                    <Input
                      type="text"
                      value={formData.brand_colors.secondary}
                      onChange={(e) => handleColorChange("secondary", e.target.value)}
                      className="flex-1 font-mono text-sm"
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accent-color" className="text-sm">Accent Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="accent-color"
                      type="color"
                      value={formData.brand_colors.accent}
                      onChange={(e) => handleColorChange("accent", e.target.value)}
                      className="h-10 w-16 cursor-pointer"
                      disabled={!canEdit}
                    />
                    <Input
                      type="text"
                      value={formData.brand_colors.accent}
                      onChange={(e) => handleColorChange("accent", e.target.value)}
                      className="flex-1 font-mono text-sm"
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              </div>

              {/* Color Preview */}
              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="text-sm font-medium mb-3">Preview</p>
                <div className="flex items-center gap-3">
                  <Button 
                    style={{ backgroundColor: formData.brand_colors.primary }} 
                    className="text-white"
                  >
                    Primary Button
                  </Button>
                  <Button 
                    variant="outline"
                    style={{ borderColor: formData.brand_colors.secondary, color: formData.brand_colors.secondary }}
                  >
                    Secondary
                  </Button>
                  <span 
                    className="px-3 py-1 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: formData.brand_colors.accent }}
                  >
                    Accent Badge
                  </span>
                </div>
              </div>
            </div>
          </SettingsCard>
        </TabsContent>

        {/* Contact Info Tab */}
        <TabsContent value="contact" className="space-y-6">
          <SettingsCard
            title="Contact Information"
            description="Public contact details for your business"
            icon={MapPin}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="website"
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    disabled={!canEdit}
                    placeholder="https://example.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="support-email">Support Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="support-email"
                    type="email"
                    value={formData.support_email}
                    onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
                    disabled={!canEdit}
                    placeholder="support@example.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="support-phone">Support Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="support-phone"
                    type="tel"
                    value={formData.support_phone}
                    onChange={(e) => setFormData({ ...formData, support_phone: e.target.value })}
                    disabled={!canEdit}
                    placeholder="+1 (555) 000-0000"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Business Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    disabled={!canEdit}
                    placeholder="123 Main St, City, State 12345"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </SettingsCard>
        </TabsContent>

        {/* Custom Fields Tab */}
        <TabsContent value="custom-fields" className="space-y-6">
          <PermissionGate permission={P.CUSTOM_FIELDS_VIEW}>
            {/* Client-level field definitions */}
            <CustomFieldManager />

            {/* Agency-level templates (only for users who can manage) */}
            <PermissionGate permission={P.CUSTOM_FIELDS_MANAGE}>
              <CustomFieldTemplates />
            </PermissionGate>
          </PermissionGate>
        </TabsContent>
      </Tabs>

      {!canEdit && (
        <p className="text-sm text-muted-foreground text-center">
          Contact your administrator to request changes to these settings.
        </p>
      )}
    </SettingsPageLayout>
  );
}

export default CompanySettings;
