import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Bell, CheckCircle2, Info, XCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { ExportButton } from "@/components/monitoring/ExportButton";
import { FilterPanel } from "@/components/monitoring/FilterPanel";

export default function SystemAlerts() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    severity: "all",
    status: "all",
  });

  // Fetch system alerts with filtering
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['system-alerts', filters],
    queryFn: async () => {
      let query = supabase
        .from('system_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // Apply filters
      if (filters.severity !== "all") {
        query = query.eq('severity', filters.severity);
      }

      if (filters.status === "unresolved") {
        query = query.eq('resolved', false);
      } else if (filters.status === "acknowledged") {
        query = query.eq('acknowledged', true).eq('resolved', false);
      } else if (filters.status === "resolved") {
        query = query.eq('resolved', true);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  // Acknowledge alert mutation
  const acknowledgeAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('system_alerts')
        .update({ 
          acknowledged: true,
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alertId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-alerts'] });
      toast({
        title: "Success",
        description: "Alert acknowledged",
      });
    },
  });

  // Resolve alert mutation
  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('system_alerts')
        .update({ 
          resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-alerts'] });
      toast({
        title: "Success",
        description: "Alert resolved",
      });
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ severity: "all", status: "all" });
  };

  const unresolvedAlerts = alerts?.filter(a => !a.resolved).length || 0;
  const criticalAlerts = alerts?.filter(a => !a.resolved && a.severity === 'critical').length || 0;
  const warningAlerts = alerts?.filter(a => !a.resolved && a.severity === 'warning').length || 0;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              System Alerts
            </h1>
            <p className="text-muted-foreground mt-2">
              Monitor system health and operational alerts
            </p>
          </div>
          {alerts && alerts.length > 0 && (
            <ExportButton 
              data={alerts} 
              filename={`system-alerts-${format(new Date(), 'yyyy-MM-dd')}`}
            />
          )}
        </div>

        <FilterPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          availableFilters={{
            severity: true,
            status: true,
          }}
        />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unresolved Alerts</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unresolvedAlerts}</div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{criticalAlerts}</div>
              <p className="text-xs text-muted-foreground">Immediate action needed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Warnings</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{warningAlerts}</div>
              <p className="text-xs text-muted-foreground">Monitor closely</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alerts?.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`border rounded-lg p-4 space-y-3 ${
                    alert.resolved ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getSeverityIcon(alert.severity)}
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={getSeverityVariant(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          <Badge variant="outline">{alert.alert_type}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                        <h4 className="font-semibold">{alert.title}</h4>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                      </div>
                    </div>
                    {!alert.resolved && (
                      <div className="flex gap-2">
                        {!alert.acknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeAlert.mutate(alert.id)}
                            disabled={acknowledgeAlert.isPending}
                          >
                            Acknowledge
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => resolveAlert.mutate(alert.id)}
                          disabled={resolveAlert.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      </div>
                    )}
                  </div>

                  {alert.acknowledged && !alert.resolved && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Acknowledged {format(new Date(alert.acknowledged_at), 'MMM dd, HH:mm')}</span>
                    </div>
                  )}

                  {alert.resolved && (
                    <div className="flex items-center gap-2 text-sm text-green-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Resolved {format(new Date(alert.resolved_at), 'MMM dd, HH:mm')}</span>
                    </div>
                  )}
                </div>
              ))}
              
              {!alerts?.length && !isLoading && (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No system alerts</p>
                  <p className="text-sm mt-2">All systems operating normally</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
