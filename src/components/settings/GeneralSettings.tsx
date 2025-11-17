import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { Settings, Clock, Bell, Zap } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function GeneralSettings() {
  const { roles } = useAuth();
  const { currentClient, currentOrg } = useTenant();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = roles.some(r => r.role === 'admin');
  const isTechSupport = roles.some(r => r.role === 'tech_support');
  const isAgencyOwner = roles.some(r => r.role === 'agency_owner');
  const isCompanyOwner = roles.some(r => r.role === 'company_owner');
  const isDeveloper = roles.some(r => r.role === 'developer');

  const [timezone, setTimezone] = useState('America/New_York');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Save settings to database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Settings saved",
        description: "Your general settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isTechSupport) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Information (Read-Only)
          </CardTitle>
          <CardDescription>
            View system settings and health status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Platform Status</Label>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium">All Systems Operational</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Default Timezone</Label>
              <p className="text-sm font-medium">America/New_York (EST)</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Email Gateway</Label>
              <p className="text-sm font-medium">Active (SendGrid)</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">SMS Gateway</Label>
              <p className="text-sm font-medium">Active (Twilio)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Settings */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Platform Configuration
            </CardTitle>
            <CardDescription>
              Configure platform-wide settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform-timezone">Default Platform Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="platform-timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time (EST)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CST)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MST)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PST)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-gateway">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable platform email notifications
                  </p>
                </div>
                <Switch
                  id="email-gateway"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-gateway">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable platform SMS notifications
                  </p>
                </div>
                <Switch
                  id="sms-gateway"
                  checked={smsNotifications}
                  onCheckedChange={setSmsNotifications}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agency Owner Settings */}
      {(isAgencyOwner || isAdmin) && currentOrg && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {isAdmin ? 'Organization Settings' : 'Agency Settings'}
            </CardTitle>
            <CardDescription>
              Configure default settings for {currentOrg.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agency-timezone">Default Timezone</Label>
              <Select defaultValue="America/New_York">
                <SelectTrigger id="agency-timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time (EST)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (CST)</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time (MST)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (PST)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="working-hours">Working Hours</Label>
              <div className="grid grid-cols-2 gap-4">
                <Select defaultValue="09:00">
                  <SelectTrigger id="working-hours">
                    <SelectValue placeholder="Start time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="08:00">8:00 AM</SelectItem>
                    <SelectItem value="09:00">9:00 AM</SelectItem>
                    <SelectItem value="10:00">10:00 AM</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="17:00">
                  <SelectTrigger>
                    <SelectValue placeholder="End time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:00">4:00 PM</SelectItem>
                    <SelectItem value="17:00">5:00 PM</SelectItem>
                    <SelectItem value="18:00">6:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Company Owner Settings */}
      {(isCompanyOwner || isAdmin || isAgencyOwner) && currentClient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Company Preferences
            </CardTitle>
            <CardDescription>
              Configure settings for {currentClient.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-timezone">Company Timezone</Label>
              <Select defaultValue={currentClient.timezone || "America/New_York"}>
                <SelectTrigger id="company-timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time (EST)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (CST)</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time (MST)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (PST)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Campaign Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about campaign updates
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Gift Card Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about gift card redemptions
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Developer Settings */}
      {(isDeveloper || isAdmin) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Developer Options
            </CardTitle>
            <CardDescription>
              Advanced settings for developers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dev-mode">Developer Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Show detailed logs and debug information
                </p>
              </div>
              <Switch
                id="dev-mode"
                checked={developerMode}
                onCheckedChange={setDeveloperMode}
              />
            </div>

            <div className="space-y-2">
              <Label>API Rate Limits</Label>
              <p className="text-sm text-muted-foreground">
                Current: 1000 requests/hour
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}