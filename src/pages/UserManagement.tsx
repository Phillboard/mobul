import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, UserCog, Plus, X } from "lucide-react";

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
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

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

  // Fetch all permissions grouped by module
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

  // Grant permission mutation
  const grantPermissionMutation = useMutation({
    mutationFn: async ({ userId, permissionId }: { userId: string; permissionId: string }) => {
      const { error } = await supabase
        .from('user_permissions')
        .upsert({ 
          user_id: userId, 
          permission_id: permissionId,
          granted: true 
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-permission-overrides'] });
      toast({ title: "Permission granted" });
    }
  });

  // Revoke permission mutation
  const revokePermissionMutation = useMutation({
    mutationFn: async ({ userId, permissionId }: { userId: string; permissionId: string }) => {
      const { error } = await supabase
        .from('user_permissions')
        .upsert({ 
          user_id: userId, 
          permission_id: permissionId,
          granted: false 
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-permission-overrides'] });
      toast({ title: "Permission revoked" });
    }
  });

  // Remove override mutation
  const removeOverrideMutation = useMutation({
    mutationFn: async ({ userId, permissionId }: { userId: string; permissionId: string }) => {
      const { error } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId)
        .eq('permission_id', permissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-permission-overrides'] });
      toast({ title: "Override removed" });
    }
  });

  const permissionsByModule = permissions?.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const getUserPermissionStatus = (permissionId: string) => {
    const override = userPermissionOverrides?.find(
      up => up.permissions.id === permissionId
    );
    
    if (override) {
      return override.granted ? 'granted' : 'revoked';
    }

    const hasFromRole = userPermissions?.some(
      up => up.permission_name === permissions?.find(p => p.id === permissionId)?.name
    );

    return hasFromRole ? 'role' : 'none';
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage users and their permissions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>View and manage user permissions</CardDescription>
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
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.roles.map(role => (
                          <Badge key={role} variant="secondary">
                            {role.replace('_', ' ')}
                          </Badge>
                        ))}
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
                        <DialogContent className="max-w-3xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>Manage Permissions - {user.full_name}</DialogTitle>
                            <DialogDescription>
                              Grant or revoke specific permissions for this user
                            </DialogDescription>
                          </DialogHeader>

                          <Tabs defaultValue="permissions" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="permissions">All Permissions</TabsTrigger>
                              <TabsTrigger value="overrides">Overrides</TabsTrigger>
                            </TabsList>

                            <TabsContent value="permissions" className="space-y-4">
                              <ScrollArea className="h-[400px] pr-4">
                                {Object.entries(permissionsByModule || {}).map(([module, perms]) => (
                                  <div key={module} className="mb-6">
                                    <h3 className="font-semibold mb-3 capitalize">
                                      {module.replace('_', ' ')}
                                    </h3>
                                    <div className="space-y-2">
                                      {perms.map((permission) => {
                                        const status = getUserPermissionStatus(permission.id);
                                        return (
                                          <div
                                            key={permission.id}
                                            className="flex items-center justify-between p-2 rounded-lg border"
                                          >
                                            <div className="flex-1">
                                              <div className="font-medium text-sm">{permission.name}</div>
                                              <div className="text-xs text-muted-foreground">
                                                {permission.description}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              {status === 'role' && (
                                                <Badge variant="secondary">From Role</Badge>
                                              )}
                                              {status === 'granted' && (
                                                <Badge variant="default">Granted</Badge>
                                              )}
                                              {status === 'revoked' && (
                                                <Badge variant="destructive">Revoked</Badge>
                                              )}
                                              <div className="flex gap-1">
                                                <Button
                                                  size="sm"
                                                  variant={status === 'granted' ? 'default' : 'outline'}
                                                  onClick={() => grantPermissionMutation.mutate({
                                                    userId: user.id,
                                                    permissionId: permission.id
                                                  })}
                                                >
                                                  Grant
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant={status === 'revoked' ? 'destructive' : 'outline'}
                                                  onClick={() => revokePermissionMutation.mutate({
                                                    userId: user.id,
                                                    permissionId: permission.id
                                                  })}
                                                >
                                                  Revoke
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </ScrollArea>
                            </TabsContent>

                            <TabsContent value="overrides">
                              <ScrollArea className="h-[400px]">
                                {userPermissionOverrides?.length === 0 ? (
                                  <div className="text-center py-8 text-muted-foreground">
                                    No permission overrides for this user
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {userPermissionOverrides?.map((override) => (
                                      <div
                                        key={override.id}
                                        className="flex items-center justify-between p-3 rounded-lg border"
                                      >
                                        <div>
                                          <div className="font-medium">{override.permissions.name}</div>
                                          <div className="text-sm text-muted-foreground">
                                            {override.permissions.description}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge variant={override.granted ? 'default' : 'destructive'}>
                                            {override.granted ? 'Granted' : 'Revoked'}
                                          </Badge>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => removeOverrideMutation.mutate({
                                              userId: user.id,
                                              permissionId: override.permissions.id
                                            })}
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
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
