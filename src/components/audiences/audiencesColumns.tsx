/**
 * Audiences Table Column Definitions
 * Type-safe column configuration for TanStack Table
 */
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, DATE_FORMATS } from "@/lib/dateUtils";

export interface AudienceRow {
  id: string;
  name: string;
  source: string;
  total_count: number | null;
  valid_count: number | null;
  status: string | null;
  created_at: string | null;
}

const getStatusBadgeVariant = (status: string | null): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "ready":
      return "default";
    case "processing":
      return "secondary";
    case "error":
      return "destructive";
    default:
      return "outline";
  }
};

export function createAudiencesColumns(
  onViewAudience: (id: string) => void
): ColumnDef<AudienceRow>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => (
        <span className="capitalize">{row.getValue("source")}</span>
      ),
    },
    {
      accessorKey: "total_count",
      header: () => <div className="text-right">Total</div>,
      cell: ({ row }) => {
        const count = row.getValue("total_count") as number | null;
        return (
          <div className="text-right">
            {count?.toLocaleString() || "-"}
          </div>
        );
      },
      sortingFn: "basic",
    },
    {
      accessorKey: "valid_count",
      header: () => <div className="text-right">Valid</div>,
      cell: ({ row }) => {
        const count = row.getValue("valid_count") as number | null;
        return (
          <div className="text-right">
            {count?.toLocaleString() || "-"}
          </div>
        );
      },
      sortingFn: "basic",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string | null;
        return (
          <Badge variant={getStatusBadgeVariant(status)}>
            {status || "unknown"}
          </Badge>
        );
      },
      filterFn: "equals",
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => {
        const date = row.getValue("created_at") as string | null;
        return date ? formatDate(date, DATE_FORMATS.SHORT) : "-";
      },
      sortingFn: "datetime",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onViewAudience(row.original.id);
          }}
        >
          View
        </Button>
      ),
      enableSorting: false,
    },
  ];
}
