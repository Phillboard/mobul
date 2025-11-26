import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { X } from "lucide-react";

interface AssignClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentClients: Array<{ id: string; name: string }>;
}

export function AssignClientDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentClients,
}: AssignClientDialogProps) {
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: orgs = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];

      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("org_id", selectedOrgId)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!selectedOrgId,
  });

  const addClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from("client_users")
        .insert({ client_id: clientId, user_id: userId });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Client assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["manageableUsers"] });
      setSelectedClientId("");
      setSelectedOrgId("");
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error("User is already assigned to this client");
      } else {
        toast.error("Failed to assign client: " + error.message);
      }
    },
  });

  const removeClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from("client_users")
        .delete()
        .eq("client_id", clientId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Client removed successfully");
      queryClient.invalidateQueries({ queryKey: ["manageableUsers"] });
    },
    onError: (error) => {
      toast.error("Failed to remove client: " + error.message);
    },
  });

  const availableClients = clients.filter(
    (client) => !currentClients.some((cc) => cc.id === client.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Client Access for {userName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <h4 className="text-sm font-medium mb-3">Current Clients:</h4>
            {currentClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No clients assigned</p>
            ) : (
              <div className="space-y-2">
                {currentClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <span className="text-sm">{client.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeClientMutation.mutate(client.id)}
                      disabled={removeClientMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Add Client:</h4>
            <div className="space-y-2">
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization..." />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedOrgId && (
                <div className="flex gap-2">
                  <Select
                    value={selectedClientId}
                    onValueChange={setSelectedClientId}
                    disabled={!selectedOrgId}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select client to add..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => selectedClientId && addClientMutation.mutate(selectedClientId)}
                    disabled={!selectedClientId || addClientMutation.isPending}
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
