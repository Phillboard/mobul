import { useState } from "react";
import { Layout } from "@/shared/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Code2, Webhook, Key, Trash2, Power, PowerOff, Zap, ExternalLink, Book } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { useAPIKeys } from '@/features/settings/hooks';
import { useWebhooks } from '@/features/settings/hooks';
import { CreateAPIKeyDialog } from "@/features/settings/components/api/CreateAPIKeyDialog";
import { CreateWebhookDialog } from "@/features/settings/components/api/CreateWebhookDialog";
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
} from "@/shared/components/ui/alert-dialog";

const zapierTemplates = [
  {
    id: "1",
    name: "Campaign Status Updates to Slack",
    description: "Post campaign status changes to a Slack channel",
    icon: "📊",
    trigger: "Campaign Status Changed",
    actions: ["Send Slack Message"],
    useCases: ["Team notifications", "Real-time updates"],
    tier: "Essential",
    difficulty: "Easy",
  },
  {
    id: "2",
    name: "QR Scan to Google Sheets",
    description: "Log every QR code scan to a Google Sheet",
    icon: "📄",
    trigger: "QR Code Scanned",
    actions: ["Add Row to Google Sheets"],
    useCases: ["Campaign tracking", "Analytics"],
    tier: "Essential",
    difficulty: "Easy",
  },
  {
    id: "3",
    name: "New Contact to CRM",
    description: "Add new contacts from forms to your CRM",
    icon: "👤",
    trigger: "Form Submitted",
    actions: ["Create Contact in HubSpot"],
    useCases: ["Lead management", "Sales automation"],
    tier: "Essential",
    difficulty: "Medium",
  },
];

export default function Integrations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "api";
  const navigate = useNavigate();
  const { currentClient } = useTenant();
  
  const { apiKeys, isLoading: isLoadingKeys, createAPIKey, revokeAPIKey } = useAPIKeys(currentClient?.id || null);
  const { webhooks, isLoading: isLoadingWebhooks, createWebhook, updateWebhook, deleteWebhook } = useWebhooks(currentClient?.id || null);
  
  const [showCreateKeyDialog, setShowCreateKeyDialog] = useState(false);
  const [showCreateWebhookDialog, setShowCreateWebhookDialog] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<string | null>(null);
  const [webhookToDelete, setWebhookToDelete] = useState<string | null>(null);

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

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
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Integrations
          </h1>
          <p className="text-muted-foreground mt-2">
            Connect ACE Engage with your existing systems and automation tools
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="api">
              <Code2 className="h-4 w-4 mr-2" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="webhooks">
              <Webhook className="h-4 w-4 mr-2" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="zapier">
              <Zap className="h-4 w-4 mr-2" />
              Zapier
            </TabsTrigger>
          </TabsList>

          {/* API Keys Tab */}
          <TabsContent value="api" className="space-y-6">
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
                    <div className="text-green-500">POST</div>
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

              <Card className="bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5">
                <CardHeader>
                  <CardTitle>SDKs & Libraries</CardTitle>
                  <CardDescription>
                    Official client libraries for Node.js and Python
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="rounded-lg border bg-card p-4">
                      <h4 className="font-semibold">Node.js / TypeScript</h4>
                      <code className="mt-2 block rounded bg-muted p-2 text-sm">
                        npm install @ace-engage/sdk
                      </code>
                    </div>
                    <div className="rounded-lg border bg-card p-4">
                      <h4 className="font-semibold">Python</h4>
                      <code className="mt-2 block rounded bg-muted p-2 text-sm">
                        pip install ace-engage
                      </code>
                    </div>
                  </div>
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
                      <div key={key.id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{key.name}</p>
                            <p className="text-sm text-muted-foreground">{key.key_prefix}</p>
                            {key.last_used_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Last used: {format(new Date(key.last_used_at), "MMM d, yyyy")}
                              </p>
                            )}
                            {key.revoked && (
                              <Badge variant="destructive" className="mt-1">Revoked</Badge>
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
                  <Button onClick={() => setShowCreateKeyDialog(true)}>
                    Create New API Key
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-6">
            <Card className="border-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5 text-accent" />
                  Webhook Events
                </CardTitle>
                <CardDescription>
                  Real-time event notifications for campaign status and attribution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {["mail.batch_status.changed", "dm.qr_scanned", "dm.conversion.recorded", "gift_card.redeemed"].map((event) => (
                  <div key={event} className="flex items-center justify-between rounded-lg border p-2.5">
                    <span className="text-sm text-muted-foreground font-mono">{event}</span>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  className="w-full mt-3"
                  onClick={() => setShowCreateWebhookDialog(true)}
                >
                  Configure Webhooks
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configured Webhooks</CardTitle>
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
                      <div key={webhook.id} className="rounded-lg border p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{webhook.name}</p>
                              {webhook.active ? (
                                <Badge variant="default" className="gap-1">
                                  <Power className="h-3 w-3" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1">
                                  <PowerOff className="h-3 w-3" />
                                  Inactive
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{webhook.url}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Events: {webhook.events.join(", ")}
                            </p>
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
          </TabsContent>

          {/* Zapier Tab */}
          <TabsContent value="zapier" className="space-y-6">
            <Card className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-accent" />
                  Zapier Automation
                </CardTitle>
                <CardDescription>
                  Connect ACE Engage with 5,000+ apps using pre-built templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <a href="https://zapier.com/apps/ace-engage" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Zapier App Directory
                  </a>
                </Button>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {zapierTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="text-4xl">{template.icon}</div>
                      <div className="flex gap-1">
                        <Badge variant="outline">{template.tier}</Badge>
                        <Badge variant={template.difficulty === "Easy" ? "default" : "secondary"}>
                          {template.difficulty}
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <p className="text-muted-foreground">Trigger:</p>
                      <p className="font-medium">{template.trigger}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Actions:</p>
                      {template.actions.map((action, idx) => (
                        <p key={idx} className="font-medium">{action}</p>
                      ))}
                    </div>
                    <Button className="w-full" variant="outline">
                      Use This Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
                <CardDescription>
                  Learn how to set up and manage your Zapier integrations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/admin/docs" target="_blank">
                    <Book className="mr-2 h-4 w-4" />
                    View Zapier Documentation
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/settings/integrations")}>
                  <Zap className="mr-2 h-4 w-4" />
                  Manage Zapier Connections
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
