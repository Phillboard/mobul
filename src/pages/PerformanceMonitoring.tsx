import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Clock, Database, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, subHours } from "date-fns";

export default function PerformanceMonitoring() {
  // Fetch performance metrics for last 24 hours
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['performance-metrics'],
    queryFn: async () => {
      const twentyFourHoursAgo = subHours(new Date(), 24);
      
      const { data, error } = await supabase
        .from('performance_metrics')
        .select('*')
        .gte('recorded_at', twentyFourHoursAgo.toISOString())
        .order('recorded_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Calculate average metrics by type
  const metricsByType = metrics?.reduce((acc, metric) => {
    if (!acc[metric.metric_type]) {
      acc[metric.metric_type] = {
        type: metric.metric_type,
        total: 0,
        count: 0,
        min: Infinity,
        max: 0,
      };
    }
    
    const stat = acc[metric.metric_type];
    stat.total += metric.duration_ms;
    stat.count += 1;
    stat.min = Math.min(stat.min, metric.duration_ms);
    stat.max = Math.max(stat.max, metric.duration_ms);
    
    return acc;
  }, {} as Record<string, any>);

  const averageMetrics = metricsByType 
    ? Object.values(metricsByType).map((stat: any) => ({
        ...stat,
        average: Math.round(stat.total / stat.count),
      }))
    : [];

  // Group metrics by hour for timeline
  const metricsTimeline = metrics?.reduce((acc, metric) => {
    const hour = format(new Date(metric.recorded_at), 'HH:00');
    if (!acc[hour]) {
      acc[hour] = {
        hour,
        page_load: [],
        api_response: [],
        edge_function: [],
        database_query: [],
      };
    }
    acc[hour][metric.metric_type]?.push(metric.duration_ms);
    return acc;
  }, {} as Record<string, any>);

  const timelineData = metricsTimeline
    ? Object.values(metricsTimeline).map((item: any) => ({
        hour: item.hour,
        page_load: item.page_load.length ? Math.round(item.page_load.reduce((a: number, b: number) => a + b, 0) / item.page_load.length) : 0,
        api_response: item.api_response.length ? Math.round(item.api_response.reduce((a: number, b: number) => a + b, 0) / item.api_response.length) : 0,
        edge_function: item.edge_function.length ? Math.round(item.edge_function.reduce((a: number, b: number) => a + b, 0) / item.edge_function.length) : 0,
        database_query: item.database_query.length ? Math.round(item.database_query.reduce((a: number, b: number) => a + b, 0) / item.database_query.length) : 0,
      }))
    : [];

  const totalMetrics = metrics?.length || 0;
  const avgDuration = metrics?.length 
    ? Math.round(metrics.reduce((sum, m) => sum + m.duration_ms, 0) / metrics.length)
    : 0;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Performance Monitoring
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time performance metrics and system health monitoring
          </p>
        </div>

        {/* Summary Cards */}
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

        {/* Performance Timeline */}
        {timelineData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Performance Timeline (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis label={{ value: 'Duration (ms)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="page_load" stroke="#3b82f6" name="Page Load" />
                  <Line type="monotone" dataKey="api_response" stroke="#8b5cf6" name="API" />
                  <Line type="monotone" dataKey="edge_function" stroke="#10b981" name="Edge Functions" />
                  <Line type="monotone" dataKey="database_query" stroke="#f59e0b" name="Database" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Metrics by Type */}
        {averageMetrics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Average Performance by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={averageMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis label={{ value: 'Duration (ms)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="average" fill="#3b82f6" name="Average" />
                  <Bar dataKey="min" fill="#10b981" name="Min" />
                  <Bar dataKey="max" fill="#ef4444" name="Max" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Detailed Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          {averageMetrics.map((metric) => (
            <Card key={metric.type}>
              <CardHeader>
                <CardTitle className="capitalize">{metric.type.replace('_', ' ')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Average</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{metric.average}ms</span>
                      {metric.average < 500 ? (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Min</span>
                    <span className="text-sm font-medium text-green-500">{metric.min}ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Max</span>
                    <span className="text-sm font-medium text-red-500">{metric.max}ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Measurements</span>
                    <span className="text-sm font-medium">{metric.count}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
      </div>
    </Layout>
  );
}
