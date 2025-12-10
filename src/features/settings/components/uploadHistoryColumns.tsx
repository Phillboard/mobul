import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/shared/components/ui/badge";
import { DataTableColumnHeader } from "@/shared/components/ui/data-table-column-header";
import { format } from "date-fns";

export type UploadHistoryRow = {
  id: string;
  created_at: string;
  file_name: string;
  total_codes: number;
  successful_codes: number;
  duplicate_codes: number;
  error_codes: number;
  upload_status: string;
};

export function createUploadHistoryColumns(): ColumnDef<UploadHistoryRow>[] {
  return [
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("created_at") as string;
        return (
          <span className="text-sm">
            {format(new Date(date), "MMM dd, yyyy HH:mm")}
          </span>
        );
      },
    },
    {
      accessorKey: "file_name",
      header: "File Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("file_name")}</div>
      ),
    },
    {
      accessorKey: "total_codes",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total" />
      ),
      cell: ({ row }) => (
        <div className="text-center">{row.getValue("total_codes")}</div>
      ),
    },
    {
      accessorKey: "successful_codes",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Success" />
      ),
      cell: ({ row }) => (
        <div className="text-center text-green-600">
          {row.getValue("successful_codes")}
        </div>
      ),
    },
    {
      accessorKey: "duplicate_codes",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Duplicates" />
      ),
      cell: ({ row }) => (
        <div className="text-center text-yellow-600">
          {row.getValue("duplicate_codes")}
        </div>
      ),
    },
    {
      accessorKey: "error_codes",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Errors" />
      ),
      cell: ({ row }) => (
        <div className="text-center text-red-600">
          {row.getValue("error_codes")}
        </div>
      ),
    },
    {
      accessorKey: "upload_status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("upload_status") as string;
        return (
          <Badge
            variant={
              status === "completed"
                ? "default"
                : status === "failed"
                ? "destructive"
                : "secondary"
            }
          >
            {status}
          </Badge>
        );
      },
    },
  ];
}
