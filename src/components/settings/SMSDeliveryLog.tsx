import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MessageSquare, RefreshCw, Search } from "lucide-react";
import { useGiftCardDeliveries, useRetryFailedSMS } from "@/hooks/useTwilioNumbers";
import { formatDistanceToNow } from "date-fns";

export function SMSDeliveryLog() {
  const { data: deliveries, isLoading } = useGiftCardDeliveries();
  const retryMutation = useRetryFailedSMS();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredDeliveries = deliveries?.filter((d: any) => 
    d.recipients?.phone?.includes(searchTerm) ||
    d.recipients?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.recipients?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleRetry = async (deliveryId: string) => {
    await retryMutation.mutateAsync(deliveryId);
  };

  const handleRetryAll = async () => {
    await retryMutation.mutateAsync(undefined);
  };

  if (isLoading) {
    return <div>Loading SMS delivery log...</div>;
  }

  const failedCount = deliveries?.filter((d: any) => d.sms_status === 'failed').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">SMS Delivery Log</h2>
          <p className="text-muted-foreground">
            Track gift card SMS delivery status
          </p>
        </div>
        {failedCount > 0 && (
          <Button onClick={handleRetryAll} disabled={retryMutation.isPending}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry {failedCount} Failed
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivery History</CardTitle>
          <CardDescription>
            Recent gift card SMS deliveries
          </CardDescription>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by phone or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Gift Card</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Retries</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeliveries?.map((delivery: any) => (
                <TableRow key={delivery.id}>
                  <TableCell>
                    {delivery.recipients?.first_name} {delivery.recipients?.last_name}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {delivery.recipients?.phone}
                  </TableCell>
                  <TableCell>
                    ${delivery.gift_cards?.gift_card_pools?.card_value} {delivery.gift_cards?.gift_card_pools?.pool_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(delivery.sms_status)}>
                      {delivery.sms_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {delivery.sms_sent_at 
                      ? formatDistanceToNow(new Date(delivery.sms_sent_at), { addSuffix: true })
                      : 'Not sent'}
                  </TableCell>
                  <TableCell>
                    {delivery.retry_count || 0}
                  </TableCell>
                  <TableCell>
                    {delivery.sms_status === 'failed' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRetry(delivery.id)}
                        disabled={retryMutation.isPending}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {(!filteredDeliveries || filteredDeliveries.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No SMS deliveries found
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
