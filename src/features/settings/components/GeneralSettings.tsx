import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Badge } from "@/shared/components/ui/badge";
import { useTenant } from '@app/providers/TenantProvider';
import { useAuth } from '@core/auth/AuthProvider';
import { supabase } from '@core/services/supabase';
import { useToast } from '@shared/hooks';
import { useState, useEffect } from "react";
import { Loader2, MessageCircle, Clock, Eye } from "lucide-react";
import { useDrPhillipPreference } from "@/shared/hooks";
import { formatDistanceToNow } from "date-fns";

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
  const { currentClient, refetchTenantData } = useTenant();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const { isEnabled: drPhillipEnabled, isHidden, hiddenUntil, setIsEnabled: setDrPhillipEnabled, show: showDrPhillip } = useDrPhillipPreference();
  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    timezone: "America/New_York",
  });

  useEffect(() => {
    if (currentClient) {
      setFormData({
        name: currentClient.name || "",
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
          name: formData.name,
          industry: formData.industry as any,
          timezone: formData.timezone,
        })
        .eq("id", currentClient.id);

      if (error) throw error;

      // Refetch tenant data to update all components with the new name
      await refetchTenantData();

      toast({
        title: "Settings Saved",
        description: "General settings have been updated successfully",
      });
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
            <Label htmlFor="organization-name">Organization Name</Label>
            <Input 
              id="organization-name"
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={!canEdit}
              placeholder="Enter organization name"
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

      <Card>
        <CardHeader>
          <CardTitle>AI Assistant Preferences</CardTitle>
          <CardDescription>
            Customize your AI assistant experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <Label htmlFor="dr-phillip-toggle" className="font-medium">
                  Dr. Phillip Chat Assistant
                </Label>
                {isHidden && hiddenUntil && (
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {hiddenUntil.getFullYear() === 9999 
                      ? "Hidden forever" 
                      : `Hidden until ${formatDistanceToNow(hiddenUntil, { addSuffix: true })}`}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Show the AI chat assistant in the bottom right corner
              </p>
            </div>
            <Switch
              id="dr-phillip-toggle"
              checked={drPhillipEnabled && !isHidden}
              onCheckedChange={(checked) => {
                if (checked) {
                  setDrPhillipEnabled(true);
                  showDrPhillip();
                } else {
                  setDrPhillipEnabled(false);
                }
              }}
            />
          </div>

          {/* Show Now button when hidden but enabled */}
          {isHidden && drPhillipEnabled && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Eye className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Dr. Phillip is temporarily hidden</p>
                <p className="text-xs text-muted-foreground">
                  {hiddenUntil?.getFullYear() === 9999 
                    ? "You chose to hide it permanently" 
                    : `It will reappear ${formatDistanceToNow(hiddenUntil!, { addSuffix: true })}`}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={showDrPhillip}>
                Show Now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </form>
  );
}
