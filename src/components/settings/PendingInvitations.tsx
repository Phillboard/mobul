import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MailOpen, RefreshCw, X, Copy, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function PendingInvitations() {
  const queryClient = useQueryClient();

  const { data: invitations, isLoading } = useQuery({
    queryKey: ["pending-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_invitations")
        .select("*")
        .in("status", ["pending", "expired"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch inviter details separately
      const invitationsWithInviters = await Promise.all(
        (data || []).map(async (invite) => {
          if (invite.invited_by) {
            const { data: inviter } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", invite.invited_by)
              .single();
            return { ...invite, inviter };
          }
          return { ...invite, inviter: null };
        })
      );

      return invitationsWithInviters;
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("user_invitations")
        .update({ status: "revoked" })
        .eq("id", invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] });
      toast.success("Invitation revoked");
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (invitation: any) => {
      const { data, error } = await supabase.functions.invoke("send-user-invitation", {
        body: {
          email: invitation.email,
          role: invitation.role,
          orgId: invitation.org_id,
          clientId: invitation.client_id,
        },
      });

      if (error) throw error;
      
      // Revoke old invitation
      await supabase
        .from("user_invitations")
        .update({ status: "revoked" })
        .eq("id", invitation.id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] });
      toast.success("Invitation resent successfully");
    },
  });

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied to clipboard");
  };

  if (isLoading) {
    return <div>Loading invitations...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MailOpen className="h-5 w-5" />
          Pending Invitations
        </CardTitle>
        <CardDescription>
          Manage sent invitations and their status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invitations && invitations.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Invited By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell className="font-medium">{invite.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {invite.role.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {invite.inviter?.full_name || invite.inviter?.email || "Unknown"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={invite.status === "pending" ? "default" : "secondary"}
                    >
                      {invite.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(invite.expires_at), {
                        addSuffix: true,
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyInviteLink(invite.token)}
                        title="Copy invite link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => resendMutation.mutate(invite)}
                        disabled={resendMutation.isPending}
                        title="Resend invitation"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => revokeMutation.mutate(invite.id)}
                        disabled={revokeMutation.isPending}
                        title="Revoke invitation"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No pending invitations
          </div>
        )}
      </CardContent>
    </Card>
  );
}
