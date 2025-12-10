import { useState } from "react";
import { Layout } from "@/shared/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Activity, AlertTriangle, BarChart3, Bell, CheckCircle2, Clock, Database, 
  Gift, Info, Mail, Phone, TrendingDown, TrendingUp, Users, XCircle, Zap,
  RefreshCw, Copy, ChevronDown, ChevronRight, Search, CreditCard
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { format, subDays, subHours } from "date-fns";
import { toast } from '@/shared/hooks';
import { ExportButton } from "@/features/admin/components/monitoring/ExportButton";
import { FilterPanel } from "@/features/admin/components/monitoring/FilterPanel";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/shared/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/components/ui/collapsible";
import { ScrollArea } from "@/shared/components/ui/scroll-area";

// Error code descriptions for display
const ERROR_CODE_DESCRIPTIONS: Record<string, string> = {
  'GC-001': 'Campaign condition missing gift card config',
  'GC-002': 'Gift card brand not found',
  'GC-003': 'No inventory available',
  'GC-004': 'Tillo API not configured',
  'GC-005': 'Tillo API call failed',
  'GC-006': 'Insufficient credits',
  'GC-007': 'Billing transaction failed',
  'GC-008': 'Campaign billing not configured',
  'GC-009': 'Recipient verification required',
  'GC-010': 'Already provisioned',
  'GC-011': 'Invalid redemption code',
  'GC-012': 'Missing parameters',
  'GC-013': 'Database function error',
  'GC-014': 'Delivery failed',
  'GC-015': 'Unknown error',
};

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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="gift-cards">
              <CreditCard className="h-4 w-4 mr-2" />
              Gift Cards
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

          <TabsContent value="gift-cards" className="space-y-6">
            <GiftCardProvisioningTab queryClient={queryClient} />
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

// Gift Card Provisioning Tab Component
function GiftCardProvisioningTab({ queryClient }: { queryClient: any }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTraces, setExpandedTraces] = useState<Set<string>>(new Set());

  // Fetch provisioning health metrics
  const { data: healthMetrics, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['provisioning-health'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_provisioning_health', { p_hours: 24 });
      if (error) {
        console.error('Health metrics error:', error);
        return null;
      }
      return data?.[0] || null;
    },
    refetchInterval: 30000,
  });

  // Fetch error statistics
  const { data: errorStats, isLoading: errorStatsLoading } = useQuery({
    queryKey: ['provisioning-error-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_provisioning_error_stats', { p_hours: 24 });
      if (error) {
        console.error('Error stats error:', error);
        return [];
      }
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch recent failures
  const { data: recentFailures, isLoading: failuresLoading, refetch: refetchFailures } = useQuery({
    queryKey: ['recent-provisioning-failures', searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_recent_provisioning_failures', {
        p_limit: 50,
        p_campaign_id: null,
        p_hours: 48,
      });
      if (error) {
        console.error('Recent failures error:', error);
        return [];
      }
      // Filter by search query if provided
      if (searchQuery) {
        return data?.filter((f: any) => 
          f.request_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.error_message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.error_code?.toLowerCase().includes(searchQuery.toLowerCase())
        ) || [];
      }
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch trace details for expanded items
  const fetchTraceDetails = async (requestId: string) => {
    const { data, error } = await supabase.rpc('get_provisioning_trace', { p_request_id: requestId });
    if (error) {
      console.error('Trace fetch error:', error);
      return [];
    }
    return data || [];
  };

  const toggleTraceExpand = (requestId: string) => {
    const newExpanded = new Set(expandedTraces);
    if (newExpanded.has(requestId)) {
      newExpanded.delete(requestId);
    } else {
      newExpanded.add(requestId);
    }
    setExpandedTraces(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Request ID copied to clipboard" });
  };

  // Calculate success rate
  const successRate = healthMetrics?.success_rate || 0;
  const totalAttempts = healthMetrics?.total_attempts || 0;
  const failedAttempts = healthMetrics?.failed_attempts || 0;

  // Prepare chart data for error distribution
  const errorChartData = errorStats?.map((stat: any) => ({
    name: stat.error_code,
    value: parseInt(stat.occurrence_count),
    description: ERROR_CODE_DESCRIPTIONS[stat.error_code] || 'Unknown error',
  })) || [];

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <>
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Gift Card Provisioning Monitor</h2>
          <p className="text-sm text-muted-foreground">Real-time monitoring of gift card provisioning attempts</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refetchHealth(); refetchFailures(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Health Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate (24h)</CardTitle>
            {successRate >= 90 ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : successRate >= 70 ? (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              successRate >= 90 ? 'text-green-500' : 
              successRate >= 70 ? 'text-yellow-500' : 'text-destructive'
            }`}>
              {successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {healthMetrics?.successful_attempts || 0} of {totalAttempts} succeeded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed (24h)</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{failedAttempts}</div>
            <p className="text-xs text-muted-foreground">
              Top error: {healthMetrics?.top_error_code || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthMetrics?.avg_duration_ms ? `${Math.round(healthMetrics.avg_duration_ms)}ms` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">End-to-end processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAttempts}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Error Distribution Chart */}
      {errorChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Error Distribution (24h)</CardTitle>
            <CardDescription>Breakdown of failure reasons by error code</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={errorChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {errorChartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                <h4 className="font-medium">Error Code Legend</h4>
                <ScrollArea className="h-[200px]">
                  {errorChartData.map((stat: any, index: number) => (
                    <div key={stat.name} className="flex items-center gap-2 py-1.5 text-sm">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <Badge variant="outline" className="font-mono">{stat.name}</Badge>
                      <span className="text-muted-foreground flex-1 truncate">{stat.description}</span>
                      <span className="font-semibold">{stat.value}</span>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Failures with Trace Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Failures</CardTitle>
              <CardDescription>Click to expand and view full trace</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by request ID or error..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {failuresLoading ? (
            <div className="flex items-center justify-center py-8">
              <Activity className="h-6 w-6 animate-spin mr-2" />
              <span>Loading failures...</span>
            </div>
          ) : recentFailures?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>No failures in the last 48 hours</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentFailures?.map((failure: any) => (
                <FailureTraceItem
                  key={failure.request_id}
                  failure={failure}
                  isExpanded={expandedTraces.has(failure.request_id)}
                  onToggle={() => toggleTraceExpand(failure.request_id)}
                  onCopy={() => copyToClipboard(failure.request_id)}
                  fetchTraceDetails={fetchTraceDetails}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              window.open('/admin/gift-cards', '_blank');
            }}>
              <Gift className="h-4 w-4 mr-2" />
              Manage Inventory
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              window.open('/settings?tab=integrations', '_blank');
            }}>
              <Zap className="h-4 w-4 mr-2" />
              Configure Tillo API
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              // Run diagnostics
              toast({ title: "Running diagnostics...", description: "This may take a moment" });
            }}>
              <Activity className="h-4 w-4 mr-2" />
              Run Diagnostics
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// Failure Trace Item Component
function FailureTraceItem({ 
  failure, 
  isExpanded, 
  onToggle, 
  onCopy,
  fetchTraceDetails 
}: { 
  failure: any; 
  isExpanded: boolean; 
  onToggle: () => void;
  onCopy: () => void;
  fetchTraceDetails: (requestId: string) => Promise<any[]>;
}) {
  const [traceDetails, setTraceDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!isExpanded && traceDetails.length === 0) {
      setLoading(true);
      const details = await fetchTraceDetails(failure.request_id);
      setTraceDetails(details);
      setLoading(false);
    }
    onToggle();
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={handleToggle}>
      <div className="border rounded-lg">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <Badge variant="destructive" className="font-mono">
                {failure.error_code || 'ERROR'}
              </Badge>
              <span className="text-sm font-medium">
                Step {failure.failure_step}: {failure.failure_step_name}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">
                {format(new Date(failure.failed_at), 'MMM dd HH:mm:ss')}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => { e.stopPropagation(); onCopy(); }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t p-4 bg-muted/30 space-y-4">
            {/* Error Details */}
            <div>
              <h4 className="text-sm font-medium mb-2">Error Message</h4>
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded font-mono">
                {failure.error_message || 'No message available'}
              </p>
            </div>

            {/* Context */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Request ID:</span>
                <code className="ml-2 font-mono text-xs bg-muted px-1 rounded">{failure.request_id}</code>
              </div>
              <div>
                <span className="text-muted-foreground">Campaign:</span>
                <code className="ml-2 font-mono text-xs">{failure.campaign_id || 'N/A'}</code>
              </div>
              <div>
                <span className="text-muted-foreground">Recipient:</span>
                <code className="ml-2 font-mono text-xs">{failure.recipient_id || 'N/A'}</code>
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span>
                <span className="ml-2">${failure.denomination || 'N/A'}</span>
              </div>
            </div>

            {/* Full Trace */}
            <div>
              <h4 className="text-sm font-medium mb-2">Full Trace</h4>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4 animate-spin" />
                  Loading trace...
                </div>
              ) : traceDetails.length > 0 ? (
                <div className="space-y-1">
                  {traceDetails.map((step, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center gap-2 text-xs p-2 rounded ${
                        step.status === 'completed' ? 'bg-green-500/10' :
                        step.status === 'failed' ? 'bg-destructive/10' :
                        step.status === 'skipped' ? 'bg-yellow-500/10' :
                        'bg-blue-500/10'
                      }`}
                    >
                      <span className="font-mono w-6">{step.step_number}.</span>
                      <span className="flex-1">{step.step_name}</span>
                      <Badge variant={
                        step.status === 'completed' ? 'default' :
                        step.status === 'failed' ? 'destructive' :
                        'secondary'
                      } className="text-xs">
                        {step.status}
                      </Badge>
                      {step.duration_ms && (
                        <span className="text-muted-foreground">{step.duration_ms}ms</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No trace data available</p>
              )}
            </div>

            {/* Recommendation */}
            {failure.error_code && ERROR_CODE_DESCRIPTIONS[failure.error_code] && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3">
                <h4 className="text-sm font-medium text-blue-600 mb-1">Recommendation</h4>
                <p className="text-sm">
                  {getRecommendation(failure.error_code)}
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Get recommendation based on error code
function getRecommendation(errorCode: string): string {
  const recommendations: Record<string, string> = {
    'GC-001': 'Edit the campaign and configure a gift card brand and value for all conditions.',
    'GC-002': 'Verify the brand ID is correct or choose a different brand in campaign settings.',
    'GC-003': 'Upload gift card inventory OR configure Tillo API credentials in Settings → Integrations.',
    'GC-004': 'Configure TILLO_API_KEY and TILLO_SECRET_KEY in Supabase secrets.',
    'GC-005': 'Check Tillo API credentials and ensure the brand code is valid. Try again in a few minutes.',
    'GC-006': 'Add credits to the client/agency account before provisioning.',
    'GC-007': 'Contact support - billing transaction failed. Card may need manual reconciliation.',
    'GC-008': 'Ensure the campaign has a valid client assigned with billing configuration.',
    'GC-009': 'Complete SMS opt-in or email verification before provisioning.',
    'GC-010': 'This recipient already has a gift card for this campaign condition.',
    'GC-011': 'Verify the redemption code and ensure customer is in an active campaign.',
    'GC-012': 'Check that all required fields are provided in the request.',
    'GC-013': 'Run database migrations to create required functions.',
    'GC-014': 'Delivery notification failed but card was provisioned. Check SMS/Email settings.',
    'GC-015': 'Check the full trace for more details. Contact support if issue persists.',
  };
  return recommendations[errorCode] || 'Review the error details and contact support if needed.';
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
        query = query.or(`message.ilike.%${filters.searchQuery}%,category.ilike.%${filters.searchQuery}%`);
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
  const giftCardErrors = errors?.filter(e => !e.resolved && e.category === 'gift_card').length || 0;

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
            <CardTitle className="text-sm font-medium">Gift Card Errors</CardTitle>
            <CreditCard className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{giftCardErrors}</div>
            <p className="text-xs text-muted-foreground">Provisioning issues</p>
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={error.resolved ? "secondary" : "destructive"}>
                        {error.category || 'unknown'}
                      </Badge>
                      <Badge variant="outline">
                        {error.severity || 'medium'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(error.occurred_at), 'MMM dd, yyyy HH:mm:ss')}
                      </span>
                    </div>
                    <p className="font-medium">{error.message}</p>
                    {error.error_details?.error_code && (
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {error.error_details.error_code}
                      </code>
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
        query = query.eq('dismissed', false);
      } else if (filters.status === "resolved") {
        query = query.eq('dismissed', true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const dismissAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('system_alerts')
        .update({ dismissed: true, dismissed_at: new Date().toISOString() })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-alerts'] });
      toast({ title: "Success", description: "Alert dismissed" });
    },
  });

  const undismissedAlerts = alerts?.filter(a => !a.dismissed).length || 0;
  const criticalAlerts = alerts?.filter(a => !a.dismissed && a.severity === 'critical').length || 0;

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
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{undismissedAlerts}</div>
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
              <div key={alert.id} className={`border rounded-lg p-4 space-y-3 ${alert.dismissed ? 'opacity-60' : ''}`}>
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
                  {!alert.dismissed && (
                    <Button
                      size="sm"
                      onClick={() => dismissAlert.mutate(alert.id)}
                      disabled={dismissAlert.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Dismiss
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
