import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Badge } from "@/shared/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Gift, Clock, CheckCircle, XCircle, User, Undo2 } from "lucide-react";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { RevokeGiftCardButton } from "@/features/gift-cards/components/RevokeGiftCardButton";

interface DeliveryTimelinePanelProps {
  campaignId: string;
}

export function DeliveryTimelinePanel({ campaignId }: DeliveryTimelinePanelProps) {
  const { data: deliveries, isLoading } = useQuery({
    queryKey: ["campaign-gift-deliveries", campaignId],
    queryFn: async () => {
      // Query recipient_gift_cards - simpler query
      const { data: rgcData, error: rgcError } = await supabase
        .from("recipient_gift_cards")
        .select(`
          id,
          delivery_status,
          created_at,
          condition_id,
          recipient_id,
          gift_card_id,
          recipients (
            first_name,
            last_name,
            phone
          )
        `)
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (rgcError) {
        console.error("Recipient gift cards query error:", rgcError);
        return [];
      }

      if (!rgcData || rgcData.length === 0) {
        return [];
      }

      // Get all unique gift card IDs
      const cardIds = rgcData
        .map(entry => entry.gift_card_id)
        .filter(Boolean);

      if (cardIds.length === 0) {
        return rgcData.map(entry => ({
          id: entry.id,
          delivery_status: entry.delivery_status,
          condition_number: 1,
          created_at: entry.created_at,
          recipients: entry.recipients,
          gift_cards: {
            card_code: null,
            gift_card_pools: {
              provider: 'Gift Card',
              card_value: 0
            }
          }
        }));
      }

      // Query gift card inventory separately
      const { data: inventoryData } = await supabase
        .from("gift_card_inventory")
        .select(`
          id,
          card_code,
          denomination,
          brand_id,
          gift_card_brands (
            brand_name
          )
        `)
        .in("id", cardIds);

      // Create a map of card data
      const cardMap = new Map(
        (inventoryData || []).map(card => [card.id, card])
      );

      // Combine the data
      return rgcData.map(entry => {
        const cardInfo = cardMap.get(entry.gift_card_id);
        return {
          id: entry.id,
          delivery_status: entry.delivery_status,
          condition_number: 1,
          created_at: entry.created_at,
          recipients: entry.recipients,
          gift_cards: {
            card_code: cardInfo?.card_code,
            gift_card_pools: {
              provider: cardInfo?.gift_card_brands?.brand_name || 'Gift Card',
              card_value: cardInfo?.denomination || 0
            }
          }
        };
      });
    },
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading delivery timeline...</div>;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "revoked":
        return <Undo2 className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-amber-600" />;
    }
  };

  const getStatusColor = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (status) {
      case "sent":
      case "delivered":
        return "default";
      case "failed":
        return "destructive";
      case "revoked":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Deliveries</CardTitle>
        <CardDescription>Gift card fulfillment timeline</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {deliveries && deliveries.length > 0 ? (
            <div className="space-y-4">
              {deliveries.map((delivery: any) => {
                const isRevoked = delivery.delivery_status === 'revoked';
                const recipientName = `${delivery.recipients?.first_name || ''} ${delivery.recipients?.last_name || ''}`.trim();
                
                return (
                  <div
                    key={delivery.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/30 hover:border-primary/20 transition-all duration-200 ${isRevoked ? 'opacity-60' : ''}`}
                  >
                    <div className="mt-1">{getStatusIcon(delivery.delivery_status)}</div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className={`font-medium text-sm ${isRevoked ? 'line-through' : ''}`}>
                            {recipientName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={getStatusColor(delivery.delivery_status)} 
                            className={`text-xs ${isRevoked ? 'line-through' : ''}`}
                          >
                            {delivery.delivery_status}
                          </Badge>
                          {!isRevoked && (
                            <RevokeGiftCardButton
                              assignmentId={delivery.id}
                              recipientName={recipientName}
                              cardValue={delivery.gift_cards?.gift_card_pools?.card_value}
                              brandName={delivery.gift_cards?.gift_card_pools?.provider}
                              showText={false}
                              size="icon"
                              variant="ghost"
                            />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Gift className="h-3 w-3" />
                        <span className={isRevoked ? 'line-through' : ''}>
                          ${delivery.gift_cards?.gift_card_pools?.card_value}{" "}
                          {delivery.gift_cards?.gift_card_pools?.provider}
                        </span>
                        <span>•</span>
                        <span>Condition #{delivery.condition_number}</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(delivery.created_at), { addSuffix: true })}
                        </span>
                        {delivery.delivery_method === "sms" && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{delivery.recipients?.phone}</span>
                          </>
                        )}
                      </div>

                      {delivery.sms_error_message && (
                        <div className="text-xs text-destructive mt-1">
                          Error: {delivery.sms_error_message}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Gift className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No gift cards delivered yet</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
