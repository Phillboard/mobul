/**
 * PoolCardsTable Component
 * 
 * Purpose: Displays gift cards in a searchable, filterable table
 * Used by: PoolDetailDialog
 * 
 * Key Features:
 * - Search by card code or status
 * - Toggle reveal/hide for card codes (security)
 * - Status badges with color coding
 * - Balance and date information
 * - Responsive table design
 * 
 * Props:
 * @param {GiftCard[]} cards - Array of gift cards to display
 * @param {number} cardValue - Default card value (for cards without balance)
 * @param {boolean} isLoading - Loading state
 * 
 * State Management:
 * - Local state for search query
 * - Local state for revealed card IDs (Set)
 * 
 * Related Components: Table, Input, Button, Badge
 * Edge Functions: None (display only)
 */

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/currencyUtils";
import { maskCardCode, getStatusBadgeVariant } from "@/lib/giftCardUtils";
import { GiftCard } from "@/types/giftCards";

interface PoolCardsTableProps {
  cards: GiftCard[];
  cardValue: number;
  isLoading: boolean;
}

export function PoolCardsTable({ cards, cardValue, isLoading }: PoolCardsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());

  /**
   * Toggles visibility of a card's full code
   */
  const toggleReveal = (cardId: string) => {
    const newRevealed = new Set(revealedCards);
    if (newRevealed.has(cardId)) {
      newRevealed.delete(cardId);
    } else {
      newRevealed.add(cardId);
    }
    setRevealedCards(newRevealed);
  };

  /**
   * Filters cards based on search query
   */
  const filteredCards = cards?.filter(card => 
    card.card_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.status?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search by card code or status..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 text-base border-2 focus-visible:ring-2"
        />
      </div>

      {/* Cards Table */}
      <div className="border-2 rounded-xl overflow-hidden shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 bg-muted/30 hover:bg-muted/30 h-14">
              <TableHead className="font-semibold text-base px-6">Card Code</TableHead>
              <TableHead className="font-semibold text-base px-6">Status</TableHead>
              <TableHead className="font-semibold text-base px-6">Balance</TableHead>
              <TableHead className="font-semibold text-base px-6">Last Check</TableHead>
              <TableHead className="font-semibold text-base px-6">Created</TableHead>
              <TableHead className="text-right font-semibold text-base px-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-base">
                  Loading cards...
                </TableCell>
              </TableRow>
            ) : filteredCards?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-base">
                  No cards found
                </TableCell>
              </TableRow>
            ) : (
              filteredCards?.map((card) => (
                <TableRow key={card.id} className="hover:bg-muted/50 transition-colors h-16">
                  <TableCell className="font-mono font-medium px-6 text-base">
                    {revealedCards.has(card.id) ? card.card_code : maskCardCode(card.card_code)}
                  </TableCell>
                  <TableCell className="px-6">
                    <Badge variant={getStatusBadgeVariant(card.status || 'available')}>
                      {card.status || 'available'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold px-6 text-base">
                    {card.current_balance 
                      ? formatCurrency(card.current_balance)
                      : formatCurrency(cardValue)
                    }
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground px-6">
                    {card.last_balance_check 
                      ? format(new Date(card.last_balance_check), "MMM d, yyyy")
                      : "Never"
                    }
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground px-6">
                    {format(new Date(card.created_at!), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleReveal(card.id)}
                      className="hover:bg-muted h-10 w-10"
                    >
                      {revealedCards.has(card.id) ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
