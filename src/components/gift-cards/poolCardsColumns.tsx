/**
 * Pool Cards Table Column Definitions
 * Type-safe column configuration for TanStack Table
 */
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { formatCurrency } from '@/lib/utils/currencyUtils';
import { maskCardCode, getStatusBadgeVariant } from '@/lib/campaign/giftCardUtils';
import { formatDate, DATE_FORMATS } from "@/lib/utils/dateUtils";
import { GiftCard } from "@/types/giftCards";

export interface PoolCardRow extends GiftCard {
  cardValue: number; // Default card value from pool
}

export function createPoolCardsColumns(
  revealedCards: Set<string>,
  onToggleReveal: (cardId: string) => void
): ColumnDef<PoolCardRow>[] {
  return [
    {
      accessorKey: "card_code",
      header: "Card Code",
      cell: ({ row }) => {
        const isRevealed = revealedCards.has(row.original.id);
        const code = row.getValue("card_code") as string;
        
        return (
          <span className="font-mono font-medium text-base">
            {isRevealed ? code : maskCardCode(code)}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string || "available";
        return (
          <Badge variant={getStatusBadgeVariant(status)}>
            {status}
          </Badge>
        );
      },
      filterFn: "equals",
    },
    {
      id: "balance",
      header: "Balance",
      accessorFn: (row) => row.current_balance || row.cardValue,
      cell: ({ row }) => {
        const balance = row.original.current_balance || row.original.cardValue;
        return (
          <span className="font-semibold text-base">
            {formatCurrency(balance)}
          </span>
        );
      },
      sortingFn: "basic",
    },
    {
      accessorKey: "last_balance_check",
      header: "Last Check",
      cell: ({ row }) => {
        const lastCheck = row.getValue("last_balance_check") as string | null;
        return (
          <span className="text-sm text-muted-foreground">
            {lastCheck
              ? formatDate(lastCheck, DATE_FORMATS.SHORT)
              : "Never"}
          </span>
        );
      },
      sortingFn: "datetime",
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.getValue("created_at"), DATE_FORMATS.SHORT)}
        </span>
      ),
      sortingFn: "datetime",
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const isRevealed = revealedCards.has(row.original.id);
        
        return (
          <div className="text-right">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleReveal(row.original.id)}
              className="hover:bg-muted h-10 w-10"
            >
              {isRevealed ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </Button>
          </div>
        );
      },
      enableSorting: false,
    },
  ];
}
