import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useZapierConnections } from '@/features/settings/hooks';
import { useTenant } from '@app/providers/TenantProvider';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  Zap
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export function ZapierAnalytics() {
  const { currentClient } = useTenant();
  const { connections, isLoading } = useZapierConnections(currentClient?.id || null);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Loading analytics...</p>
        </CardContent>
      </Card>
    );
  }

  if (!connections || connections.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No Zapier connections to analyze</p>
        </CardContent>
      </Card>
    );
  }

  const activeConnections = connections.filter(c => c.is_active).length;
  const totalSuccess = connections.reduce((sum, c) => sum + c.success_count, 0);
  const totalFailures = connections.reduce((sum, c) => sum + c.failure_count, 0);
  const totalEvents = totalSuccess + totalFailures;
  const successRate = totalEvents > 0 ? ((totalSuccess / totalEvents) * 100).toFixed(1) : '0';

  // Get event type distribution
  const eventCounts: Record<string, number> = {};
  connections.forEach(conn => {
    conn.trigger_events.forEach(event => {
      eventCounts[event] = (eventCounts[event] || 0) + 1;
    });
  });

  const topEvents = Object.entries(eventCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Get most active connections
  const mostActive = [...connections]
    .sort((a, b) => b.success_count - a.success_count)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{activeConnections}</span>
              <span className="text-sm text-muted-foreground">/ {connections.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{totalEvents.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{successRate}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-2xl font-bold">{totalFailures}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Events */}
      <Card>
        <CardHeader>
          <CardTitle>Most Used Events</CardTitle>
          <CardDescription>Events with the most connections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topEvents.map(([event, count]) => (
              <div key={event} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{event}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{count}</span>
                  <span className="text-xs text-muted-foreground">
                    connection{count !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Most Active Connections */}
      <Card>
        <CardHeader>
          <CardTitle>Most Active Connections</CardTitle>
          <CardDescription>Top connections by event volume</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mostActive.map((connection) => (
              <div key={connection.id} className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{connection.connection_name}</p>
                    {connection.is_active && (
                      <Badge variant="default" className="text-xs">Active</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last triggered:{' '}
                    {connection.last_triggered_at
                      ? formatDistanceToNow(new Date(connection.last_triggered_at), {
                          addSuffix: true,
                        })
                      : 'Never'}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-green-500">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">{connection.success_count}</span>
                  </div>
                  {connection.failure_count > 0 && (
                    <div className="flex items-center gap-1 text-destructive">
                      <XCircle className="h-4 w-4" />
                      <span className="font-medium">{connection.failure_count}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Connection Health */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Health</CardTitle>
          <CardDescription>Status overview of all connections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {connections.map((connection) => {
              const totalAttempts = connection.success_count + connection.failure_count;
              const health = totalAttempts > 0 
                ? (connection.success_count / totalAttempts) * 100 
                : 100;
              const healthColor = 
                health >= 95 ? 'bg-green-500' :
                health >= 80 ? 'bg-yellow-500' :
                'bg-destructive';

              return (
                <div key={connection.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{connection.connection_name}</span>
                    <span className="text-xs text-muted-foreground">{health.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${healthColor} transition-all`}
                      style={{ width: `${health}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
