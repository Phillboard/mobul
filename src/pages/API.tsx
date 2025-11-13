import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code2, Webhook, Book, Key, Trash2, Power, PowerOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { useAPIKeys } from "@/hooks/useAPIKeys";
import { useWebhooks } from "@/hooks/useWebhooks";
import { CreateAPIKeyDialog } from "@/components/api/CreateAPIKeyDialog";
import { CreateWebhookDialog } from "@/components/api/CreateWebhookDialog";
import { format } from "date-fns";
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

export default function API() {
  const navigate = useNavigate();
  const { currentClient } = useTenant();
  const { apiKeys, isLoading: isLoadingKeys, createAPIKey, revokeAPIKey } = useAPIKeys(currentClient?.id || null);
  const { webhooks, isLoading: isLoadingWebhooks, createWebhook, updateWebhook, deleteWebhook } = useWebhooks(currentClient?.id || null);
  
  const [showCreateKeyDialog, setShowCreateKeyDialog] = useState(false);
  const [showCreateWebhookDialog, setShowCreateWebhookDialog] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<string | null>(null);
  const [webhookToDelete, setWebhookToDelete] = useState<string | null>(null);

  const handleCreateAPIKey = async (name: string) => {
    const result = await createAPIKey.mutateAsync({ name });
    return result;
  };

  const handleCreateWebhook = async (webhook: { name: string; url: string; events: string[] }) => {
    await createWebhook.mutateAsync(webhook);
  };

  const handleRevokeKey = async () => {
    if (keyToRevoke) {
      await revokeAPIKey.mutateAsync(keyToRevoke);
      setKeyToRevoke(null);
    }
  };

  const handleDeleteWebhook = async () => {
    if (webhookToDelete) {
      await deleteWebhook.mutateAsync(webhookToDelete);
      setWebhookToDelete(null);
    }
  };

  const handleToggleWebhook = async (webhookId: string, currentActive: boolean) => {
    await updateWebhook.mutateAsync({
      id: webhookId,
      updates: { active: !currentActive },
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">API & Webhooks</h1>
          <p className="mt-1 text-muted-foreground">
            Integrate ACE Engage with your existing systems via REST API
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-primary" />
                REST API
              </CardTitle>
              <CardDescription>
                Full OpenAPI 3.0 specification with idempotent endpoints
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-muted p-4 font-mono text-sm">
                <div className="text-success">POST</div>
                <div className="text-muted-foreground">/v1/campaigns</div>
              </div>
              <div className="rounded-lg bg-muted p-4 font-mono text-sm">
                <div className="text-primary">GET</div>
                <div className="text-muted-foreground">/v1/audiences/:id</div>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate("/api/docs")}
              >
                <Book className="mr-2 h-4 w-4" />
                View API Documentation
              </Button>
            </CardContent>
          </Card>

          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-accent" />
                Webhooks
              </CardTitle>
              <CardDescription>
                Real-time event notifications for campaign status and attribution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-lg border border-border p-2.5">
                  <span className="text-muted-foreground">mail.batch_status.changed</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-2.5">
                  <span className="text-muted-foreground">dm.qr_scanned</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-2.5">
                  <span className="text-muted-foreground">dm.conversion.recorded</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowCreateWebhookDialog(true)}
              >
                Configure Webhooks
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </CardTitle>
            <CardDescription>
              Manage your API credentials and access tokens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoadingKeys ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : apiKeys && apiKeys.length > 0 ? (
                apiKeys.map((key) => (
                  <div key={key.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{key.name}</p>
                        <p className="text-sm text-muted-foreground">{key.key_prefix}</p>
                        {key.last_used_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last used: {format(new Date(key.last_used_at), "MMM d, yyyy")}
                          </p>
                        )}
                        {key.revoked && (
                          <span className="inline-block mt-1 text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                            Revoked
                          </span>
                        )}
                      </div>
                      {!key.revoked && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setKeyToRevoke(key.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No API keys yet</p>
              )}
              <Button 
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => setShowCreateKeyDialog(true)}
              >
                Create New API Key
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Configured Webhooks
            </CardTitle>
            <CardDescription>
              Manage your webhook endpoints and event subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoadingWebhooks ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : webhooks && webhooks.length > 0 ? (
                webhooks.map((webhook) => (
                  <div key={webhook.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{webhook.name}</p>
                          {webhook.active ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-success/10 text-success px-2 py-0.5 rounded">
                              <Power className="h-3 w-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                              <PowerOff className="h-3 w-3" />
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{webhook.url}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Events: {webhook.events.join(", ")}
                        </p>
                        {webhook.last_triggered_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last triggered: {format(new Date(webhook.last_triggered_at), "MMM d, yyyy HH:mm")}
                          </p>
                        )}
                        {webhook.failure_count > 0 && (
                          <p className="text-xs text-destructive mt-1">
                            Failed attempts: {webhook.failure_count}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleWebhook(webhook.id, webhook.active)}
                        >
                          {webhook.active ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWebhookToDelete(webhook.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No webhooks configured yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
          <CardHeader>
            <CardTitle>SDKs & Libraries</CardTitle>
            <CardDescription>
              Official client libraries for Node.js and Python
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-4">
                <h4 className="font-semibold text-foreground">Node.js / TypeScript</h4>
                <code className="mt-2 block rounded bg-muted p-2 text-sm">
                  npm install @ace-engage/sdk
                </code>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <h4 className="font-semibold text-foreground">Python</h4>
                <code className="mt-2 block rounded bg-muted p-2 text-sm">
                  pip install ace-engage
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateAPIKeyDialog
        open={showCreateKeyDialog}
        onOpenChange={setShowCreateKeyDialog}
        onCreateKey={handleCreateAPIKey}
      />

      <CreateWebhookDialog
        open={showCreateWebhookDialog}
        onOpenChange={setShowCreateWebhookDialog}
        onCreateWebhook={handleCreateWebhook}
      />

      <AlertDialog open={!!keyToRevoke} onOpenChange={() => setKeyToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately revoke the API key. Any applications using this key will no longer be able to access the API.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeKey}>
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!webhookToDelete} onOpenChange={() => setWebhookToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the webhook. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWebhook}>
              Delete Webhook
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
