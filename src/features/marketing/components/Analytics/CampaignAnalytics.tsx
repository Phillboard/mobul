/**
 * Campaign Analytics Component
 * 
 * Detailed analytics for a marketing campaign.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/shared/components/ui/table";
import { Download, RefreshCw, Loader2 } from "lucide-react";
import { useMarketingSends, useDeliveryTimeline, useExportSends, useRetryFailedSends } from "../../hooks/useMarketingSends";
import { format } from "date-fns";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, BarChart, Bar 
} from "recharts";

interface Props {
  campaignId: string;
  view?: 'charts' | 'recipients';
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  opened: 'bg-purple-100 text-purple-800',
  clicked: 'bg-indigo-100 text-indigo-800',
  bounced: 'bg-red-100 text-red-800',
  failed: 'bg-red-100 text-red-800',
  unsubscribed: 'bg-yellow-100 text-yellow-800',
};

export function CampaignAnalytics({ campaignId, view = 'charts' }: Props) {
  const { data: sendsData, isLoading: sendsLoading } = useMarketingSends(campaignId, { pageSize: 100 });
  const { data: timeline, isLoading: timelineLoading } = useDeliveryTimeline(campaignId);
  const exportMutation = useExportSends();
  const retryMutation = useRetryFailedSends();

  if (view === 'recipients') {
    return (
      <div className="space-y-4">
        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => retryMutation.mutate(campaignId)}
            disabled={retryMutation.isPending}
          >
            {retryMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Retry Failed
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => exportMutation.mutate({ campaignId })}
            disabled={exportMutation.isPending}
          >
            {exportMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export CSV
          </Button>
        </div>

        {/* Recipients Table */}
        {sendsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : sendsData && sendsData.sends.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Email/Phone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Delivered</TableHead>
                <TableHead>Opened</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sendsData.sends.map((send) => (
                <TableRow key={send.id}>
                  <TableCell>
                    {send.contacts ? (
                      <span className="font-medium">
                        {send.contacts.first_name} {send.contacts.last_name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {send.recipient_email || send.recipient_phone}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{send.message_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[send.status]}>
                      {send.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {send.sent_at ? format(new Date(send.sent_at), 'MMM d, h:mm a') : '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {send.delivered_at ? format(new Date(send.delivered_at), 'MMM d, h:mm a') : '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {send.opened_at ? format(new Date(send.opened_at), 'MMM d, h:mm a') : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No sends recorded yet
          </div>
        )}
      </div>
    );
  }

  // Charts view
  return (
    <div className="space-y-6">
      {/* Delivery Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Timeline</CardTitle>
          <CardDescription>Sends over time</CardDescription>
        </CardHeader>
        <CardContent>
          {timelineLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : timeline && timeline.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hour" 
                    tickFormatter={(value) => format(new Date(value), 'h:mm a')}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    labelFormatter={(value) => format(new Date(value), 'MMM d, h:mm a')}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="sent" 
                    stroke="#3b82f6" 
                    name="Sent"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="delivered" 
                    stroke="#22c55e" 
                    name="Delivered"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="opened" 
                    stroke="#a855f7" 
                    name="Opened"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="clicked" 
                    stroke="#6366f1" 
                    name="Clicked"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              No data available yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Status Breakdown</CardTitle>
          <CardDescription>Distribution of send statuses</CardDescription>
        </CardHeader>
        <CardContent>
          {sendsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : sendsData && sendsData.sends.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={Object.entries(
                    sendsData.sends.reduce((acc, send) => {
                      acc[send.status] = (acc[send.status] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([status, count]) => ({ status, count }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar 
                    dataKey="count" 
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              No data available yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
