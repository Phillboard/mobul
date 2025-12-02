import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Users, 
  Archive, 
  Trash2, 
  RotateCcw, 
  MoreVertical,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { format } from "date-fns";

interface Organization {
  id: string;
  name: string;
  type: 'internal' | 'agency';
  settings_json: any;
  created_at: string;
  archived_at: string | null;
  client_count?: number;
}

interface Client {
  id: string;
  org_id: string;
  name: string;
  industry: string;
  timezone: string;
  created_at: string;
  archived_at: string | null;
  organization?: { name: string };
}

export default function AdminOrganizationManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("agencies");
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  
  // Dialogs state
  const [archiveDialog, setArchiveDialog] = useState<{ open: boolean; type: 'org' | 'client'; item: any } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: 'org' | 'client'; item: any } | null>(null);
  const [restoreDialog, setRestoreDialog] = useState<{ open: boolean; type: 'org' | 'client'; item: any } | null>(null);

  // Fetch organizations with client counts
  const { data: organizations, isLoading: orgsLoading } = useQuery({
    queryKey: ["admin-organizations", showArchived],
    queryFn: async () => {
      let query = supabase
        .from("organizations")
        .select(`
          *,
          clients(count)
        `)
        .order("created_at", { ascending: false });

      if (!showArchived) {
        query = query.is("archived_at", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map((org: any) => ({
        ...org,
        client_count: org.clients?.[0]?.count || 0
      })) as Organization[];
    },
  });

  // Fetch clients with organization names
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["admin-clients", showArchived],
    queryFn: async () => {
      let query = supabase
        .from("clients")
        .select(`
          *,
          organization:organizations(name)
        `)
        .order("created_at", { ascending: false });

      if (!showArchived) {
        query = query.is("archived_at", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Client[];
    },
  });

  // Archive organization mutation
  const archiveOrgMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const { error } = await supabase.rpc("archive_organization", { p_org_id: orgId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      toast({
        title: "Organization Archived",
        description: "The organization and all its clients have been archived.",
      });
      setArchiveDialog(null);
    },
    onError: (error: any) => {
      toast({
        title: "Archive Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Restore organization mutation
  const restoreOrgMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const { error } = await supabase.rpc("restore_organization", { p_org_id: orgId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      toast({
        title: "Organization Restored",
        description: "The organization and all its clients have been restored.",
      });
      setRestoreDialog(null);
    },
    onError: (error: any) => {
      toast({
        title: "Restore Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete organization mutation (permanent)
  const deleteOrgMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      toast({
        title: "Organization Deleted",
        description: "The organization and all its clients have been permanently deleted.",
      });
      setDeleteDialog(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Archive client mutation
  const archiveClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase.rpc("archive_client", { p_client_id: clientId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      toast({
        title: "Client Archived",
        description: "The client has been archived.",
      });
      setArchiveDialog(null);
    },
    onError: (error: any) => {
      toast({
        title: "Archive Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Restore client mutation
  const restoreClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase.rpc("restore_client", { p_client_id: clientId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      toast({
        title: "Client Restored",
        description: "The client has been restored.",
      });
      setRestoreDialog(null);
    },
    onError: (error: any) => {
      toast({
        title: "Restore Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete client mutation (permanent)
  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      toast({
        title: "Client Deleted",
        description: "The client has been permanently deleted.",
      });
      setDeleteDialog(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter organizations
  const filteredOrgs = useMemo(() => {
    if (!organizations) return [];
    return organizations.filter((org) =>
      org.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [organizations, searchTerm]);

  // Filter clients
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    return clients.filter((client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.organization?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clients, searchTerm]);

  // Stats
  const activeOrgs = organizations?.filter((o) => !o.archived_at).length || 0;
  const archivedOrgs = organizations?.filter((o) => o.archived_at).length || 0;
  const activeClients = clients?.filter((c) => !c.archived_at).length || 0;
  const archivedClients = clients?.filter((c) => c.archived_at).length || 0;

  const handleAction = (action: 'archive' | 'delete' | 'restore', type: 'org' | 'client', item: any) => {
    if (action === 'archive') {
      setArchiveDialog({ open: true, type, item });
    } else if (action === 'delete') {
      setDeleteDialog({ open: true, type, item });
    } else if (action === 'restore') {
      setRestoreDialog({ open: true, type, item });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Management</h1>
          <p className="text-muted-foreground mt-1">
            Archive or delete agencies and clients from the platform
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Agencies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">{activeOrgs}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Archived Agencies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-amber-500" />
                <span className="text-2xl font-bold">{archivedOrgs}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Clients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">{activeClients}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Archived Clients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-amber-500" />
                <span className="text-2xl font-bold">{archivedClients}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Manage Organizations</CardTitle>
                <CardDescription>View and manage agencies and their clients</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="pl-9 w-[200px] md:w-[300px]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-archived"
                    checked={showArchived}
                    onCheckedChange={setShowArchived}
                  />
                  <Label htmlFor="show-archived" className="text-sm whitespace-nowrap">
                    Show Archived
                  </Label>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="agencies" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Agencies ({filteredOrgs.length})
                </TabsTrigger>
                <TabsTrigger value="clients" className="gap-2">
                  <Users className="h-4 w-4" />
                  Clients ({filteredClients.length})
                </TabsTrigger>
              </TabsList>

              {/* Agencies Tab */}
              <TabsContent value="agencies" className="mt-0">
                {orgsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading agencies...</div>
                ) : filteredOrgs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No agencies found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredOrgs.map((org) => (
                      <div
                        key={org.id}
                        className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                          org.archived_at 
                            ? "bg-muted/50 border-dashed" 
                            : "hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${org.archived_at ? "bg-muted" : "bg-primary/10"}`}>
                            <Building2 className={`h-5 w-5 ${org.archived_at ? "text-muted-foreground" : "text-primary"}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${org.archived_at ? "text-muted-foreground line-through" : ""}`}>
                                {org.name}
                              </span>
                              <Badge variant={org.type === 'internal' ? 'default' : 'secondary'}>
                                {org.type}
                              </Badge>
                              {org.archived_at && (
                                <Badge variant="outline" className="text-amber-600 border-amber-300">
                                  Archived
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {org.client_count} clients • Created {format(new Date(org.created_at), "MMM d, yyyy")}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {org.archived_at ? (
                              <>
                                <DropdownMenuItem onClick={() => handleAction('restore', 'org', org)}>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Restore Agency
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleAction('delete', 'org', org)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Permanently
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => handleAction('archive', 'org', org)}>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive Agency
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleAction('delete', 'org', org)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Permanently
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Clients Tab */}
              <TabsContent value="clients" className="mt-0">
                {clientsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading clients...</div>
                ) : filteredClients.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No clients found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredClients.map((client) => (
                      <div
                        key={client.id}
                        className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                          client.archived_at 
                            ? "bg-muted/50 border-dashed" 
                            : "hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${client.archived_at ? "bg-muted" : "bg-blue-500/10"}`}>
                            <Users className={`h-5 w-5 ${client.archived_at ? "text-muted-foreground" : "text-blue-500"}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${client.archived_at ? "text-muted-foreground line-through" : ""}`}>
                                {client.name}
                              </span>
                              <Badge variant="outline">
                                {client.industry?.replace(/_/g, ' ')}
                              </Badge>
                              {client.archived_at && (
                                <Badge variant="outline" className="text-amber-600 border-amber-300">
                                  Archived
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Agency: {client.organization?.name || "Unknown"} • Created {format(new Date(client.created_at), "MMM d, yyyy")}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {client.archived_at ? (
                              <>
                                <DropdownMenuItem onClick={() => handleAction('restore', 'client', client)}>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Restore Client
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleAction('delete', 'client', client)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Permanently
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => handleAction('archive', 'client', client)}>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive Client
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleAction('delete', 'client', client)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Permanently
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Archive Dialog */}
        <AlertDialog 
          open={archiveDialog?.open || false} 
          onOpenChange={(open) => !open && setArchiveDialog(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-amber-500" />
                Archive {archiveDialog?.type === 'org' ? 'Agency' : 'Client'}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {archiveDialog?.type === 'org' ? (
                  <>
                    This will archive <strong>{archiveDialog?.item?.name}</strong> and all {archiveDialog?.item?.client_count || 0} of its clients.
                    Archived organizations won't appear in the platform but can be restored later.
                  </>
                ) : (
                  <>
                    This will archive <strong>{archiveDialog?.item?.name}</strong>.
                    Archived clients won't appear in the platform but can be restored later.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (archiveDialog?.type === 'org') {
                    archiveOrgMutation.mutate(archiveDialog.item.id);
                  } else {
                    archiveClientMutation.mutate(archiveDialog?.item.id);
                  }
                }}
                className="bg-amber-500 hover:bg-amber-600"
              >
                Archive
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Restore Dialog */}
        <AlertDialog 
          open={restoreDialog?.open || false} 
          onOpenChange={(open) => !open && setRestoreDialog(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-green-500" />
                Restore {restoreDialog?.type === 'org' ? 'Agency' : 'Client'}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {restoreDialog?.type === 'org' ? (
                  <>
                    This will restore <strong>{restoreDialog?.item?.name}</strong> and all of its archived clients.
                    They will become visible and accessible in the platform again.
                  </>
                ) : (
                  <>
                    This will restore <strong>{restoreDialog?.item?.name}</strong>.
                    It will become visible and accessible in the platform again.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (restoreDialog?.type === 'org') {
                    restoreOrgMutation.mutate(restoreDialog.item.id);
                  } else {
                    restoreClientMutation.mutate(restoreDialog?.item.id);
                  }
                }}
                className="bg-green-500 hover:bg-green-600"
              >
                Restore
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Dialog */}
        <AlertDialog 
          open={deleteDialog?.open || false} 
          onOpenChange={(open) => !open && setDeleteDialog(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Permanently Delete {deleteDialog?.type === 'org' ? 'Agency' : 'Client'}?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  {deleteDialog?.type === 'org' ? (
                    <>
                      This will <strong>permanently delete</strong> <strong>{deleteDialog?.item?.name}</strong> and ALL of its clients, campaigns, and associated data.
                    </>
                  ) : (
                    <>
                      This will <strong>permanently delete</strong> <strong>{deleteDialog?.item?.name}</strong> and ALL of its campaigns, contacts, and associated data.
                    </>
                  )}
                </p>
                <p className="text-destructive font-medium">
                  This action cannot be undone!
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteDialog?.type === 'org') {
                    deleteOrgMutation.mutate(deleteDialog.item.id);
                  } else {
                    deleteClientMutation.mutate(deleteDialog?.item.id);
                  }
                }}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}

