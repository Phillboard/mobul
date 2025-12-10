import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/shared/components/ui/badge";
import { DataTableColumnHeader } from "@/shared/components/ui/data-table-column-header";
import { format } from "date-fns";

export type AuditLogRow = {
  id: string;
  created_at: string;
  action: string;
  recipient?: {
    redemption_code?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  } | null;
  performed_by_user_id: string | null;
  ip_address: string | null;
};

export function createAuditLogColumns(): ColumnDef<AuditLogRow>[] {
  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      uploaded: "secondary",
      approved: "default",
      rejected: "destructive",
      redeemed: "outline",
      viewed: "secondary",
    };

    return <Badge variant={variants[action] || "secondary"}>{action}</Badge>;
  };

  return [
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Timestamp" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("created_at") as string;
        return (
          <span className="text-sm">
            {format(new Date(date), "MMM dd, yyyy HH:mm:ss")}
          </span>
        );
      },
    },
    {
      accessorKey: "action",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Action" />
      ),
      cell: ({ row }) => getActionBadge(row.getValue("action")),
    },
    {
      id: "code",
      accessorFn: (row) => row.recipient?.redemption_code || "N/A",
      header: "Code",
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.recipient?.redemption_code || "N/A"}
        </span>
      ),
    },
    {
      id: "customer",
      accessorFn: (row) =>
        row.recipient
          ? `${row.recipient.first_name || ""} ${row.recipient.last_name || ""}`.trim() || "N/A"
          : "N/A",
      header: "Customer",
      cell: ({ row }) => {
        const recipient = row.original.recipient;
        return recipient
          ? `${recipient.first_name || ""} ${recipient.last_name || ""}`.trim() || "N/A"
          : "N/A";
      },
    },
    {
      accessorKey: "performed_by_user_id",
      header: "Performed By",
      cell: ({ row }) => {
        const userId = row.getValue("performed_by_user_id") as string | null;
        return <span className="text-sm">{userId || "System"}</span>;
      },
    },
    {
      accessorKey: "ip_address",
      header: "IP Address",
      cell: ({ row }) => {
        const ip = row.getValue("ip_address") as string | null;
        return (
          <span className="text-xs text-muted-foreground">{ip || "N/A"}</span>
        );
      },
    },
  ];
}
