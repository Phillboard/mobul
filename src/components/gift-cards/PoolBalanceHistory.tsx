/**
 * PoolBalanceHistory Component
 * 
 * Purpose: Displays historical balance checks for pool cards
 * Used by: PoolDetailDialog
 * 
 * Key Features:
 * - Chronological balance check history
 * - Shows previous vs new balance
 * - Calculates balance changes
 * - Color-coded positive/negative changes
 * - Success/error status badges
 * 
 * Props:
 * @param {BalanceHistoryWithCard[]} history - Array of balance check records
 * 
 * Related Components: Table, Badge
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/currencyUtils";
import { maskCardCode } from "@/lib/giftCardUtils";
import { BalanceHistoryWithCard } from "@/types/giftCards";

interface PoolBalanceHistoryProps {
  history: BalanceHistoryWithCard[];
}

export function PoolBalanceHistory({ history }: PoolBalanceHistoryProps) {
  return (
    <div className="border-2 rounded-xl overflow-hidden shadow-sm bg-card">
      <Table>
        <TableHeader>
          <TableRow className="border-b-2 bg-muted/30 hover:bg-muted/30 h-14">
            <TableHead className="font-semibold text-base px-6">Card</TableHead>
            <TableHead className="font-semibold text-base px-6">Check Date</TableHead>
            <TableHead className="font-semibold text-base px-6">Previous Balance</TableHead>
            <TableHead className="font-semibold text-base px-6">New Balance</TableHead>
            <TableHead className="font-semibold text-base px-6">Change</TableHead>
            <TableHead className="font-semibold text-base px-6">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-base">
                No balance checks yet
              </TableCell>
            </TableRow>
          ) : (
            history?.map((entry) => (
              <TableRow key={entry.id} className="hover:bg-muted/50 transition-colors h-16">
                <TableCell className="font-mono text-sm font-medium px-6">
                  {entry.gift_cards?.card_code ? maskCardCode(entry.gift_cards.card_code) : 'N/A'}
                </TableCell>
                <TableCell className="text-sm px-6">
                  {entry.checked_at && format(new Date(entry.checked_at), "MMM d, yyyy HH:mm")}
                </TableCell>
                <TableCell className="font-medium text-base px-6">
                  {entry.previous_balance ? formatCurrency(entry.previous_balance) : 'N/A'}
                </TableCell>
                <TableCell className="font-medium text-base px-6">
                  {entry.new_balance ? formatCurrency(entry.new_balance) : 'N/A'}
                </TableCell>
                <TableCell className="px-6">
                  {entry.change_amount && (
                    <span 
                      className={
                        entry.change_amount < 0 
                          ? "text-red-600 dark:text-red-400 font-semibold text-base" 
                          : "text-green-600 dark:text-green-400 font-semibold text-base"
                      }
                    >
                      {entry.change_amount > 0 ? '+' : ''}{formatCurrency(entry.change_amount)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="px-6">
                  <Badge variant={entry.status === 'success' ? 'default' : 'destructive'}>
                    {entry.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
