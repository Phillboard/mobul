import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRewardStats } from "@/hooks/useCallAnalytics";
import { Gift, DollarSign, CheckCircle, XCircle, Clock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface RewardsTabProps {
  campaignId: string;
}

export function RewardsTab({ campaignId }: RewardsTabProps) {
  const { data: rewards, isLoading } = useRewardStats(campaignId);

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Loading reward data...</div>;
  }

  if (!rewards) {
    return <div className="p-4 text-muted-foreground">No reward data available</div>;
  }

  const conditionNumbers = Object.keys(rewards.byCondition).sort((a, b) => Number(a) - Number(b));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {conditionNumbers.map((condNum) => {
          const cond = rewards.byCondition[Number(condNum)];
          return (
            <Card key={condNum}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Condition #{condNum}</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cond.count}</div>
                <p className="text-xs text-muted-foreground">
                  ${cond.totalValue.toFixed(2)} total value
                </p>
                <div className="mt-2 flex gap-2 text-xs">
                  <span className="text-green-600">✓ {cond.delivered}</span>
                  <span className="text-red-600">✗ {cond.failed}</span>
                  <span className="text-amber-600">⏳ {cond.pending}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${rewards.totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Across all conditions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Status</CardTitle>
          <CardDescription>Gift card fulfillment breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{rewards.totalDelivered}</p>
                <p className="text-sm text-muted-foreground">Successfully Sent</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{rewards.totalFailed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <Clock className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold">
                  {Object.values(rewards.byCondition).reduce((sum, c) => sum + c.pending, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rewards Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Rewards Timeline</CardTitle>
          <CardDescription>Gift cards delivered over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={rewards.timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--background))", 
                  border: "1px solid hsl(var(--border))" 
                }}
              />
              <Legend />
              {conditionNumbers.map((condNum, idx) => (
                <Bar 
                  key={condNum}
                  dataKey={condNum} 
                  fill={`hsl(var(--chart-${(idx % 5) + 1}))`}
                  name={`Condition #${condNum}`}
                  stackId="a"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Deliveries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Deliveries</CardTitle>
          <CardDescription>Latest gift card fulfillments</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Delivery Method</TableHead>
                <TableHead>Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rewards.recentDeliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No deliveries yet
                  </TableCell>
                </TableRow>
              ) : (
                rewards.recentDeliveries.map((delivery: any) => (
                  <TableRow key={delivery.id}>
                    <TableCell>
                      {delivery.recipient?.first_name} {delivery.recipient?.last_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Condition #{delivery.condition_number}</Badge>
                    </TableCell>
                    <TableCell>
                      ${delivery.gift_card?.pool?.card_value || 0}
                    </TableCell>
                    <TableCell>
                      {delivery.delivery_status === 'sent' ? (
                        <Badge className="bg-green-600">Sent</Badge>
                      ) : delivery.delivery_status === 'failed' ? (
                        <Badge variant="destructive">Failed</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="capitalize">
                      {delivery.delivery_method}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(delivery.delivered_at || delivery.created_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
