import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { Gift } from "lucide-react";

export type AgencyCompanyRow = {
  id: string;
  name: string;
  industry: string;
  gift_card_pools?: Array<{ count: number }>;
  credits: number | null;
  created_at: string;
};

export function createAgencyCompaniesColumns(): ColumnDef<AgencyCompanyRow>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Company Name" />
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "industry",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Industry" />
      ),
      cell: ({ row }) => {
        const industry = row.getValue("industry") as string;
        return <Badge variant="outline">{industry}</Badge>;
      },
    },
    {
      id: "pool_count",
      accessorFn: (row) => row.gift_card_pools?.[0]?.count || 0,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Gift Card Pools" />
      ),
      cell: ({ row }) => {
        const count = row.original.gift_card_pools?.[0]?.count || 0;
        return (
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-muted-foreground" />
            <span>{count}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "credits",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Credits" />
      ),
      cell: ({ row }) => {
        const credits = row.getValue("credits") as number | null;
        return <span>{(credits || 0).toLocaleString()}</span>;
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("created_at") as string;
        return (
          <span className="text-sm text-muted-foreground">
            {new Date(date).toLocaleDateString()}
          </span>
        );
      },
      sortingFn: "datetime",
    },
  ];
}
