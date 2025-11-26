import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { AppRole, roleDisplayNames } from "@/lib/roleUtils";
import { roleRequirements } from "@/lib/roleRequirements";
import { AlertCircle } from "lucide-react";

interface ChangeRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentRole: AppRole;
  userName: string;
}

export function ChangeRoleDialog({
  open,
  onOpenChange,
  userId,
  currentRole,
  userName,
}: ChangeRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<AppRole>(currentRole);
  const queryClient = useQueryClient();

  const changeRoleMutation = useMutation({
    mutationFn: async (newRole: AppRole) => {
      // Delete existing role
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      // Insert new role
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: newRole });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated successfully");
      queryClient.invalidateQueries({ queryKey: ["manageableUsers"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to update role: " + error.message);
    },
  });

  const selectedRoleConfig = roleRequirements[selectedRole];
  const requiresWarning =
    selectedRoleConfig.requiresOrg || selectedRoleConfig.requiresClient;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Change Role for {userName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            Current Role: <span className="font-medium">{roleDisplayNames[currentRole]}</span>
          </div>

          <RadioGroup value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
            <div className="space-y-3">
              {Object.entries(roleRequirements).map(([role, config]) => (
                <div key={role} className="flex items-start space-x-3">
                  <RadioGroupItem value={role} id={role} className="mt-1" />
                  <Label htmlFor={role} className="flex-1 cursor-pointer">
                    <div className="font-medium">{roleDisplayNames[role as AppRole]}</div>
                    <div className="text-sm text-muted-foreground">{config.description}</div>
                  </Label>
                  {role === currentRole && (
                    <span className="text-xs text-muted-foreground mt-1">Current</span>
                  )}
                </div>
              ))}
            </div>
          </RadioGroup>

          {requiresWarning && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {selectedRoleConfig.requiresOrg && "This role requires organization assignment. "}
                {selectedRoleConfig.requiresClient && "This role requires client assignment. "}
                You'll need to assign these separately.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => changeRoleMutation.mutate(selectedRole)}
            disabled={changeRoleMutation.isPending || selectedRole === currentRole}
          >
            {changeRoleMutation.isPending ? "Updating..." : "Change Role"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
