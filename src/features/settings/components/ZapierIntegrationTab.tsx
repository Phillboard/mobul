import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import { Zap, Plus, Trash2, TestTube2, CheckCircle2, XCircle, Clock, Activity, ExternalLink } from "lucide-react";
import { useTenant } from '@/contexts/TenantContext';
import { useZapierConnections } from '@/features/settings/hooks';
import { ZapierConnectionDialog } from "./ZapierConnectionDialog";
import { ZapierAnalytics } from "./ZapierAnalytics";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";

export function ZapierIntegrationTab() {
  const { currentClient } = useTenant();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConnectionId, setDeleteConnectionId] = useState<string | null>(null);
  const { connections, isLoading, createConnection, updateConnection, deleteConnection, testConnection } = useZapierConnections(currentClient?.id || null);

  if (!currentClient) return <Card><CardContent className="pt-6"><p className="text-muted-foreground">Please select a client to manage Zapier integrations.</p></CardContent></Card>;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="connections" className="space-y-6">
        <TabsList>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="connections" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" />Zapier Integrations</CardTitle>
                  <CardDescription>Connect Mobul to 6,000+ apps via Zapier</CardDescription>
                </div>
                <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Connect New Zap</Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <p className="text-muted-foreground">Loading connections...</p> : connections && connections.length > 0 ? (
                <div className="space-y-4">
                  {connections.map((connection) => (
                    <Card key={connection.id} className="border-border/50">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">{connection.connection_name}</CardTitle>
                              <Badge variant={connection.is_active ? "default" : "secondary"}>{connection.is_active ? "Active" : "Inactive"}</Badge>
                              {connection.failure_count > 0 && <Badge variant="destructive">{connection.failure_count} Failures</Badge>}
                            </div>
                            {connection.description && <CardDescription>{connection.description}</CardDescription>}
                          </div>
                          <Switch checked={connection.is_active} onCheckedChange={(checked) => updateConnection.mutate({ id: connection.id, updates: { is_active: checked } })} />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /><div><p className="text-sm font-medium">{connection.success_count}</p><p className="text-xs text-muted-foreground">Successful</p></div></div>
                          <div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-destructive" /><div><p className="text-sm font-medium">{connection.failure_count}</p><p className="text-xs text-muted-foreground">Failed</p></div></div>
                          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm font-medium">{connection.last_triggered_at ? formatDistanceToNow(new Date(connection.last_triggered_at), { addSuffix: true }) : "Never"}</p><p className="text-xs text-muted-foreground">Last Triggered</p></div></div>
                        </div>
                        <div><p className="text-sm font-medium mb-2">Trigger Events:</p><div className="flex flex-wrap gap-2">{connection.trigger_events.map((event) => <Badge key={event} variant="outline" className="text-xs">{event}</Badge>)}</div></div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => testConnection.mutate(connection.id)} disabled={!connection.is_active || testConnection.isPending}><TestTube2 className="h-4 w-4 mr-2" />Test Connection</Button>
                          <Button variant="outline" size="sm" asChild><a href="https://zapier.com/app/zaps" target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-2" />View in Zapier</a></Button>
                          <Button variant="outline" size="sm" onClick={() => setDeleteConnectionId(connection.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12"><Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-medium mb-2">No Zapier Connections</h3><p className="text-muted-foreground mb-4">Connect your first Zap to start automating workflows</p><Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Connect New Zap</Button></div>
              )}
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle>Getting Started with Zapier</CardTitle><CardDescription>Learn how to connect Mobul to thousands of apps</CardDescription></CardHeader><CardContent><ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground"><li>Click "Connect New Zap" above to start</li><li>Create a new Zap in Zapier with "Webhooks by Zapier" as the trigger</li><li>Choose "Catch Hook" and copy the webhook URL</li><li>Paste the URL in the connection dialog</li><li>Select which Mobul events should trigger your Zap</li><li>Complete your Zap in Zapier with actions like sending emails, creating CRM records, etc.</li></ol></CardContent></Card>
        </TabsContent>
        <TabsContent value="analytics"><ZapierAnalytics /></TabsContent>
      </Tabs>
      <ZapierConnectionDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreateConnection={async (connection) => { await createConnection.mutateAsync(connection); }} />
      <AlertDialog open={!!deleteConnectionId} onOpenChange={() => setDeleteConnectionId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Zapier Connection?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this Zapier connection. Your Zap in Zapier will stop receiving events from Mobul.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleteConnectionId) { deleteConnection.mutate(deleteConnectionId); setDeleteConnectionId(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
