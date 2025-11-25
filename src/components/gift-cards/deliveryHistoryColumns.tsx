/**
 * Delivery History Table Column Definitions
 * Type-safe column configuration for TanStack Table
 */
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatDate, DATE_FORMATS } from "@/lib/dateUtils";
import { formatCurrency } from "@/lib/currencyUtils";

export interface DeliveryHistoryRow {
  id: string;
  delivered_at: string;
  delivery_address: string;
  delivery_method: string;
  delivery_status: string;
  condition_number: number;
  recipients: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  campaigns: {
    name: string;
  } | null;
  gift_cards: {
    gift_card_pools: {
      card_value: number;
      provider: string;
    } | null;
  } | null;
}

const getDeliveryStatusBadge = (status: string) => {
  const variants: Record<string, "default" | "destructive" | "outline"> = {
    sent: "default",
    failed: "destructive",
    bounced: "destructive",
  };
  
  return (
    <Badge variant={variants[status] || "outline"}>
      {status}
    </Badge>
  );
};

export function createDeliveryHistoryColumns(): ColumnDef<DeliveryHistoryRow>[] {
  return [
    {
      accessorKey: "delivered_at",
      header: "Delivered",
      cell: ({ row }) => (
        <span className="text-sm">
          {formatDate(row.getValue("delivered_at"), DATE_FORMATS.LONG)}
        </span>
      ),
      sortingFn: "datetime",
    },
    {
      id: "recipient",
      header: "Recipient",
      accessorFn: (row) =>
        row.recipients
          ? `${row.recipients.first_name || ""} ${row.recipients.last_name || ""}`.trim()
          : "-",
      cell: ({ row }) => {
        const recipient = row.original.recipients;
        if (!recipient) return <span className="text-muted-foreground">-</span>;
        
        return (
          <div>
            <div className="font-medium">
              {recipient.first_name} {recipient.last_name}
            </div>
            <div className="text-sm text-muted-foreground">
              {row.original.delivery_address}
            </div>
          </div>
        );
      },
    },
    {
      id: "campaign",
      header: "Campaign",
      accessorFn: (row) => row.campaigns?.name || "-",
      cell: ({ row }) => row.original.campaigns?.name || "-",
    },
    {
      accessorKey: "condition_number",
      header: "Condition",
      cell: ({ row }) => (
        <Badge variant="outline">
          Condition {row.getValue("condition_number")}
        </Badge>
      ),
      sortingFn: "basic",
    },
    {
      id: "value",
      header: "Value",
      accessorFn: (row) => row.gift_cards?.gift_card_pools?.card_value || 0,
      cell: ({ row }) => {
        const pool = row.original.gift_cards?.gift_card_pools;
        if (!pool) return <span className="text-muted-foreground">—</span>;
        
        return (
          <div>
            <span className="font-semibold">
              {formatCurrency(pool.card_value)}
            </span>
            <div className="text-xs text-muted-foreground">
              {pool.provider}
            </div>
          </div>
        );
      },
      sortingFn: "basic",
    },
    {
      accessorKey: "delivery_method",
      header: "Method",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {(row.getValue("delivery_method") as string).toUpperCase()}
        </Badge>
      ),
    },
    {
      accessorKey: "delivery_status",
      header: "Status",
      cell: ({ row }) => getDeliveryStatusBadge(row.getValue("delivery_status")),
      filterFn: "equals",
    },
  ];
}
