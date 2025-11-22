import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, UserCog, X } from "lucide-react";
import { PermissionTemplateSelector } from "@/components/settings/PermissionTemplateSelector";
import { PermissionCategoryManager } from "@/components/settings/PermissionCategoryManager";
import { InviteUserDialog } from "@/components/settings/InviteUserDialog";
import { PendingInvitations } from "@/components/settings/PendingInvitations";
import { roleDisplayNames, roleDescriptions, roleColors, getRoleLevel, type AppRole } from "@/lib/roleUtils";

interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
}

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
}

export default function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // Fetch all users with their roles
  const { data: users } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);

          return {
            ...profile,
            roles: roles?.map(r => r.role) || []
          };
        })
      );

      return usersWithRoles;
    }
  });

  // Fetch all permissions
  const { data: permissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('module, name');

      if (error) throw error;
      return data as Permission[];
    }
  });

  // Fetch user-specific permissions
  const { data: userPermissions } = useQuery({
    queryKey: ['user-permissions', selectedUser],
    enabled: !!selectedUser,
    queryFn: async () => {
      if (!selectedUser) return [];
      
      const { data, error } = await supabase
        .rpc('get_user_permissions', { _user_id: selectedUser });

      if (error) throw error;
      return data;
    }
  });

  // Fetch user-specific permission overrides
  const { data: userPermissionOverrides } = useQuery({
    queryKey: ['user-permission-overrides', selectedUser],
    enabled: !!selectedUser,
    queryFn: async () => {
      if (!selectedUser) return [];

      const { data, error } = await supabase
        .from('user_permissions')
        .select('*, permissions(*)')
        .eq('user_id', selectedUser);

      if (error) throw error;
      return data;
    }
  });

  // Remove override mutation
  const removeOverrideMutation = useMutation({
    mutationFn: async (overrideId: string) => {
      const { error } = await supabase
        .from('user_permissions')
        .delete()
        .eq('id', overrideId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-permission-overrides'] });
      toast({
        title: "Override removed",
        description: "Permission override has been removed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to remove override: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-2">
              <UserCog className="h-8 w-8" />
              User Management
            </h1>
            <p className="text-muted-foreground">
              Manage user roles and granular permissions - GHL style
            </p>
          </div>
          <InviteUserDialog />
        </div>

        <PendingInvitations />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Users & Permissions
            </CardTitle>
            <CardDescription>
              Manage users, assign permission templates, and customize individual permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name || 'N/A'}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.roles.map((role) => {
                          const displayName = roleDisplayNames[role as AppRole] || role;
                          const color = roleColors[role as AppRole] || 'bg-gray-500';
                          return (
                            <Badge key={role} className={`${color} text-white`}>
                              {displayName}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedUser(user.id)}
                          >
                            <UserCog className="h-4 w-4 mr-2" />
                            Manage Permissions
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[85vh]">
                          <DialogHeader>
                            <DialogTitle>Manage Permissions - {user.full_name}</DialogTitle>
                            <DialogDescription>
                              Apply permission templates or customize individual permissions
                            </DialogDescription>
                          </DialogHeader>

                          <Tabs defaultValue="templates" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="templates">Templates</TabsTrigger>
                              <TabsTrigger value="permissions">Permissions</TabsTrigger>
                              <TabsTrigger value="overrides">Overrides</TabsTrigger>
                            </TabsList>

                            <TabsContent value="templates" className="space-y-4">
                              <PermissionTemplateSelector
                                userId={user.id}
                                currentPermissions={userPermissions?.map((p: any) => p.permission_name) || []}
                              />
                              
                              <div className="border-t pt-4">
                                <p className="text-sm text-muted-foreground">
                                  Templates provide quick access to pre-configured permission sets.
                                  You can further customize in the Permissions tab.
                                </p>
                              </div>
                            </TabsContent>

                            <TabsContent value="permissions" className="space-y-4">
                              <ScrollArea className="h-[450px]">
                                <PermissionCategoryManager
                                  userId={user.id}
                                  permissions={permissions || []}
                                  userPermissions={userPermissions?.map((p: any) => p.permission_name) || []}
                                  rolePermissions={
                                    userPermissions
                                      ?.filter((p: any) => p.granted_by === 'role')
                                      .map((p: any) => p.permission_name) || []
                                  }
                                />
                              </ScrollArea>
                            </TabsContent>

                            <TabsContent value="overrides" className="space-y-4">
                              <ScrollArea className="h-[450px]">
                                {userPermissionOverrides && userPermissionOverrides.length > 0 ? (
                                  <div className="space-y-2">
                                    {userPermissionOverrides.map((override: any) => (
                                      <div
                                        key={override.id}
                                        className="flex items-center justify-between p-3 border rounded-lg"
                                      >
                                        <div className="flex-1">
                                          <div className="font-medium">{override.permissions.name}</div>
                                          <div className="text-sm text-muted-foreground">
                                            {override.permissions.description}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge variant={override.granted ? "default" : "destructive"}>
                                            {override.granted ? "Granted" : "Revoked"}
                                          </Badge>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => removeOverrideMutation.mutate(override.id)}
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-muted-foreground">
                                    No permission overrides for this user
                                  </div>
                                )}
                              </ScrollArea>
                            </TabsContent>
                          </Tabs>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
