import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { useAuth } from '@core/auth/AuthProvider';
import { useTenant } from '@app/providers/TenantProvider';
import { Code, Key, BookOpen, TestTube, Plus, Copy, Trash2, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { useAPIKeys } from '@/features/settings/hooks';
import { CreateAPIKeyDialog } from "@/features/settings/components/api/CreateAPIKeyDialog";
import { useState } from "react";
import { useToast } from '@shared/hooks';
import { format } from "date-fns";
import { USER_ROLES } from '@/shared/utils/terminology';
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

export function APISettings() {
  const { roles, hasPermission } = useAuth();
  const { currentClient } = useTenant();
  const { toast } = useToast();
  const { apiKeys = [], isLoading, createAPIKey, revokeAPIKey } = useAPIKeys(currentClient?.id || null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);

  const isAdmin = roles.some(r => r.role === USER_ROLES.ADMIN);
  const isDeveloper = roles.some(r => r.role === USER_ROLES.DEVELOPER);
  const canManageAPI = hasPermission('platform.api.manage') || hasPermission('settings.api');

  const handleCopyKey = (keyPrefix: string) => {
    navigator.clipboard.writeText(keyPrefix);
    toast({
      title: "Copied",
      description: "API key prefix copied to clipboard",
    });
  };

  const handleDeleteKey = async () => {
    if (!keyToDelete) return;

    try {
      await revokeAPIKey.mutateAsync(keyToDelete);
    } finally {
      setDeleteDialogOpen(false);
      setKeyToDelete(null);
    }
  };

  if (!canManageAPI) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Code className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">API Access Required</h3>
          <p className="text-muted-foreground">
            You don't have permission to manage API settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!currentClient && !isAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Code className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Select a Client</h3>
          <p className="text-muted-foreground">
            Please select a client to manage API settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            API Documentation
          </CardTitle>
          <CardDescription>
            Learn how to integrate with our API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <Code className="h-4 w-4" />
              <AlertDescription>
                Our REST API allows you to programmatically manage campaigns, audiences, and more.
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <a href="/api-documentation" target="_blank">
                  <BookOpen className="h-4 w-4 mr-2" />
                  View Documentation
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="https://docs.example.com" target="_blank">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  API Reference
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Manage your API authentication keys
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading API keys...
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">No API keys created yet</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                Create Your First API Key
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{key.name}</p>
                      {key.revoked ? (
                        <Badge variant="destructive">Revoked</Badge>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <code className="bg-muted px-2 py-1 rounded text-xs">
                        {key.key_prefix}...
                      </code>
                      <span>
                        Created {format(new Date(key.created_at || ''), 'MMM d, yyyy')}
                      </span>
                      {key.last_used_at && (
                        <span>
                          Last used {format(new Date(key.last_used_at), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopyKey(key.key_prefix)}
                      disabled={key.revoked}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setKeyToDelete(key.id);
                        setDeleteDialogOpen(true);
                      }}
                      disabled={key.revoked}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Usage */}
      {(isAdmin || isDeveloper) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              API Usage & Limits
            </CardTitle>
            <CardDescription>
              Monitor your API usage and rate limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Requests Today</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Rate Limit</p>
                <p className="text-2xl font-bold">1,000/hr</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="text-2xl font-bold">1,000</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <CreateAPIKeyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateKey={async (name: string) => {
          return await createAPIKey.mutateAsync({ name });
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately revoke the API key. Any applications using this key will no longer be able to access the API.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteKey}>
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}