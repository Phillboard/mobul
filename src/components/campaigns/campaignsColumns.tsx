import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, BarChart3, FileText, Send, Edit, Copy, Trash2 } from "lucide-react";
import { format } from "date-fns";

export type CampaignRow = {
  id: string;
  name: string;
  status: string;
  size: string;
  postage: string | null;
  mail_date: string | null;
  audience?: { name: string } | null;
  template?: { name: string } | null;
  callSessionCount: number;
  rewardCount: number;
  conversionRate: number;
};

interface CampaignsColumnsOptions {
  onViewDetails: (id: string) => void;
  onViewAnalytics: (id: string) => void;
  onReviewProof: (id: string) => void;
  onSubmitToVendor: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function createCampaignsColumns(
  options: CampaignsColumnsOptions
): ColumnDef<CampaignRow>[] {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-muted text-muted-foreground";
      case "scheduled":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "in_progress":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      case "completed":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "cancelled":
        return "bg-red-500/10 text-red-600 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Campaign Name" />
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant="secondary" className={getStatusColor(status)}>
            {getStatusLabel(status)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "audience",
      header: "Audience",
      cell: ({ row }) => {
        const audience = row.original.audience;
        return (
          <span className="text-muted-foreground">
            {audience?.name || "No audience"}
          </span>
        );
      },
    },
    {
      accessorKey: "callSessionCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Calls" />
      ),
      cell: ({ row }) => (
        <div className="text-center">{row.getValue("callSessionCount")}</div>
      ),
    },
    {
      accessorKey: "rewardCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Rewards" />
      ),
      cell: ({ row }) => (
        <div className="text-center">{row.getValue("rewardCount")}</div>
      ),
    },
    {
      accessorKey: "conversionRate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Conversion" />
      ),
      cell: ({ row }) => {
        const rate = row.getValue("conversionRate") as number;
        return (
          <div className="text-center font-medium">
            {rate > 0 ? `${rate.toFixed(1)}%` : "0%"}
          </div>
        );
      },
    },
    {
      accessorKey: "size",
      header: "Size",
      cell: ({ row }) => (
        <span className="text-muted-foreground uppercase">
          {row.getValue("size")}
        </span>
      ),
    },
    {
      accessorKey: "mail_date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Mail Date" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("mail_date") as string | null;
        return date ? (
          <span className="text-muted-foreground">
            {format(new Date(date), "MMM d, yyyy")}
          </span>
        ) : (
          <span className="text-muted-foreground">Not scheduled</span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const campaign = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => options.onViewDetails(campaign.id)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => options.onViewAnalytics(campaign.id)}>
                <BarChart3 className="mr-2 h-4 w-4" />
                View Analytics
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => options.onReviewProof(campaign.id)}>
                <FileText className="mr-2 h-4 w-4" />
                Review Proof
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => options.onSubmitToVendor(campaign.id)}>
                <Send className="mr-2 h-4 w-4" />
                Submit to Vendor
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => options.onEdit(campaign.id)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => options.onDuplicate(campaign.id)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => options.onDelete(campaign.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
