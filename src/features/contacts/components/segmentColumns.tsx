import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { DataTableColumnHeader } from "@/shared/components/ui/data-table-column-header";
import { Eye, MoreHorizontal, Trash2, Copy, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { format } from "date-fns";

export type SegmentRow = {
  id: string;
  name: string;
  description: string | null;
  contact_count: number | null;
  last_sync_at: string | null;
  list_type: string;
};

interface SegmentColumnsOptions {
  onView: (id: string) => void;
  onSync?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function createSegmentColumns(
  options: SegmentColumnsOptions
): ColumnDef<SegmentRow>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const description = row.getValue("description") as string | null;
        return (
          <span className="text-muted-foreground">
            {description || "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "contact_count",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Contacts" />
      ),
      cell: ({ row }) => {
        const count = row.getValue("contact_count") as number | null;
        return <Badge variant="secondary">{count || 0}</Badge>;
      },
    },
    {
      accessorKey: "last_sync_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last Synced" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("last_sync_at") as string | null;
        return (
          <span className="text-sm text-muted-foreground">
            {date ? format(new Date(date), "MMM d, yyyy") : "Never"}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const segment = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => options.onView(segment.id)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {options.onSync && (
                <DropdownMenuItem onClick={() => options.onSync(segment.id)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Now
                </DropdownMenuItem>
              )}
              {options.onDuplicate && (
                <DropdownMenuItem onClick={() => options.onDuplicate(segment.id)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
              )}
              {options.onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => options.onDelete(segment.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
