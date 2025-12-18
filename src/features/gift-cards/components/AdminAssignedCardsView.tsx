/**
 * AdminAssignedCardsView Component
 * 
 * Displays all assigned gift cards across all campaigns.
 * Allows admins to filter and revoke cards.
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@core/services/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { formatDate, DATE_FORMATS } from "@shared/utils/date";
import { formatCurrency } from "@shared/utils/currency";
import { Search, RefreshCw, Gift, User, Calendar } from "lucide-react";
import { RevokeGiftCardButton } from "./RevokeGiftCardButton";
import { Skeleton } from "@/shared/components/ui/skeleton";

interface AssignedCard {
  id: string;
  recipient_id: string;
  campaign_id: string;
  condition_id: string | null;
  gift_card_id: string | null;
  delivery_status: string;
  delivered_at: string | null;
  created_at: string;
  revoked_at: string | null;
  recipient: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  campaign: {
    name: string;
  } | null;
  inventory: {
    denomination: number;
    gift_card_brands: {
      brand_name: string;
    } | null;
  } | null;
}

export function AdminAssignedCardsView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");

  // Fetch assigned cards
  const { data: assignedCards, isLoading, refetch } = useQuery({
    queryKey: ["admin-assigned-cards", statusFilter, campaignFilter],
    queryFn: async () => {
      let query = supabase
        .from("recipient_gift_cards")
        .select(`
          id,
          recipient_id,
          campaign_id,
          condition_id,
          gift_card_id,
          delivery_status,
          delivered_at,
          created_at,
          revoked_at,
          recipient:recipients(
            first_name,
            last_name,
            phone,
            email
          ),
          campaign:campaigns(name),
          inventory:gift_card_inventory(
            denomination,
            gift_card_brands(brand_name)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (statusFilter !== "all") {
        query = query.eq("delivery_status", statusFilter);
      }

      if (campaignFilter !== "all") {
        query = query.eq("campaign_id", campaignFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as AssignedCard[];
    },
  });

  // Fetch campaigns for filter dropdown
  const { data: campaigns } = useQuery({
    queryKey: ["campaigns-for-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Filter cards by search term
  const filteredCards = useMemo(() => {
    if (!assignedCards) return [];
    if (!searchTerm) return assignedCards;

    const search = searchTerm.toLowerCase();
    return assignedCards.filter((card) => {
      const recipientName = `${card.recipient?.first_name || ""} ${card.recipient?.last_name || ""}`.toLowerCase();
      const phone = card.recipient?.phone?.toLowerCase() || "";
      const email = card.recipient?.email?.toLowerCase() || "";
      const campaignName = card.campaign?.name?.toLowerCase() || "";

      return (
        recipientName.includes(search) ||
        phone.includes(search) ||
        email.includes(search) ||
        campaignName.includes(search)
      );
    });
  }, [assignedCards, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    if (!assignedCards) return { total: 0, delivered: 0, pending: 0, revoked: 0 };
    return {
      total: assignedCards.length,
      delivered: assignedCards.filter(c => c.delivery_status === 'delivered' || c.delivery_status === 'sent').length,
      pending: assignedCards.filter(c => c.delivery_status === 'pending').length,
      revoked: assignedCards.filter(c => c.delivery_status === 'revoked').length,
    };
  }, [assignedCards]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      sent: "default",
      delivered: "default",
      pending: "secondary",
      failed: "destructive",
      bounced: "destructive",
      revoked: "outline",
    };

    return (
      <Badge 
        variant={variants[status] || "outline"}
        className={status === 'revoked' ? 'line-through opacity-60' : ''}
      >
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Assigned Gift Cards</CardTitle>
            <CardDescription>
              All gift cards assigned to recipients across campaigns
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-500">{stats.revoked}</p>
            <p className="text-xs text-muted-foreground">Revoked</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search recipient, phone, email, campaign..."
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
            </SelectContent>
          </Select>
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns?.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Recipient</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Card</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Gift className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No assigned cards found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCards.map((card) => (
                  <TableRow 
                    key={card.id}
                    className={card.delivery_status === 'revoked' ? 'opacity-60' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {card.recipient?.first_name || ''} {card.recipient?.last_name || ''}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {card.recipient?.phone || card.recipient?.email || 'No contact'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {card.campaign?.name || 'Unknown Campaign'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-muted-foreground" />
                        {card.inventory ? (
                          <div>
                            <span className="font-semibold">
                              {formatCurrency(card.inventory.denomination)}
                            </span>
                            {card.inventory.gift_card_brands && (
                              <span className="text-xs text-muted-foreground ml-1">
                                {card.inventory.gift_card_brands.brand_name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(card.delivery_status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(card.created_at, DATE_FORMATS.SHORT)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {card.delivery_status !== 'revoked' && (
                        <RevokeGiftCardButton
                          assignmentId={card.id}
                          recipientName={`${card.recipient?.first_name || ''} ${card.recipient?.last_name || ''}`.trim()}
                          cardValue={card.inventory?.denomination}
                          brandName={card.inventory?.gift_card_brands?.brand_name}
                          onRevoked={() => refetch()}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredCards.length > 0 && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Showing {filteredCards.length} of {assignedCards?.length || 0} cards
          </p>
        )}
      </CardContent>
    </Card>
  );
}
