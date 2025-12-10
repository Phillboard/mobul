import { useState } from "react";
import { useAuth } from '@core/auth/AuthProvider';
import { supabase } from '@core/services/supabase';
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Shield, AlertTriangle } from "lucide-react";
import { useToast } from '@shared/hooks';
import { useQueryClient, useQuery } from "@tanstack/react-query";

export function ClaimPlatformAdmin() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [claiming, setClaiming] = useState(false);

  // Check if platform admin already exists
  const { data: platformAdminExists, isLoading } = useQuery({
    queryKey: ['platform-admin-exists'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('platform_admin_exists');
      if (error) throw error;
      return data;
    }
  });

  // Check if current user is agency_owner or above
  const canClaimAdmin = hasRole('agency_owner');

  const handleClaimPlatformAdmin = async () => {
    if (!user) return;

    setClaiming(true);
    try {
      // Insert admin role for current user
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'admin'
        });

      if (error) throw error;

      toast({
        title: "Platform Admin Claimed",
        description: "You are now the platform superuser with full system access.",
      });

      // Refresh auth context and queries
      queryClient.invalidateQueries({ queryKey: ['platform-admin-exists'] });
      window.location.reload(); // Reload to update auth context
    } catch (error: any) {
      console.error('Error claiming platform admin:', error);
      toast({
        title: "Failed to Claim Platform Admin",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setClaiming(false);
    }
  };

  // Don't show if loading
  if (isLoading) return null;

  // Don't show if platform admin already exists
  if (platformAdminExists) return null;

  // Don't show if user cannot claim admin
  if (!canClaimAdmin) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Claim Platform Admin Access</CardTitle>
        </div>
        <CardDescription>
          Become the platform superuser with full access to all organizations, users, and system settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>This is a one-time action.</strong> The first user to claim this role becomes the permanent platform administrator.
            This role has unrestricted access to all data and settings across the entire platform.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            As Platform Admin, you will be able to:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>Manage all organizations across the platform</li>
            <li>View and manage all users regardless of organization</li>
            <li>Access system-wide analytics and metrics</li>
            <li>Manage permissions and roles for all users</li>
            <li>View audit logs across the entire platform</li>
            <li>Configure billing and subscriptions</li>
          </ul>
        </div>

        <Button 
          onClick={handleClaimPlatformAdmin}
          disabled={claiming}
          className="w-full"
          size="lg"
        >
          <Shield className="mr-2 h-4 w-4" />
          {claiming ? "Claiming..." : "Claim Platform Admin Role"}
        </Button>
      </CardContent>
    </Card>
  );
}
