import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { toast } from "sonner";
import { X } from "lucide-react";

interface AssignOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentOrgs: Array<{ id: string; name: string }>;
}

export function AssignOrganizationDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentOrgs,
}: AssignOrganizationDialogProps) {
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: allOrgs = [] } = useQuery({
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

  const addOrgMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const { error } = await supabase
        .from("org_members")
        .insert({ org_id: orgId, user_id: userId });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Organization assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["manageableUsers"] });
      setSelectedOrgId("");
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error("User is already a member of this organization");
      } else {
        toast.error("Failed to assign organization: " + error.message);
      }
    },
  });

  const removeOrgMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const { error } = await supabase
        .from("org_members")
        .delete()
        .eq("org_id", orgId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Organization removed successfully");
      queryClient.invalidateQueries({ queryKey: ["manageableUsers"] });
    },
    onError: (error) => {
      toast.error("Failed to remove organization: " + error.message);
    },
  });

  const availableOrgs = allOrgs.filter(
    (org) => !currentOrgs.some((co) => co.id === org.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Organization Access for {userName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <h4 className="text-sm font-medium mb-3">Current Organizations:</h4>
            {currentOrgs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No organizations assigned</p>
            ) : (
              <div className="space-y-2">
                {currentOrgs.map((org) => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <span className="text-sm">{org.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOrgMutation.mutate(org.id)}
                      disabled={removeOrgMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {availableOrgs.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Add Organization:</h4>
              <div className="flex gap-2">
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select organization to add..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOrgs.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => selectedOrgId && addOrgMutation.mutate(selectedOrgId)}
                  disabled={!selectedOrgId || addOrgMutation.isPending}
                >
                  Add
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
