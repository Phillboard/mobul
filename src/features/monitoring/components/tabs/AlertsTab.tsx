/**
 * Alerts Tab Component
 * 
 * Displays and manages alerts for the current user's scope.
 */

import { useState } from 'react';
import { 
  AlertTriangle, 
  Bell, 
  CheckCircle2, 
  Clock, 
  Filter,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/shared/components/ui/select';
import { format } from 'date-fns';
import { 
  useActiveAlerts, 
  useAcknowledgeAlert, 
  useResolveAlert,
  useAlertCount,
} from '../../hooks';
import type { AlertInstance, AlertSeverity } from '../../types/monitoring.types';

// ============================================================================
// Alert Card Component
// ============================================================================

interface AlertCardProps {
  alert: AlertInstance;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  isAcknowledging: boolean;
  isResolving: boolean;
}

function AlertCard({ 
  alert, 
  onAcknowledge, 
  onResolve,
  isAcknowledging,
  isResolving,
}: AlertCardProps) {
  const severityConfig = {
    critical: { 
      icon: XCircle, 
      color: 'text-destructive',
      bg: 'bg-destructive/10',
      badge: 'destructive' as const,
    },
    warning: { 
      icon: AlertTriangle, 
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      badge: 'secondary' as const,
    },
    info: { 
      icon: Bell, 
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      badge: 'outline' as const,
    },
  };

  const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.info;
  const Icon = config.icon;

  return (
    <Card className={`${config.bg} border-l-4 ${
      alert.severity === 'critical' ? 'border-l-destructive' :
      alert.severity === 'warning' ? 'border-l-yellow-500' :
      'border-l-blue-500'
    }`}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-4">
          <Icon className={`h-6 w-6 ${config.color}`} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold">{alert.title}</h4>
              <Badge variant={config.badge}>{alert.severity}</Badge>
              {alert.acknowledged_at && (
                <Badge variant="outline" className="text-xs">Acknowledged</Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mb-2">
              {alert.message}
            </p>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(alert.triggered_at), 'MMM d, yyyy HH:mm')}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {!alert.acknowledged_at && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAcknowledge(alert.id)}
                disabled={isAcknowledging}
              >
                Acknowledge
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => onResolve(alert.id)}
              disabled={isResolving}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Resolve
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AlertsTab() {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: alerts, isLoading } = useActiveAlerts({ limit: 100 });
  const alertCount = useAlertCount();
  const acknowledgeAlert = useAcknowledgeAlert();
  const resolveAlert = useResolveAlert();

  // Filter alerts
  const filteredAlerts = alerts?.filter(alert => {
    if (severityFilter !== 'all' && alert.severity !== severityFilter) {
      return false;
    }
    if (searchQuery && !alert.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !alert.message.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alertCount.total}</div>
            <p className="text-xs text-muted-foreground">
              {alertCount.unacknowledged} unacknowledged
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {alertCount.critical}
            </div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Avg time to acknowledge
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Search alerts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Bell className="h-8 w-8 animate-pulse text-muted-foreground" />
          </div>
        ) : filteredAlerts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium">No Active Alerts</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || severityFilter !== 'all' 
                  ? 'No alerts match your filters'
                  : 'All systems are operating normally'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAlerts.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={(id) => acknowledgeAlert.mutate(id)}
              onResolve={(id) => resolveAlert.mutate({ alertId: id })}
              isAcknowledging={acknowledgeAlert.isPending}
              isResolving={resolveAlert.isPending}
            />
          ))
        )}
      </div>
    </div>
  );
}
