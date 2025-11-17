import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

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

export function GeneralSettings() {
  const { currentClient } = useTenant();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    industry: "",
    timezone: "America/New_York",
  });

  useEffect(() => {
    if (currentClient) {
      setFormData({
        industry: currentClient.industry || "",
        timezone: currentClient.timezone || "America/New_York",
      });
    }
  }, [currentClient]);

  const canEdit = hasPermission("clients.edit");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient) return;
    
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("clients")
        .update({
          industry: formData.industry as any,
          timezone: formData.timezone,
        })
        .eq("id", currentClient.id);

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "General settings have been updated successfully",
      });
      
      window.location.reload();
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Information</CardTitle>
          <CardDescription>
            Basic information about your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Organization Name</Label>
            <Input value={currentClient?.name || ""} disabled />
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
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canEdit && (
            <div className="pt-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          )}

          {!canEdit && (
            <p className="text-sm text-muted-foreground pt-2">
              Contact your administrator to request changes to these settings.
            </p>
          )}
        </CardContent>
      </Card>
    </form>
  );
}
