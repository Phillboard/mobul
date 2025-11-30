/**
 * Gift Card Inventory Table Column Definitions
 * Type-safe column configuration for TanStack Table
 */
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { formatDate, DATE_FORMATS } from '@/lib/utils/dateUtils';
import { getStatusBadgeVariant, maskCardCode } from "@/lib/campaign/giftCardUtils";

export interface GiftCardInventoryRow {
  id: string;
  card_code: string;
  card_number: string | null;
  status: string;
  claimed_at: string | null;
  delivered_at: string | null;
  expiration_date: string | null;
}

export function createGiftCardInventoryColumns(
  revealedCodes: Set<string>,
  onToggleReveal: (cardId: string) => void
): ColumnDef<GiftCardInventoryRow>[] {
  return [
    {
      accessorKey: "card_code",
      header: "Card Code",
      cell: ({ row }) => {
        const isRevealed = revealedCodes.has(row.original.id);
        const code = row.getValue("card_code") as string;
        
        return (
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono">
              {isRevealed ? code : maskCardCode(code)}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleReveal(row.original.id)}
            >
              {isRevealed ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: "card_number",
      header: "Card Number",
      cell: ({ row }) => {
        const cardNumber = row.getValue("card_number") as string | null;
        if (!cardNumber) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <code className="text-sm font-mono">
            {maskCardCode(cardNumber)}
          </code>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant={getStatusBadgeVariant(status)}>
            {status}
          </Badge>
        );
      },
      filterFn: "equals",
    },
    {
      accessorKey: "claimed_at",
      header: "Claimed Date",
      cell: ({ row }) => {
        const date = row.getValue("claimed_at") as string | null;
        return date ? formatDate(date, DATE_FORMATS.LONG) : "—";
      },
      sortingFn: "datetime",
    },
    {
      accessorKey: "delivered_at",
      header: "Delivered Date",
      cell: ({ row }) => {
        const date = row.getValue("delivered_at") as string | null;
        return date ? formatDate(date, DATE_FORMATS.LONG) : "—";
      },
      sortingFn: "datetime",
    },
    {
      accessorKey: "expiration_date",
      header: "Expiration",
      cell: ({ row }) => {
        const date = row.getValue("expiration_date") as string | null;
        return date ? formatDate(date, DATE_FORMATS.SHORT) : "—";
      },
        sortingFn: "datetime",
    },
  ];
}
