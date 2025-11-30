import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
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
import { toast } from "sonner";
import { MailOpen } from "lucide-react";
import { createPendingInvitationsColumns } from "./pendingInvitationsColumns";
import { basicTableModels } from '@/lib/utils/tableHelpers";

export function PendingInvitations() {
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([]);

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

  const columns = createPendingInvitationsColumns(
    copyInviteLink,
    (invite) => resendMutation.mutate(invite),
    (inviteId) => revokeMutation.mutate(inviteId),
    resendMutation.isPending || revokeMutation.isPending
  );

  const table = useReactTable({
    data: invitations || [],
    columns,
    ...basicTableModels,
    state: { sorting },
    onSortingChange: setSorting,
  });

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
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? "flex items-center gap-2 cursor-pointer select-none"
                            : ""
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {typeof header.column.columnDef.header === "function"
                          ? header.column.columnDef.header(header.getContext())
                          : header.column.columnDef.header}
                        {header.column.getIsSorted() && (
                          <span>{header.column.getIsSorted() === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {typeof cell.column.columnDef.cell === "function"
                        ? cell.column.columnDef.cell(cell.getContext())
                        : cell.getValue()}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground'>
                  No pending invitations
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
