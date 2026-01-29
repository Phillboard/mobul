import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/shared/components/ui/data-table-column-header";
import { Button } from "@/shared/components/ui/button";

export type ListMemberRow = {
  id: string;
  contact_id: string;
  added_at: string;
  unique_code: string | null;  // Per-list unique code from contact_list_members
  contacts: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
    customer_code: string | null;  // Fallback code from contacts table
  };
};

interface ListMembersColumnsOptions {
  onRemove: (contactId: string) => void;
}

export function createListMembersColumns(
  options: ListMembersColumnsOptions
): ColumnDef<ListMemberRow>[] {
  return [
    {
      id: "name",
      accessorFn: (row) => `${row.contacts?.first_name || ''} ${row.contacts?.last_name || ''}`.trim(),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const firstName = row.original.contacts?.first_name || '';
        const lastName = row.original.contacts?.last_name || '';
        return (
          <div className="font-medium">
            {firstName} {lastName}
          </div>
        );
      },
    },
    {
      id: "code",
      accessorFn: (row) => row.unique_code || row.contacts?.customer_code || '',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Code" />
      ),
      cell: ({ row }) => {
        const code = row.original.unique_code || row.original.contacts?.customer_code;
        return (
          <span className="font-mono text-sm">
            {code || "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "contacts.email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => {
        const email = row.original.contacts?.email;
        return <span>{email || "—"}</span>;
      },
    },
    {
      accessorKey: "contacts.phone",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Phone" />
      ),
      cell: ({ row }) => {
        const phone = row.original.contacts?.phone;
        return <span>{phone || "—"}</span>;
      },
    },
    {
      accessorKey: "contacts.company",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Company" />
      ),
      cell: ({ row }) => {
        const company = row.original.contacts?.company;
        return <span>{company || "—"}</span>;
      },
    },
    {
      accessorKey: "added_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Added" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("added_at") as string;
        return (
          <span className="text-sm text-muted-foreground">
            {new Date(date).toLocaleDateString()}
          </span>
        );
      },
      sortingFn: "datetime",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => options.onRemove(row.original.contact_id)}
          >
            Remove
          </Button>
        );
      },
    },
  ];
}
