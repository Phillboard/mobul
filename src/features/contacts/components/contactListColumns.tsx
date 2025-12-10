import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { DataTableColumnHeader } from "@/shared/components/ui/data-table-column-header";
import { Eye, MoreHorizontal, Trash2, Copy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { format } from "date-fns";

export type ContactListRow = {
  id: string;
  name: string;
  description: string | null;
  contact_count: number | null;
  updated_at: string;
  list_type: string;
};

interface ContactListColumnsOptions {
  onView: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function createContactListColumns(
  options: ContactListColumnsOptions
): ColumnDef<ContactListRow>[] {
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
      accessorKey: "updated_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Updated" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("updated_at") as string;
        return (
          <span className="text-sm text-muted-foreground">
            {format(new Date(date), "MMM d, yyyy")}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const list = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => options.onView(list.id)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {options.onDuplicate && (
                <DropdownMenuItem onClick={() => options.onDuplicate(list.id)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
              )}
              {options.onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => options.onDelete(list.id)}
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
