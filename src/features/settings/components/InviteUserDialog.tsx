import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { callEdgeFunction } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { toast } from "sonner";
import { UserPlus, Mail, Info } from "lucide-react";
import { useInvitableRoles } from '@/core/auth/hooks';
import { AppRole } from '@core/auth/roles';
import { Alert, AlertDescription } from "@/shared/components/ui/alert";

export function InviteUserDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole | "">("");
  const [orgId, setOrgId] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const { invitableRoles, isLoading: rolesLoading } = useInvitableRoles();
  
  const selectedRoleConfig = invitableRoles.find((r) => r.value === role);
  const showOrgField = selectedRoleConfig?.requiresOrg || false;
  const showClientField = selectedRoleConfig?.requiresClient || false;

  // Reset org/client when role changes
  useEffect(() => {
    if (!showOrgField) setOrgId("");
    if (!showClientField) setClientId("");
  }, [role, showOrgField, showClientField]);

  // Fetch organizations for selection
  const { data: organizations } = useQuery({
    queryKey: ["organizations"],
    enabled: showOrgField,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch clients for selection
  const { data: clients } = useQuery({
    queryKey: ["clients"],
    enabled: showClientField,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const data = await callEdgeFunction<{ inviteUrl?: string }>(
        Endpoints.messaging.sendUserInvitation,
        {
          email,
          role,
          orgId: orgId || undefined,
          clientId: clientId || undefined,
          message: message || undefined,
        }
      );

      return data;
    },
    onSuccess: (data) => {
      toast.success("Invitation sent successfully!", {
        description: `Invitation link copied to clipboard`,
      });
      
      // Copy invite URL to clipboard
      if (data.inviteUrl && navigator.clipboard) {
        navigator.clipboard.writeText(data.inviteUrl);
      }
      
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] });
      
      // Reset form
      setEmail("");
      setRole("");
      setOrgId("");
      setClientId("");
      setMessage("");
      setOpen(false);
    },
    onError: (error: any) => {
      toast.error("Failed to send invitation", {
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !role) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (showOrgField && !orgId) {
      toast.error("Organization is required for this role");
      return;
    }
    if (showClientField && !clientId) {
      toast.error("Client is required for this role");
      return;
    }
    inviteMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite New User
          </DialogTitle>
          <DialogDescription>
            Send an invitation email to add a new user to the platform
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Select Role *</Label>
            {rolesLoading ? (
              <p className="text-sm text-muted-foreground">Loading roles...</p>
            ) : invitableRoles.length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  You don't have permission to invite users
                </AlertDescription>
              </Alert>
            ) : (
              <RadioGroup value={role} onValueChange={(val) => setRole(val as AppRole)}>
                {invitableRoles.map((roleOption) => (
                  <div
                    key={roleOption.value}
                    className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-muted/50 transition-all duration-200"
                  >
                    <RadioGroupItem value={roleOption.value} id={roleOption.value} />
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor={roleOption.value}
                        className="text-base font-medium cursor-pointer"
                      >
                        {roleOption.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {roleOption.description}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          {selectedRoleConfig && (showOrgField || showClientField) && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm font-medium">Assignment Required</p>
              
              {showOrgField && (
                <div className="space-y-2">
                  <Label htmlFor="organization">
                    Organization * <span className="text-muted-foreground text-xs">(Required for this role)</span>
                  </Label>
                  <Select value={orgId} onValueChange={setOrgId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization..." />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations?.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showClientField && (
                <div className="space-y-2">
                  <Label htmlFor="client">
                    Client * <span className="text-muted-foreground text-xs">(Required for this role)</span>
                  </Label>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to the invitation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={inviteMutation.isPending || invitableRoles.length === 0}>
              {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
