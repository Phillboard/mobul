import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";

interface ClientBrandingEditorProps {
  client: any;
  onSaved: () => void;
  onCancel: () => void;
}

const INDUSTRIES = [
  { value: "roofing", label: "Roofing" },
  { value: "rei", label: "Real Estate Investment" },
  { value: "auto_service", label: "Auto Service" },
  { value: "auto_warranty", label: "Auto Warranty" },
  { value: "auto_buyback", label: "Auto Buy-Back" },
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
];

export function ClientBrandingEditor({ client, onSaved, onCancel }: ClientBrandingEditorProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: client.name,
    industry: client.industry,
    timezone: client.timezone,
    brand_colors: client.brand_colors_json || { primary: "#2563eb", secondary: "#8b5cf6", accent: "#ec4899" },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("clients")
        .update({
          name: formData.name,
          industry: formData.industry,
          timezone: formData.timezone,
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
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Client Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Select value={formData.industry} onValueChange={(value) => setFormData({ ...formData, industry: value })}>
            <SelectTrigger id="industry">
              <SelectValue />
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
          <Select value={formData.timezone} onValueChange={(value) => setFormData({ ...formData, timezone: value })}>
            <SelectTrigger id="timezone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <Label>Brand Colors</Label>
          <div className="grid grid-cols-3 gap-4">
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
