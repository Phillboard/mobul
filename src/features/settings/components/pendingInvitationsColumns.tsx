/**
 * Pending Invitations Table Column Definitions
 * Type-safe column configuration for TanStack Table
 */
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Clock, Copy, RefreshCw, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface PendingInvitationRow {
  id: string;
  email: string;
  metadata: any;
  status: string;
  expires_at: string;
  token: string;
  inviter: {
    full_name?: string;
    email?: string;
  } | null;
}

export function createPendingInvitationsColumns(
  onCopyLink: (token: string) => void,
  onResend: (invite: PendingInvitationRow) => void,
  onRevoke: (inviteId: string) => void,
  isPending: boolean
): ColumnDef<PendingInvitationRow>[] {
  return [
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("email")}</span>
      ),
    },
    {
      accessorKey: "metadata",
      header: "Role",
      cell: ({ row }) => {
        const metadata = row.getValue("metadata") as any;
        const role = metadata?.role?.replace("_", " ") || "User";
        return <Badge variant="outline">{role}</Badge>;
      },
      enableSorting: false,
    },
    {
      id: "inviter",
      header: "Invited By",
      cell: ({ row }) => {
        const inviter = row.original.inviter;
        return inviter?.full_name || inviter?.email || "Unknown";
      },
      enableSorting: false,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant={status === "pending" ? "default" : "secondary"}>
            {status}
          </Badge>
        );
      },
      filterFn: "equals",
    },
    {
      accessorKey: "expires_at",
      header: "Expires",
      cell: ({ row }) => {
        const expiresAt = row.getValue("expires_at") as string;
        return (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(expiresAt), { addSuffix: true })}
          </div>
        );
      },
      sortingFn: "datetime",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const invite = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onCopyLink(invite.token)}
              title="Copy invite link"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onResend(invite)}
              disabled={isPending}
              title="Resend invitation"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRevoke(invite.id)}
              disabled={isPending}
              title="Revoke invitation"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      },
      enableSorting: false,
    },
  ];
}
