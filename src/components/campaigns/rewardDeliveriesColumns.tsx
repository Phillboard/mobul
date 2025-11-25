/**
 * Reward Deliveries Table Column Definitions
 * Type-safe column configuration for TanStack Table
 */
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatRelative, formatDate, DATE_FORMATS } from "@/lib/dateUtils";
import { formatCurrency } from "@/lib/currencyUtils";

export interface RewardDeliveryRow {
  id: string;
  condition_number: number;
  delivery_status: string;
  delivery_method: string;
  delivered_at: string | null;
  created_at: string;
  recipient: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  gift_card: {
    pool: {
      card_value: number;
    } | null;
  } | null;
}

const getDeliveryStatusBadge = (status: string) => {
  const variants: Record<string, "default" | "secondary" | "destructive"> = {
    sent: "default",
    failed: "destructive",
    pending: "secondary",
  };
  
  const labels: Record<string, string> = {
    sent: "Sent",
    failed: "Failed",
    pending: "Pending",
  };
  
  return (
    <Badge variant={variants[status] || "secondary"}>
      {labels[status] || status}
    </Badge>
  );
};

export function createRewardDeliveriesColumns(): ColumnDef<RewardDeliveryRow>[] {
  return [
    {
      id: "recipient",
      header: "Recipient",
      accessorFn: (row) =>
        row.recipient
          ? `${row.recipient.first_name || ""} ${row.recipient.last_name || ""}`.trim()
          : "-",
      cell: ({ row }) => {
        const recipient = row.original.recipient;
        if (!recipient) return <span className="text-muted-foreground">-</span>;
        
        return (
          <span>
            {recipient.first_name} {recipient.last_name}
          </span>
        );
      },
    },
    {
      accessorKey: "condition_number",
      header: "Condition",
      cell: ({ row }) => (
        <Badge variant="outline">
          Condition #{row.getValue("condition_number")}
        </Badge>
      ),
      sortingFn: "basic",
    },
    {
      id: "value",
      header: "Value",
      accessorFn: (row) => row.gift_card?.pool?.card_value || 0,
      cell: ({ row }) => {
        const value = row.original.gift_card?.pool?.card_value || 0;
        return (
          <span className="font-semibold">
            {formatCurrency(value)}
          </span>
        );
      },
      sortingFn: "basic",
    },
    {
      accessorKey: "delivery_status",
      header: "Status",
      cell: ({ row }) => getDeliveryStatusBadge(row.getValue("delivery_status")),
      filterFn: "equals",
    },
    {
      accessorKey: "delivery_method",
      header: "Delivery Method",
      cell: ({ row }) => (
        <span className="capitalize">
          {row.getValue("delivery_method")}
        </span>
      ),
    },
    {
      id: "sent",
      header: "Sent",
      accessorFn: (row) => row.delivered_at || row.created_at,
      cell: ({ row }) => {
        const date = row.original.delivered_at || row.original.created_at;
        return (
          <span className="text-sm text-muted-foreground">
            {formatRelative(date)}
          </span>
        );
      },
      sortingFn: "datetime",
    },
  ];
}
