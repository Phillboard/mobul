import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGiftCards } from "@/hooks/useGiftCards";
import { useGiftCardPools } from "@/hooks/useGiftCardPools";
import { format } from "date-fns";

interface GiftCardInventoryProps {
  clientId: string;
}

export function GiftCardInventory({ clientId }: GiftCardInventoryProps) {
  const [selectedPoolId, setSelectedPoolId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [revealedCodes, setRevealedCodes] = useState<Set<string>>(new Set());
  
  const { pools } = useGiftCardPools(clientId);
  const { cards, isLoading } = useGiftCards(selectedPoolId || undefined);

  const filteredCards = cards?.filter(card => 
    statusFilter === "all" || card.status === statusFilter
  );

  const maskCode = (code: string) => {
    if (code.length <= 4) return code;
    return "•".repeat(code.length - 4) + code.slice(-4);
  };

  const toggleReveal = (cardId: string) => {
    const newRevealed = new Set(revealedCodes);
    if (newRevealed.has(cardId)) {
      newRevealed.delete(cardId);
    } else {
      newRevealed.add(cardId);
    }
    setRevealedCodes(newRevealed);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      available: "default",
      claimed: "secondary",
      delivered: "outline",
      failed: "destructive",
      expired: "destructive",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Gift Card Inventory</CardTitle>
          <CardDescription>
            View and manage individual gift card codes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={selectedPoolId} onValueChange={setSelectedPoolId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pool to view cards" />
                </SelectTrigger>
                <SelectContent>
                  {pools?.map((pool) => (
                    <SelectItem key={pool.id} value={pool.id}>
                      {pool.pool_name} ({pool.total_cards} cards)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="claimed">Claimed</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedPoolId && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Card Code</TableHead>
                  <TableHead>Card Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Claimed Date</TableHead>
                  <TableHead>Delivered Date</TableHead>
                  <TableHead>Expiration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Loading cards...
                    </TableCell>
                  </TableRow>
                ) : filteredCards?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No cards found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCards?.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-sm">
                            {revealedCodes.has(card.id) ? card.card_code : maskCode(card.card_code)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleReveal(card.id)}
                          >
                            {revealedCodes.has(card.id) ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {card.card_number ? (
                          <code className="text-sm">{maskCode(card.card_number)}</code>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(card.status)}</TableCell>
                      <TableCell>
                        {card.claimed_at ? format(new Date(card.claimed_at), "PPp") : "—"}
                      </TableCell>
                      <TableCell>
                        {card.delivered_at ? format(new Date(card.delivered_at), "PPp") : "—"}
                      </TableCell>
                      <TableCell>
                        {card.expiration_date ? format(new Date(card.expiration_date), "PP") : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
