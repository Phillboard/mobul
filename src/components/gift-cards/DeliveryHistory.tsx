import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useGiftCardDeliveries } from "@/hooks/useGiftCards";
import { format } from "date-fns";

interface DeliveryHistoryProps {
  campaignId?: string;
}

export function DeliveryHistory({ campaignId }: DeliveryHistoryProps) {
  const { deliveries, isLoading } = useGiftCardDeliveries(campaignId);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "outline"> = {
      sent: "default",
      failed: "destructive",
      bounced: "destructive",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery History</CardTitle>
        <CardDescription>
          All gift card deliveries and their status
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Delivered</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Loading deliveries...
                </TableCell>
              </TableRow>
            ) : deliveries?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No deliveries found
                </TableCell>
              </TableRow>
            ) : (
              deliveries?.map((delivery: any) => (
                <TableRow key={delivery.id}>
                  <TableCell>
                    {format(new Date(delivery.delivered_at), "PPp")}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {delivery.recipients?.first_name} {delivery.recipients?.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {delivery.delivery_address}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{delivery.campaigns?.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">Condition {delivery.condition_number}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">
                      ${delivery.gift_cards?.gift_card_pools?.card_value?.toFixed(2)}
                    </span>
                    <div className="text-xs text-muted-foreground">
                      {delivery.gift_cards?.gift_card_pools?.provider}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {delivery.delivery_method.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(delivery.delivery_status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
