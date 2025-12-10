import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { toast } from "sonner";

interface DeactivateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string | null;
  isActive: boolean;
}

export function DeactivateUserDialog({
  open,
  onOpenChange,
  userId,
  userName,
  isActive,
}: DeactivateUserDialogProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const toggleActiveMutation = useMutation({
    mutationFn: async (newActiveState: boolean) => {
      setIsLoading(true);

      // Update user active status
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ is_active: newActiveState })
        .eq("id", userId);

      if (updateError) throw updateError;

      // Log the action
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("user_management_audit").insert({
          actor_id: user.id,
          target_user_id: userId,
          action: newActiveState ? "user_reactivated" : "user_deactivated",
          old_value: { is_active: !newActiveState },
          new_value: { is_active: newActiveState },
        });
      }

      setIsLoading(false);
    },
    onSuccess: (_, newActiveState) => {
      queryClient.invalidateQueries({ queryKey: ["manageableUsersPaginated"] });
      queryClient.invalidateQueries({ queryKey: ["manageableUsers"] });
      toast.success(
        newActiveState
          ? `${userName || "User"} has been reactivated`
          : `${userName || "User"} has been deactivated`
      );
      onOpenChange(false);
    },
    onError: (error: Error) => {
      setIsLoading(false);
      toast.error(`Failed to update user status: ${error.message}`);
    },
  });

  const handleToggle = () => {
    toggleActiveMutation.mutate(!isActive);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isActive ? "Deactivate User" : "Reactivate User"}
          </DialogTitle>
          <DialogDescription>
            {isActive
              ? `Are you sure you want to deactivate ${userName || "this user"}?`
              : `Are you sure you want to reactivate ${userName || "this user"}?`}
          </DialogDescription>
        </DialogHeader>

        {isActive && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Deactivating this user will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Prevent them from logging in</li>
                <li>Hide them from default user lists</li>
                <li>Revoke all active sessions immediately</li>
                <li>Preserve all their data and history</li>
              </ul>
              <p className="mt-2 font-medium">
                This action can be reversed by reactivating the user.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {!isActive && (
          <Alert>
            <AlertDescription>
              Reactivating this user will restore their access to the platform
              with their existing roles and permissions.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={isActive ? "destructive" : "default"}
            onClick={handleToggle}
            disabled={isLoading}
          >
            {isLoading
              ? "Processing..."
              : isActive
              ? "Deactivate User"
              : "Reactivate User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
