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
      // Query gift_card_billing_ledger (has the actual delivery data)
      const { data: billingData, error: billingError } = await supabase
        .from("gift_card_billing_ledger")
        .select(`
          id,
          billed_at,
          recipient_id,
          campaign_id,
          denomination,
          inventory_card_id,
          recipients (
            first_name,
            last_name,
            phone
          ),
          gift_card_brands (
            brand_name
          ),
          gift_card_inventory (
            card_code,
            status
          )
        `)
        .eq("campaign_id", campaignId)
        .order("billed_at", { ascending: false })
        .limit(50);

      if (billingError) {
        console.error("Billing ledger query error:", billingError);
        return [];
      }

      if (!billingData || billingData.length === 0) {
        return [];
      }

      // Get unique inventory card IDs to find matching recipient_gift_cards records
      const inventoryCardIds = [...new Set(billingData.map(entry => entry.inventory_card_id).filter(Boolean))];

      // Query recipient_gift_cards to get revoke IDs - match by inventory_card_id
      const { data: rgcData } = await supabase
        .from("recipient_gift_cards")
        .select("id, inventory_card_id, delivery_status, revoked_at")
        .eq("campaign_id", campaignId)
        .in("inventory_card_id", inventoryCardIds);

      // Create a map: inventory_card_id -> recipient_gift_cards record
      const rgcMap = new Map(
        (rgcData || []).map(rgc => [rgc.inventory_card_id, rgc])
      );

      // Combine the data
      return billingData.map((entry: any) => {
        const rgcRecord = rgcMap.get(entry.inventory_card_id);
        const isRevoked = rgcRecord?.revoked_at != null;
        const deliveryStatus = isRevoked 
          ? 'revoked' 
          : (entry.gift_card_inventory?.status === 'delivered' ? 'delivered' : 'sent');

        return {
          id: entry.id, // Billing ledger ID for display
          revokeId: rgcRecord?.id || null, // recipient_gift_cards ID for revoke
          delivery_status: deliveryStatus,
          condition_number: 1,
          created_at: entry.billed_at,
          recipients: entry.recipients,
          gift_cards: {
            card_code: entry.gift_card_inventory?.card_code,
            gift_card_pools: {
              provider: entry.gift_card_brands?.brand_name || 'Gift Card',
              card_value: entry.denomination
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
                          {!isRevoked && delivery.revokeId && (
                            <RevokeGiftCardButton
                              assignmentId={delivery.revokeId}
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
