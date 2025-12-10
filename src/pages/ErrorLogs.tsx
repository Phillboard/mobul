/**
 * Error Logs Admin Dashboard
 * 
 * Provides a searchable, filterable view of all system errors.
 * Features:
 * - Filter by severity, type, source, date range
 * - Search by error message
 * - View full stack traces
 * - Export to CSV
 * - Auto-refresh option
 * - Mark errors as resolved
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, subHours } from 'date-fns';
import { 
  Search, 
  RefreshCw, 
  Download, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  XCircle,
  CheckCircle,
  Filter,
  Eye,
  Clock,
  User,
  Code,
  ExternalLink,
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/shared/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks';
import { Skeleton } from '@/shared/components/ui/skeleton';

interface ErrorLog {
  id: string;
  // New columns
  timestamp: string | null;
  error_type: string | null;
  source: string | null;
  error_message: string | null;
  error_stack: string | null;
  metadata: Record<string, any> | null;
  request_id: string | null;
  url: string | null;
  user_agent: string | null;
  recipient_id: string | null;
  campaign_id: string | null;
  organization_id: string | null;
  notes: string | null;
  // Legacy columns
  occurred_at: string | null;
  category: string | null;
  message: string | null;
  stack_trace: string | null;
  context: Record<string, any> | null;
  severity: string;
  user_id: string | null;
  client_id: string | null;
  // Common columns
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

interface ErrorStats {
  total_errors: number;
  critical_count: number;
  error_count: number;
  warning_count: number;
  info_count: number;
  unresolved_count: number;
  top_sources: { source: string; count: number }[];
}

const SEVERITY_CONFIG = {
  critical: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  high: { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  error: { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  medium: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  low: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
};

// Helper to get normalized values from error log (handles both schemas)
const getLogValue = {
  timestamp: (log: ErrorLog) => log.timestamp || log.occurred_at || log.created_at,
  errorType: (log: ErrorLog) => log.error_type || log.category || 'unknown',
  source: (log: ErrorLog) => log.source || log.category || 'unknown',
  message: (log: ErrorLog) => log.error_message || log.message || 'No message',
  stack: (log: ErrorLog) => log.error_stack || log.stack_trace,
  metadata: (log: ErrorLog) => log.metadata || log.context || {},
};

const TIME_RANGES = [
  { value: '1h', label: 'Last Hour', hours: 1 },
  { value: '6h', label: 'Last 6 Hours', hours: 6 },
  { value: '24h', label: 'Last 24 Hours', hours: 24 },
  { value: '7d', label: 'Last 7 Days', hours: 168 },
  { value: '30d', label: 'Last 30 Days', hours: 720 },
  { value: 'all', label: 'All Time', hours: null },
];

export default function ErrorLogs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState('24h');
  const [showResolved, setShowResolved] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate date filter
  const getDateFilter = useCallback(() => {
    const range = TIME_RANGES.find(r => r.value === timeRange);
    if (!range?.hours) return null;
    return subHours(new Date(), range.hours).toISOString();
  }, [timeRange]);

  // Fetch error logs
  const { data: errorLogs, isLoading, refetch } = useQuery({
    queryKey: ['errorLogs', severityFilter, typeFilter, sourceFilter, timeRange, showResolved, searchQuery, page],
    queryFn: async () => {
      let query = supabase
        .from('error_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      // Apply filters
      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte('timestamp', dateFilter);
      }

      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      if (typeFilter !== 'all') {
        query = query.eq('error_type', typeFilter);
      }

      if (sourceFilter !== 'all') {
        query = query.ilike('source', `%${sourceFilter}%`);
      }

      if (!showResolved) {
        query = query.eq('resolved', false);
      }

      if (searchQuery) {
        query = query.ilike('error_message', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ErrorLog[];
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Fetch error stats
  const { data: stats } = useQuery({
    queryKey: ['errorStats', timeRange],
    queryFn: async () => {
      const range = TIME_RANGES.find(r => r.value === timeRange);
      const { data, error } = await supabase.rpc('get_error_stats', { 
        p_hours: range?.hours || 8760 // Default to 1 year if no range
      });
      
      if (error) throw error;
      return data?.[0] as ErrorStats | undefined;
    },
  });

  // Fetch unique sources for filter dropdown
  const { data: sources } = useQuery({
    queryKey: ['errorSources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('error_logs')
        .select('source')
        .limit(100);
      
      if (error) throw error;
      const uniqueSources = [...new Set(data?.map(d => d.source) || [])];
      return uniqueSources.sort();
    },
  });

  // Mark error as resolved
  const resolveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('error_logs')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          notes: notes || null,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['errorLogs'] });
      queryClient.invalidateQueries({ queryKey: ['errorStats'] });
      toast({ title: 'Error marked as resolved' });
      setSelectedError(null);
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to update error', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Export to CSV
  const handleExport = () => {
    if (!errorLogs?.length) {
      toast({ title: 'No errors to export', variant: 'destructive' });
      return;
    }

    const headers = ['Timestamp', 'Severity', 'Type', 'Source', 'Message', 'User ID', 'URL', 'Resolved'];
    const rows = errorLogs.map(log => [
      log.timestamp,
      log.severity,
      log.error_type,
      log.source,
      `"${log.error_message.replace(/"/g, '""')}"`,
      log.user_id || '',
      log.url || '',
      log.resolved ? 'Yes' : 'No',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: `Exported ${errorLogs.length} errors to CSV` });
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => refetch(), 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refetch]);

  const SeverityBadge = ({ severity }: { severity: string }) => {
    const config = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.info;
    const Icon = config.icon;
    
    return (
      <Badge variant="outline" className={`${config.bg} ${config.color} border-0`}>
        <Icon className="h-3 w-3 mr-1" />
        {severity}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Error Logs</h1>
          <p className="text-muted-foreground">Monitor and diagnose system errors</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="autoRefresh"
              checked={autoRefresh}
              onCheckedChange={(checked) => setAutoRefresh(!!checked)}
            />
            <label htmlFor="autoRefresh" className="text-sm">Auto-refresh</label>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats?.total_errors || 0}</div>
            <p className="text-sm text-muted-foreground">Total Errors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-500">{stats?.critical_count || 0}</div>
            <p className="text-sm text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-500">{stats?.error_count || 0}</div>
            <p className="text-sm text-muted-foreground">Errors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-500">{stats?.warning_count || 0}</div>
            <p className="text-sm text-muted-foreground">Warnings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-500">{stats?.info_count || 0}</div>
            <p className="text-sm text-muted-foreground">Info</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats?.unresolved_count || 0}</div>
            <p className="text-sm text-muted-foreground">Unresolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search error messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Time Range */}
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger>
                <Clock className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map(range => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Severity */}
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>

            {/* Type */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="edge_function">Edge Function</SelectItem>
                <SelectItem value="frontend">Frontend</SelectItem>
                <SelectItem value="api_call">API Call</SelectItem>
                <SelectItem value="database">Database</SelectItem>
                <SelectItem value="external_service">External Service</SelectItem>
              </SelectContent>
            </Select>

            {/* Show Resolved */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="showResolved"
                checked={showResolved}
                onCheckedChange={(checked) => setShowResolved(!!checked)}
              />
              <label htmlFor="showResolved" className="text-sm">Show resolved</label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead className="w-[100px]">Severity</TableHead>
                <TableHead className="w-[120px]">Type</TableHead>
                <TableHead className="w-[150px]">Source</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-[80px]">Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : errorLogs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No errors found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                errorLogs?.map((log) => (
                  <TableRow 
                    key={log.id}
                    className={log.resolved ? 'opacity-50' : ''}
                  >
                    <TableCell className="font-mono text-xs">
                      {format(new Date(getLogValue.timestamp(log)), 'MMM d, HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={log.severity} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {getLogValue.errorType(log)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs truncate max-w-[150px]" title={getLogValue.source(log)}>
                      {getLogValue.source(log)}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="truncate text-sm" title={getLogValue.message(log)}>
                        {getLogValue.message(log)}
                      </p>
                    </TableCell>
                    <TableCell>
                      {log.resolved ? (
                        <Badge variant="outline" className="text-green-500 bg-green-100 dark:bg-green-900/30 border-0">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolved
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Open
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedError(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {errorLogs && errorLogs.length > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1} - {page * pageSize + errorLogs.length} errors
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={errorLogs.length < pageSize}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Error Detail Dialog */}
      <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SeverityBadge severity={selectedError?.severity || 'error'} />
              Error Details
            </DialogTitle>
            <DialogDescription>
              {selectedError?.request_id && (
                <span className="font-mono text-xs">Request ID: {selectedError.request_id}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedError && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                  <p className="font-mono text-sm">
                    {format(new Date(getLogValue.timestamp(selectedError)), 'PPpp')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <p className="text-sm">{getLogValue.errorType(selectedError)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Source</label>
                  <p className="font-mono text-sm">{getLogValue.source(selectedError)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p className="text-sm">{selectedError.resolved ? 'Resolved' : 'Open'}</p>
                </div>
              </div>

              {/* Error Message */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Error Message</label>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <p className="text-sm break-words">{getLogValue.message(selectedError)}</p>
                </div>
              </div>

              {/* Stack Trace */}
              {getLogValue.stack(selectedError) && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Stack Trace</label>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-auto max-h-48">
                    {getLogValue.stack(selectedError)}
                  </pre>
                </div>
              )}

              {/* Context */}
              <div className="grid grid-cols-2 gap-4">
                {selectedError.user_id && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" /> User ID
                    </label>
                    <p className="font-mono text-xs">{selectedError.user_id}</p>
                  </div>
                )}
                {selectedError.url && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> URL
                    </label>
                    <p className="text-xs truncate">{selectedError.url}</p>
                  </div>
                )}
                {selectedError.campaign_id && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Campaign ID</label>
                    <p className="font-mono text-xs">{selectedError.campaign_id}</p>
                  </div>
                )}
                {selectedError.recipient_id && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Recipient ID</label>
                    <p className="font-mono text-xs">{selectedError.recipient_id}</p>
                  </div>
                )}
              </div>

              {/* Metadata */}
              {Object.keys(getLogValue.metadata(selectedError)).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Code className="h-3 w-3" /> Metadata
                  </label>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-auto max-h-32">
                    {JSON.stringify(getLogValue.metadata(selectedError), null, 2)}
                  </pre>
                </div>
              )}

              {/* Resolution Notes */}
              {!selectedError.resolved && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Resolution Notes (optional)</label>
                  <Textarea 
                    id="resolutionNotes"
                    placeholder="Add notes about how this was resolved..."
                    className="mt-1"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedError(null)}>
                  Close
                </Button>
                {!selectedError.resolved && (
                  <Button 
                    onClick={() => {
                      const notes = (document.getElementById('resolutionNotes') as HTMLTextAreaElement)?.value;
                      resolveMutation.mutate({ id: selectedError.id, notes });
                    }}
                    disabled={resolveMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Resolved
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

