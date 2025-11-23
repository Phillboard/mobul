import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

export default function ErrorTracking() {
  const queryClient = useQueryClient();

  // Fetch error logs
  const { data: errors, isLoading } = useQuery({
    queryKey: ['error-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Resolve error mutation
  const resolveError = useMutation({
    mutationFn: async (errorId: string) => {
      const { error } = await supabase
        .from('error_logs')
        .update({ 
          resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', errorId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-logs'] });
      toast({
        title: "Success",
        description: "Error marked as resolved",
      });
    },
  });

  // Calculate error statistics
  const unresolvedErrors = errors?.filter(e => !e.resolved).length || 0;
  const resolvedErrors = errors?.filter(e => e.resolved).length || 0;
  const criticalErrors = errors?.filter(e => !e.resolved && e.error_type === 'critical').length || 0;

  // Group errors by type
  const errorsByType = errors?.reduce((acc, error) => {
    const type = error.error_type || 'unknown';
    if (!acc[type]) {
      acc[type] = { type, count: 0, unresolved: 0 };
    }
    acc[type].count += 1;
    if (!error.resolved) acc[type].unresolved += 1;
    return acc;
  }, {} as Record<string, any>);

  const errorTypeStats = errorsByType 
    ? Object.values(errorsByType).sort((a: any, b: any) => b.unresolved - a.unresolved)
    : [];

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Error Tracking
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage application errors
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <CardTitle className="text-sm font-medium">Resolved Errors</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{resolvedErrors}</div>
              <p className="text-xs text-muted-foreground">Successfully handled</p>
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

        {/* Error Types Summary */}
        {errorTypeStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Errors by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {errorTypeStats.map((stat: any) => (
                  <div key={stat.type} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="font-medium capitalize">{stat.type.replace('_', ' ')}</span>
                        <span className="text-sm text-muted-foreground">{stat.count} total errors</span>
                      </div>
                    </div>
                    <Badge variant={stat.unresolved > 0 ? "destructive" : "secondary"}>
                      {stat.unresolved} unresolved
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Errors List */}
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
                      {error.component_name && (
                        <p className="text-sm text-muted-foreground">Component: {error.component_name}</p>
                      )}
                      {error.url && (
                        <p className="text-sm text-muted-foreground">URL: {error.url}</p>
                      )}
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
                  {error.resolved && (
                    <div className="flex items-center gap-2 text-sm text-green-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Resolved {format(new Date(error.resolved_at), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                  )}
                  {error.stack_trace && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        View Stack Trace
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                        {error.stack_trace}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
              {!errors?.length && !isLoading && (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No errors logged</p>
                </div>
              )}
              {isLoading && (
                <div className="text-center py-12">
                  <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading error logs...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
