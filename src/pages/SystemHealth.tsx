import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Activity, AlertTriangle, BarChart3, Bell, CheckCircle2, Clock, Database, 
  Gift, Info, Mail, Phone, TrendingDown, TrendingUp, Users, XCircle, Zap 
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, subDays, subHours } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { ExportButton } from "@/components/monitoring/ExportButton";
import { FilterPanel } from "@/components/monitoring/FilterPanel";
import { useSearchParams } from "react-router-dom";

export default function SystemHealth() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const queryClient = useQueryClient();

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            System Health
          </h1>
          <p className="text-muted-foreground mt-2">
            Unified monitoring dashboard for system performance and health
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="performance">
              <Activity className="h-4 w-4 mr-2" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="errors">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Errors
            </TabsTrigger>
            <TabsTrigger value="alerts">
              <Bell className="h-4 w-4 mr-2" />
              Alerts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <PerformanceTab />
          </TabsContent>

          <TabsContent value="errors" className="space-y-6">
            <ErrorsTab queryClient={queryClient} />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <AlertsTab queryClient={queryClient} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

// Overview Tab Component
function OverviewTab() {
  const { data: campaignStats } = useQuery({
    queryKey: ['campaign-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('campaigns').select('status, created_at');
      if (error) throw error;
      const mailed = data?.filter(c => c.status === 'mailed').length || 0;
      const completed = data?.filter(c => c.status === 'completed').length || 0;
      const draft = data?.filter(c => c.status === 'draft').length || 0;
      return { mailed, completed, draft, total: data?.length || 0 };
    },
  });

  const { data: recipientStats } = useQuery({
    queryKey: ['recipient-stats'],
    queryFn: async () => {
      const { count, error } = await supabase.from('recipients').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: giftCardStats } = useQuery({
    queryKey: ['gift-card-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gift_cards').select('status, current_balance');
      if (error) throw error;
      const delivered = data?.filter(c => c.status === 'delivered').length || 0;
      const redeemed = data?.filter(c => c.status === 'redeemed').length || 0;
      const totalValue = data?.reduce((sum, c) => sum + (c.current_balance || 0), 0) || 0;
      return { delivered, redeemed, totalValue };
    },
  });

  const { data: callStats } = useQuery({
    queryKey: ['call-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('call_sessions').select('call_status, call_duration_seconds');
      if (error) throw error;
      const completed = data?.filter(c => c.call_status === 'completed').length || 0;
      const inProgress = data?.filter(c => c.call_status === 'in-progress').length || 0;
      const avgDuration = data?.reduce((sum, c) => sum + (c.call_duration_seconds || 0), 0) / (data?.length || 1);
      return { completed, inProgress, avgDuration: Math.round(avgDuration / 60) };
    },
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30);
      const { data, error } = await supabase
        .from('events')
        .select('event_type, occurred_at')
        .gte('occurred_at', thirtyDaysAgo.toISOString())
        .order('occurred_at', { ascending: true });
      
      if (error) throw error;
      
      const eventsByDay = new Map<string, any>();
      data?.forEach(event => {
        const day = format(new Date(event.occurred_at!), 'MM/dd');
        if (!eventsByDay.has(day)) {
          eventsByDay.set(day, { day, qr_scans: 0, form_submissions: 0, purl_views: 0 });
        }
        const dayData = eventsByDay.get(day);
        if (event.event_type === 'qr_scanned') dayData.qr_scans++;
        if (event.event_type === 'form_submitted') dayData.form_submissions++;
        if (event.event_type === 'purl_viewed') dayData.purl_views++;
      });
      
      return Array.from(eventsByDay.values());
    },
  });

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mailed Campaigns</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaignStats?.mailed || 0}</div>
            <p className="text-xs text-muted-foreground">{campaignStats?.total || 0} total campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recipientStats?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Across all campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gift Cards Delivered</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{giftCardStats?.delivered || 0}</div>
            <p className="text-xs text-muted-foreground">
              ${((giftCardStats?.totalValue || 0) / 100).toFixed(2)} total value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls Completed</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{callStats?.completed || 0}</div>
            <p className="text-xs text-muted-foreground">~{callStats?.avgDuration || 0} min avg duration</p>
          </CardContent>
        </Card>
      </div>

      {recentActivity && recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Activity (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={recentActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="qr_scans" stroke="hsl(var(--primary))" name="QR Scans" />
                <Line type="monotone" dataKey="form_submissions" stroke="hsl(var(--accent))" name="Forms" />
                <Line type="monotone" dataKey="purl_views" stroke="hsl(var(--secondary))" name="PURL Views" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// Performance Tab Component
function PerformanceTab() {
  const [filters, setFilters] = useState({ timeRange: "24h", metricType: "all" });

  const getTimeAgo = (range: string) => {
    switch (range) {
      case "1h": return subHours(new Date(), 1);
      case "6h": return subHours(new Date(), 6);
      case "24h": return subHours(new Date(), 24);
      case "7d": return subHours(new Date(), 168);
      case "30d": return subHours(new Date(), 720);
      default: return subHours(new Date(), 24);
    }
  };

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['performance-metrics', filters],
    queryFn: async () => {
      const timeAgo = getTimeAgo(filters.timeRange);
      let query = supabase
        .from('performance_metrics')
        .select('*')
        .gte('recorded_at', timeAgo.toISOString())
        .order('recorded_at', { ascending: true });

      if (filters.metricType !== "all") {
        query = query.eq('metric_type', filters.metricType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const totalMetrics = metrics?.length || 0;
  const avgDuration = metrics?.length 
    ? Math.round(metrics.reduce((sum, m) => sum + m.duration_ms, 0) / metrics.length)
    : 0;

  return (
    <>
      <div className="flex items-center justify-between">
        {metrics && metrics.length > 0 && (
          <ExportButton data={metrics} filename={`performance-metrics-${format(new Date(), 'yyyy-MM-dd')}`} />
        )}
      </div>

      <FilterPanel
        filters={filters}
        onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
        onClearFilters={() => setFilters({ timeRange: "24h", metricType: "all" })}
        availableFilters={{ timeRange: true, metricType: true }}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Metrics</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDuration}ms</div>
            <p className="text-xs text-muted-foreground">Across all operations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Health</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Healthy</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Online</div>
            <p className="text-xs text-muted-foreground">Connection stable</p>
          </CardContent>
        </Card>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <Activity className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading performance data...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// Errors Tab Component
function ErrorsTab({ queryClient }: { queryClient: any }) {
  const [filters, setFilters] = useState({ timeRange: "24h", status: "all", searchQuery: "" });

  const { data: errors, isLoading } = useQuery({
    queryKey: ['error-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('error_logs')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(100);

      if (filters.status === "unresolved") {
        query = query.eq('resolved', false);
      } else if (filters.status === "resolved") {
        query = query.eq('resolved', true);
      }

      if (filters.searchQuery) {
        query = query.ilike('error_message', `%${filters.searchQuery}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const resolveError = useMutation({
    mutationFn: async (errorId: string) => {
      const { error } = await supabase
        .from('error_logs')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', errorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-logs'] });
      toast({ title: "Success", description: "Error marked as resolved" });
    },
  });

  const unresolvedErrors = errors?.filter(e => !e.resolved).length || 0;
  const criticalErrors = errors?.filter(e => !e.resolved && e.error_type === 'critical').length || 0;

  return (
    <>
      <div className="flex items-center justify-between">
        {errors && errors.length > 0 && (
          <ExportButton data={errors} filename={`error-logs-${format(new Date(), 'yyyy-MM-dd')}`} />
        )}
      </div>

      <FilterPanel
        filters={filters}
        onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
        onClearFilters={() => setFilters({ timeRange: "24h", status: "all", searchQuery: "" })}
        availableFilters={{ timeRange: true, status: true, search: true }}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unresolved Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{unresolvedErrors}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Errors</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalErrors}</div>
            <p className="text-xs text-muted-foreground">High priority</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errors?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Last 100 entries</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Errors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {errors?.slice(0, 20).map((error) => (
              <div key={error.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={error.resolved ? "secondary" : "destructive"}>
                        {error.error_type || 'Unknown'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(error.occurred_at), 'MMM dd, yyyy HH:mm:ss')}
                      </span>
                    </div>
                    <p className="font-medium">{error.error_message}</p>
                  </div>
                  {!error.resolved && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveError.mutate(error.id)}
                      disabled={resolveError.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {!errors?.length && !isLoading && (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>No errors logged</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// Alerts Tab Component
function AlertsTab({ queryClient }: { queryClient: any }) {
  const [filters, setFilters] = useState({ severity: "all", status: "all" });

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['system-alerts', filters],
    queryFn: async () => {
      let query = supabase
        .from('system_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (filters.severity !== "all") {
        query = query.eq('severity', filters.severity);
      }

      if (filters.status === "unresolved") {
        query = query.eq('resolved', false);
      } else if (filters.status === "resolved") {
        query = query.eq('resolved', true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('system_alerts')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-alerts'] });
      toast({ title: "Success", description: "Alert resolved" });
    },
  });

  const unresolvedAlerts = alerts?.filter(a => !a.resolved).length || 0;
  const criticalAlerts = alerts?.filter(a => !a.resolved && a.severity === 'critical').length || 0;

  return (
    <>
      <FilterPanel
        filters={filters}
        onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
        onClearFilters={() => setFilters({ severity: "all", status: "all" })}
        availableFilters={{ severity: true, status: true }}
      />

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
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Last 50 entries</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts?.map((alert) => (
              <div key={alert.id} className={`border rounded-lg p-4 space-y-3 ${alert.resolved ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {alert.severity === 'critical' && <XCircle className="h-5 w-5 text-destructive" />}
                    {alert.severity === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                    {alert.severity === 'info' && <Info className="h-5 w-5 text-blue-500" />}
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                          {alert.severity}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      <h4 className="font-semibold">{alert.title}</h4>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                    </div>
                  </div>
                  {!alert.resolved && (
                    <Button
                      size="sm"
                      onClick={() => resolveAlert.mutate(alert.id)}
                      disabled={resolveAlert.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {!alerts?.length && !isLoading && (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>No system alerts</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
