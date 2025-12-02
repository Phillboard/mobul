import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Gift, Clock, CheckCircle, XCircle, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DeliveryTimelinePanelProps {
  campaignId: string;
}

export function DeliveryTimelinePanel({ campaignId }: DeliveryTimelinePanelProps) {
  const { data: deliveries, isLoading } = useQuery({
    queryKey: ["campaign-gift-deliveries", campaignId],
    queryFn: async () => {
      // Query the new billing ledger for gift card transactions
      const { data, error } = await supabase
        .from("gift_card_billing_ledger")
        .select(`
          *,
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

      if (error) {
        console.error("Billing ledger query error:", error);
        return [];
      }
      
      // Transform to expected format
      return (data || []).map(entry => ({
        id: entry.id,
        delivery_status: entry.gift_card_inventory?.status === 'delivered' ? 'delivered' : 'sent',
        condition_number: 1, // Condition info would come from campaign_gift_card_config
        created_at: entry.billed_at,
        recipients: entry.recipients,
        gift_cards: {
          card_code: entry.gift_card_inventory?.card_code,
          gift_card_pools: {
            provider: entry.gift_card_brands?.brand_name || 'Gift Card',
            card_value: entry.denomination
          }
        }
      }));
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
      default:
        return <Clock className="h-4 w-4 text-amber-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
      case "delivered":
        return "default";
      case "failed":
        return "destructive";
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
              {deliveries.map((delivery: any) => (
                <div
                  key={delivery.id}
                  className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-1">{getStatusIcon(delivery.delivery_status)}</div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {delivery.recipients?.first_name} {delivery.recipients?.last_name}
                        </span>
                      </div>
                      <Badge variant={getStatusColor(delivery.delivery_status)} className="text-xs">
                        {delivery.delivery_status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Gift className="h-3 w-3" />
                      <span>
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
              ))}
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
