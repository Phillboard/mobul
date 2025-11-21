import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Download, Eye, EyeOff, Search } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface PoolDetailDialogProps {
  poolId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PoolDetailDialog({ poolId, open, onOpenChange }: PoolDetailDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());

  const { data: pool, isLoading: poolLoading } = useQuery({
    queryKey: ["gift-card-pool", poolId],
    queryFn: async () => {
      if (!poolId) return null;
      const { data, error } = await supabase
        .from("gift_card_pools")
        .select("*, gift_card_brands(*)")
        .eq("id", poolId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!poolId,
  });

  const { data: cards, isLoading: cardsLoading } = useQuery({
    queryKey: ["gift-cards", poolId],
    queryFn: async () => {
      if (!poolId) return [];
      const { data, error } = await supabase
        .from("gift_cards")
        .select("*")
        .eq("pool_id", poolId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!poolId,
  });

  const { data: balanceHistory } = useQuery({
    queryKey: ["balance-history", poolId],
    queryFn: async () => {
      if (!poolId) return [];
      const cardIds = cards?.map(c => c.id) || [];
      if (cardIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("gift_card_balance_history")
        .select("*, gift_cards(card_code)")
        .in("gift_card_id", cardIds)
        .order("checked_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!poolId && !!cards,
  });

  const toggleReveal = (cardId: string) => {
    const newRevealed = new Set(revealedCards);
    if (newRevealed.has(cardId)) {
      newRevealed.delete(cardId);
    } else {
      newRevealed.add(cardId);
    }
    setRevealedCards(newRevealed);
  };

  const maskCard = (code: string) => {
    if (code.length <= 4) return code;
    return "•".repeat(code.length - 4) + code.slice(-4);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      available: "default",
      claimed: "secondary",
      delivered: "outline",
      failed: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const filteredCards = cards?.filter(card => 
    card.card_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.status?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!pool) return null;

  const totalValue = (pool.total_cards || 0) * Number(pool.card_value);
  const availableValue = (pool.available_cards || 0) * Number(pool.card_value);
  const utilizationPercent = pool.total_cards ? ((pool.claimed_cards || 0) / pool.total_cards) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            {pool.gift_card_brands?.logo_url && (
              <img 
                src={pool.gift_card_brands.logo_url} 
                alt={pool.gift_card_brands.brand_name}
                className="h-12 w-12 object-contain"
              />
            )}
            <div>
              <DialogTitle className="text-2xl">{pool.pool_name}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {pool.gift_card_brands?.brand_name} • {formatCurrency(pool.card_value)} cards
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mt-8">
          <Card className="border-2 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">{pool.total_cards || 0}</div>
            </CardContent>
          </Card>
          <Card className="border-2 border-green-200 dark:border-green-900 bg-gradient-to-br from-green-50 to-background dark:from-green-950/20 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Available</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{pool.available_cards || 0}</div>
            </CardContent>
          </Card>
          <Card className="border-2 border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Claimed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{pool.claimed_cards || 0}</div>
            </CardContent>
          </Card>
          <Card className="border-2 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{formatCurrency(totalValue)}</div>
            </CardContent>
          </Card>
          <Card className="border-2 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{utilizationPercent.toFixed(0)}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex gap-3 mt-6">
          <Button variant="outline" size="sm" className="shadow-sm hover:shadow">
            <RefreshCw className="h-4 w-4 mr-2" />
            Check All Balances
          </Button>
          <Button variant="outline" size="sm" className="shadow-sm hover:shadow">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="cards" className="mt-8">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="cards" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Cards ({cards?.length || 0})</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Balance History</TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="cards" className="mt-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by card code or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-2 focus-visible:ring-2"
              />
            </div>

            <div className="border-2 rounded-xl overflow-hidden shadow-sm bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold">Card Code</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Balance</TableHead>
                    <TableHead className="font-semibold">Last Check</TableHead>
                    <TableHead className="font-semibold">Created</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cardsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Loading cards...
                      </TableCell>
                    </TableRow>
                  ) : filteredCards?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No cards found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCards?.map((card) => (
                      <TableRow key={card.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-mono font-medium">
                          {revealedCards.has(card.id) ? card.card_code : maskCard(card.card_code)}
                        </TableCell>
                        <TableCell>{getStatusBadge(card.status || 'available')}</TableCell>
                        <TableCell className="font-semibold">
                          {card.current_balance 
                            ? formatCurrency(card.current_balance)
                            : formatCurrency(pool.card_value)
                          }
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {card.last_balance_check 
                            ? format(new Date(card.last_balance_check), "MMM d, yyyy")
                            : "Never"
                          }
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(card.created_at!), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleReveal(card.id)}
                            className="hover:bg-muted"
                          >
                            {revealedCards.has(card.id) ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <div className="border-2 rounded-xl overflow-hidden shadow-sm bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold">Card</TableHead>
                    <TableHead className="font-semibold">Check Date</TableHead>
                    <TableHead className="font-semibold">Previous Balance</TableHead>
                    <TableHead className="font-semibold">New Balance</TableHead>
                    <TableHead className="font-semibold">Change</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balanceHistory?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No balance checks yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    balanceHistory?.map((entry) => (
                      <TableRow key={entry.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-mono text-sm font-medium">
                          {entry.gift_cards?.card_code ? maskCard(entry.gift_cards.card_code) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {entry.checked_at && format(new Date(entry.checked_at), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {entry.previous_balance ? formatCurrency(entry.previous_balance) : 'N/A'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {entry.new_balance ? formatCurrency(entry.new_balance) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {entry.change_amount && (
                            <span className={entry.change_amount < 0 ? "text-red-600 dark:text-red-400 font-semibold" : "text-green-600 dark:text-green-400 font-semibold"}>
                              {entry.change_amount > 0 ? '+' : ''}{formatCurrency(entry.change_amount)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
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
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card className="border-2 shadow-sm">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-lg">Pool Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
                  <div>
                    <label className="text-sm font-semibold">Auto Balance Check</label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Automatic balance verification
                    </p>
                  </div>
                  <Badge variant={pool.auto_balance_check ? 'default' : 'secondary'} className="text-sm">
                    {pool.auto_balance_check ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
                  <div>
                    <label className="text-sm font-semibold">Check Frequency</label>
                    <p className="text-sm text-muted-foreground mt-1">
                      How often balances are verified
                    </p>
                  </div>
                  <span className="text-sm font-semibold">
                    Every {pool.balance_check_frequency_hours || 168} hours
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
                  <div>
                    <label className="text-sm font-semibold">Low Stock Threshold</label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Alert when inventory drops below
                    </p>
                  </div>
                  <span className="text-sm font-semibold">
                    {pool.low_stock_threshold || 10} cards
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}