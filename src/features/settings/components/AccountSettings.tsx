import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Separator } from "@/shared/components/ui/separator";
import { useAuth } from '@core/auth/AuthProvider';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { toast } from "sonner";
import { User, Lock, Bell, Clock, Shield } from "lucide-react";
import { ComingSoon } from '@/shared/components/ComingSoon';
import { ComingSoonBadge } from '@/shared/components/ComingSoonBadge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { format } from "date-fns";

export function AccountSettings() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });

  // Fetch login history
  const { data: loginHistory } = useQuery({
    queryKey: ['login-history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('login_history')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: { full_name?: string; phone?: string; timezone?: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success("Profile updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update profile");
      console.error(error);
    }
  });

  // Update notification preferences mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (preferences: any) => {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: preferences })
        .eq('id', user?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success("Notification preferences updated");
    },
    onError: (error) => {
      toast.error("Failed to update notifications");
      console.error(error);
    }
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async ({ newPassword }: { newPassword: string }) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password changed successfully");
      setIsPasswordDialogOpen(false);
      setPasswordData({ current: "", new: "", confirm: "" });
    },
    onError: (error) => {
      toast.error("Failed to change password");
      console.error(error);
    }
  });

  const handlePasswordChange = () => {
    if (passwordData.new !== passwordData.confirm) {
      toast.error("Passwords don't match");
      return;
    }
    if (passwordData.new.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    changePasswordMutation.mutate({ newPassword: passwordData.new });
  };

  const notificationPreferences = (profile?.notification_preferences || {
    email: { campaigns: true, gift_cards: true, system_alerts: true },
    sms: false
  }) as { email: { campaigns: boolean; gift_cards: boolean; system_alerts: boolean }; sms: boolean };

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal information and contact details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                defaultValue={profile?.full_name || ""}
                onBlur={(e) => {
                  if (e.target.value !== profile?.full_name) {
                    updateProfileMutation.mutate({ full_name: e.target.value });
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                defaultValue={profile?.phone || ""}
                onBlur={(e) => {
                  if (e.target.value !== profile?.phone) {
                    updateProfileMutation.mutate({ phone: e.target.value });
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                defaultValue={profile?.timezone || "America/New_York"}
                onValueChange={(value) => {
                  updateProfileMutation.mutate({ timezone: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>
            Manage your password and security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Change Password</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
                <DialogDescription>
                  Enter your new password below
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={passwordData.new}
                    onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm Password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwordData.confirm}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handlePasswordChange}
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Separator />

          <ComingSoon featureKey="two_factor_auth">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <p className="text-sm font-medium">Two-Factor Authentication</p>
                  <ComingSoonBadge variant="coming_soon" size="sm" expectedDate="Q2 2026" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security with authenticator app or SMS
                </p>
              </div>
              <Switch disabled />
            </div>
          </ComingSoon>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose how you want to be notified
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Campaign Updates</p>
                <p className="text-sm text-muted-foreground">
                  Get notified about campaign status changes
                </p>
              </div>
              <Switch
                checked={notificationPreferences.email?.campaigns}
                onCheckedChange={(checked) => {
                  updateNotificationsMutation.mutate({
                    ...notificationPreferences,
                    email: { ...notificationPreferences.email, campaigns: checked }
                  });
                }}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Gift Card Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Notifications for gift card redemptions
                </p>
              </div>
              <Switch
                checked={notificationPreferences.email?.gift_cards}
                onCheckedChange={(checked) => {
                  updateNotificationsMutation.mutate({
                    ...notificationPreferences,
                    email: { ...notificationPreferences.email, gift_cards: checked }
                  });
                }}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">System Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Important system notifications and updates
                </p>
              </div>
              <Switch
                checked={notificationPreferences.email?.system_alerts}
                onCheckedChange={(checked) => {
                  updateNotificationsMutation.mutate({
                    ...notificationPreferences,
                    email: { ...notificationPreferences.email, system_alerts: checked }
                  });
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Login History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Login Activity
          </CardTitle>
          <CardDescription>
            View your recent login history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loginHistory && loginHistory.length > 0 ? (
                loginHistory.map((login) => (
                  <TableRow key={login.id}>
                    <TableCell>
                      {format(new Date(login.created_at), "MMM d, yyyy h:mm a")}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {login.ip_address || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <span className={login.success ? "text-success" : "text-destructive"}>
                        {login.success ? "Success" : "Failed"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No login history available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
