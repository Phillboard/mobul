/**
 * Audit Logs Table Column Definitions
 * Type-safe column configuration for TanStack Table
 */
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatDate, DATE_FORMATS } from '@/lib/utils/dateUtils";

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action_type: string;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  success: boolean;
  created_at: string;
}

export function createAuditLogsColumns(): ColumnDef<AuditLogRow>[] {
  return [
    {
      accessorKey: "created_at",
      header: "Timestamp",
      cell: ({ row }) => {
        const timestamp = row.getValue("created_at") as string;
        return (
          <span className="font-mono text-xs">
            {formatDate(timestamp, DATE_FORMATS.DATETIME)}
          </span>
        );
      },
      sortingFn: "datetime",
    },
    {
      accessorKey: "action_type",
      header: "Action",
      cell: ({ row }) => {
        const action = row.getValue("action_type") as string;
        return <Badge variant="outline">{action}</Badge>;
      },
    },
    {
      accessorKey: "resource_type",
      header: "Resource",
      cell: ({ row }) => {
        const resourceType = row.getValue("resource_type") as string | null;
        return (
          <span className="text-muted-foreground">
            {resourceType || "N/A"}
          </span>
        );
      },
    },
    {
      accessorKey: "ip_address",
      header: "IP Address",
      cell: ({ row }) => {
        const ipAddress = row.getValue("ip_address") as string | null;
        return (
          <span className="font-mono text-xs">
            {ipAddress || "N/A"}
          </span>
        );
      },
    },
    {
      accessorKey: "success",
      header: "Status",
      cell: ({ row }) => {
        const success = row.getValue("success") as boolean;
        return (
          <Badge variant={success ? "secondary" : "destructive"}>
            {success ? "Success" : "Failed"}
          </Badge>
        );
      },
      filterFn: "equals',
    },
  ];
}
