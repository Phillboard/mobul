import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Zap, AlertCircle, CheckCircle, Trash2, Edit } from "lucide-react";
import { useCRMIntegrations, useDeleteCRMIntegration, useUpdateCRMIntegration } from "@/hooks/useCRMIntegrations";
import { useTenant } from '@app/providers/TenantProvider';
import { CRMIntegrationDialog } from "./CRMIntegrationDialog";
import { formatDistanceToNow } from "date-fns";
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

const CRM_LOGOS: Record<string, string> = {
  salesforce: "🔷",
  hubspot: "🟠",
  zoho: "🔴",
  gohighlevel: "⚡",
  pipedrive: "🟢",
  custom: "🔗",
};

export function CRMIntegrationTab() {
  const { currentClient } = useTenant();
  const { data: integrations, isLoading } = useCRMIntegrations(currentClient?.id || null);
  const deleteIntegration = useDeleteCRMIntegration();
  const updateIntegration = useUpdateCRMIntegration();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [integrationToDelete, setIntegrationToDelete] = useState<string | null>(null);

  const handleEdit = (integration: any) => {
    setEditingIntegration(integration);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setIntegrationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (integrationToDelete) {
      deleteIntegration.mutate(integrationToDelete);
      setDeleteDialogOpen(false);
      setIntegrationToDelete(null);
    }
  };

  const toggleActive = (id: string, currentStatus: boolean) => {
    updateIntegration.mutate({
      id,
      updates: { is_active: !currentStatus },
    });
  };

  if (isLoading) {
    return <div>Loading integrations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">CRM Integrations</h2>
          <p className="text-muted-foreground">
            Connect your CRM to automatically trigger rewards when conditions are met
          </p>
        </div>
        <Button onClick={() => {
          setEditingIntegration(null);
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Integration
        </Button>
      </div>

      {integrations && integrations.length === 0 ? (
        <Card className="p-12 text-center">
          <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No CRM Integrations Yet</h3>
          <p className="text-muted-foreground mb-4">
            Connect your CRM to automate reward fulfillment
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Integration
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {integrations?.map((integration) => (
            <Card key={integration.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="text-4xl">
                    {CRM_LOGOS[integration.crm_provider] || "🔗"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold capitalize">
                        {integration.crm_provider}
                      </h3>
                      {integration.is_active ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      {integration.campaign_id ? (
                        <p>Campaign-specific integration</p>
                      ) : (
                        <p>Global client integration</p>
                      )}
                      {integration.last_event_at ? (
                        <p>
                          Last event:{" "}
                          {formatDistanceToNow(new Date(integration.last_event_at), {
                            addSuffix: true,
                          })}
                        </p>
                      ) : (
                        <p className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          No events received yet
                        </p>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.keys(integration.event_mappings as any).map((key) => {
                        const mapping = (integration.event_mappings as any)[key];
                        return (
                          <Badge key={key} variant="outline">
                            Condition #{mapping.condition_number}: {mapping.event_type}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(integration)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(integration.id, integration.is_active)}
                  >
                    {integration.is_active ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(integration.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CRMIntegrationDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingIntegration(null);
        }}
        integration={editingIntegration}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Integration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the CRM integration. All event logs will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}