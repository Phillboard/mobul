/**
 * Pool Balance History Table Column Definitions
 * Type-safe column configuration for TanStack Table
 */
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatDate, DATE_FORMATS } from "@/lib/dateUtils";
import { formatCurrency } from "@/lib/currencyUtils";
import { maskCardCode } from "@/lib/giftCardUtils";

export interface BalanceHistoryRow {
  id: string;
  gift_card_id: string;
  previous_balance: number | null;
  new_balance: number | null;
  change_amount: number | null;
  checked_at: string;
  status: string;
  gift_cards?: {
    card_code: string;
  };
}

export function createPoolBalanceHistoryColumns(): ColumnDef<BalanceHistoryRow>[] {
  return [
    {
      id: "card_code",
      header: "Card",
      cell: ({ row }) => {
        const cardCode = row.original.gift_cards?.card_code;
        return (
          <span className="font-mono text-sm font-medium">
            {cardCode ? maskCardCode(cardCode) : "N/A"}
          </span>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "checked_at",
      header: "Check Date",
      cell: ({ row }) => {
        const checkedAt = row.getValue("checked_at") as string;
        return (
          <span className="text-sm">
            {formatDate(checkedAt, DATE_FORMATS.DATETIME)}
          </span>
        );
      },
      sortingFn: "datetime",
    },
    {
      accessorKey: "previous_balance",
      header: "Previous Balance",
      cell: ({ row }) => {
        const balance = row.getValue("previous_balance") as number | null;
        return (
          <span className="font-medium text-base">
            {balance ? formatCurrency(balance) : "N/A"}
          </span>
        );
      },
      sortingFn: "basic",
    },
    {
      accessorKey: "new_balance",
      header: "New Balance",
      cell: ({ row }) => {
        const balance = row.getValue("new_balance") as number | null;
        return (
          <span className="font-medium text-base">
            {balance ? formatCurrency(balance) : "N/A"}
          </span>
        );
      },
      sortingFn: "basic",
    },
    {
      accessorKey: "change_amount",
      header: "Change",
      cell: ({ row }) => {
        const change = row.getValue("change_amount") as number | null;
        if (!change) return null;
        
        return (
          <span
            className={
              change < 0
                ? "text-red-600 dark:text-red-400 font-semibold text-base"
                : "text-green-600 dark:text-green-400 font-semibold text-base"
            }
          >
            {change > 0 ? "+" : ""}
            {formatCurrency(change)}
          </span>
        );
      },
      sortingFn: "basic",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant={status === "success" ? "default" : "destructive"}>
            {status}
          </Badge>
        );
      },
      filterFn: "equals",
    },
  ];
}
