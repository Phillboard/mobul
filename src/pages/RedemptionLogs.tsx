/**
 * Redemption Logs Page
 * 
 * Admin-only page to view detailed redemption workflow logs.
 * Groups logs by session+step to show ONE row per step with final status.
 * Expandable rows show full timeline and payloads.
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@core/services/supabase";
import { Layout } from "@/shared/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/components/ui/collapsible";
import { Download, Search, RefreshCw, ClipboardList, ChevronDown, ChevronRight, CheckCircle, Clock, XCircle, SkipForward } from "lucide-react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";

// Types
interface RedemptionLogRow {
  id: string;
  session_id: string;
  call_session_id: string | null;
  recipient_id: string | null;
  campaign_id: string | null;
  agent_user_id: string | null;
  redemption_code: string | null;
  step_name: string;
  step_number: number;
  status: string;
  request_payload: Record<string, unknown>;
  response_payload: Record<string, unknown>;
  error_code: string | null;
  error_message: string | null;
  error_stack: string | null;
  duration_ms: number | null;
  created_at: string;
  // Joined data
  campaign?: { name: string } | null;
  recipient?: { first_name: string | null; last_name: string | null; redemption_code: string } | null;
}

// Extended type with grouped entries
interface GroupedLogRow extends RedemptionLogRow {
  _allEntries: RedemptionLogRow[];
  _totalDuration: number | null;
}

// Step display names
const STEP_NAMES: Record<string, string> = {
  code_lookup: 'Code Lookup',
  campaign_select: 'Campaign Select',
  sms_opt_in: 'SMS Opt-In',
  sms_response: 'SMS Response',
  condition_select: 'Condition Select',
  provision: 'Gift Card Provision',
  verification_skip: 'Verification Skip',
  email_verification: 'Email Verification',
};

// Status badge variants
const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle }> = {
  started: { label: 'In Progress', variant: 'outline', icon: Clock },
  success: { label: 'Success', variant: 'default', icon: CheckCircle },
  failed: { label: 'Failed', variant: 'destructive', icon: XCircle },
  skipped: { label: 'Skipped', variant: 'secondary', icon: SkipForward },
};

// Expandable row component showing grouped step data
function ExpandableLogRow({ row }: { row: GroupedLogRow }) {
  const [isOpen, setIsOpen] = useState(false);
  const statusConfig = STATUS_CONFIG[row.status] || STATUS_CONFIG.started;
  const StatusIcon = statusConfig.icon;
  
  // Calculate duration from first entry to last entry
  const displayDuration = row._totalDuration;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setIsOpen(!isOpen)}>
        <TableCell>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </TableCell>
        <TableCell className="font-mono text-xs">
          {format(new Date(row.created_at), 'MMM d, HH:mm:ss')}
        </TableCell>
        <TableCell className="font-mono">
          {row.redemption_code || row.recipient?.redemption_code || '-'}
        </TableCell>
        <TableCell>
          {row.campaign?.name || '-'}
        </TableCell>
        <TableCell>
          <Badge variant="outline">{STEP_NAMES[row.step_name] || row.step_name}</Badge>
        </TableCell>
        <TableCell>
          <Badge variant={statusConfig.variant} className="flex items-center gap-1 w-fit">
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          {displayDuration ? `${displayDuration}ms` : '-'}
        </TableCell>
        <TableCell className="max-w-[200px] truncate text-destructive">
          {row.error_message || '-'}
        </TableCell>
      </TableRow>
      <CollapsibleContent asChild>
        <TableRow className="bg-muted/30">
          <TableCell colSpan={8} className="p-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Timeline (if multiple entries) */}
              {row._allEntries.length > 1 && (
                <div className="space-y-2 col-span-2">
                  <h4 className="font-semibold text-sm">Timeline</h4>
                  <div className="flex items-center gap-2 text-xs bg-background p-2 rounded">
                    {row._allEntries.map((entry, idx) => {
                      const entryStatusConfig = STATUS_CONFIG[entry.status] || STATUS_CONFIG.started;
                      const EntryIcon = entryStatusConfig.icon;
                      return (
                        <div key={entry.id} className="flex items-center gap-1">
                          {idx > 0 && <span className="text-muted-foreground mx-2">→</span>}
                          <span className="text-muted-foreground">{format(new Date(entry.created_at), 'HH:mm:ss')}</span>
                          <Badge variant={entryStatusConfig.variant} className="text-xs h-5">
                            <EntryIcon className="h-3 w-3 mr-1" />
                            {entry.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Session Info */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Session Info</h4>
                <div className="text-xs space-y-1 font-mono bg-background p-2 rounded">
                  <div><span className="text-muted-foreground">Session ID:</span> {row.session_id}</div>
                  <div><span className="text-muted-foreground">Call Session:</span> {row.call_session_id || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Recipient ID:</span> {row.recipient_id || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Campaign ID:</span> {row.campaign_id || 'N/A'}</div>
                </div>
              </div>

              {/* Request Payload (from first entry if exists) */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Request Payload</h4>
                <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(
                    row._allEntries.find(e => Object.keys(e.request_payload || {}).length > 0)?.request_payload || {},
                    null, 2
                  )}
                </pre>
              </div>

              {/* Response Payload (from final entry) */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Response Payload</h4>
                <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(row.response_payload || {}, null, 2)}
                </pre>
              </div>

              {/* Error Details (if failed) */}
              {row.status === 'failed' && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-destructive">Error Details</h4>
                  <div className="text-xs space-y-1 bg-destructive/10 p-2 rounded border border-destructive/20">
                    {row.error_code && (
                      <div><span className="text-muted-foreground">Code:</span> <span className="font-mono">{row.error_code}</span></div>
                    )}
                    <div><span className="text-muted-foreground">Message:</span> {row.error_message}</div>
                    {row.error_stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-muted-foreground">Stack Trace</summary>
                        <pre className="mt-1 text-[10px] overflow-auto max-h-24">{row.error_stack}</pre>
                      </details>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function RedemptionLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stepFilter, setStepFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Fetch redemption workflow logs
  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["redemption-workflow-logs", statusFilter, stepFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("redemption_workflow_log")
        .select(`
          *,
          campaign:campaigns(name),
          recipient:recipients(first_name, last_name, redemption_code)
        `)
        .order("created_at", { ascending: false })
        .limit(1000);

      // Don't filter by status in the query - we need all entries to group them
      // Status filter will be applied after grouping

      if (stepFilter !== "all") {
        query = query.eq("step_name", stepFilter);
      }

      if (dateFrom) {
        query = query.gte("created_at", new Date(dateFrom).toISOString());
      }

      if (dateTo) {
        query = query.lte("created_at", new Date(dateTo).toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as RedemptionLogRow[];
    },
  });

  // Group logs by session_id + step_name to show ONE row per step
  const groupedLogs = useMemo(() => {
    if (!logs) return [];
    
    const groups = new Map<string, RedemptionLogRow[]>();
    
    // Group by session_id + step_name
    for (const log of logs) {
      const key = `${log.session_id}:${log.step_name}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(log);
    }
    
    // For each group, create a grouped entry with the final status
    const result: GroupedLogRow[] = [];
    
    for (const entries of groups.values()) {
      // Sort by created_at to get chronological order
      entries.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      // The final entry (last one) represents the final status
      const finalEntry = entries[entries.length - 1];
      const firstEntry = entries[0];
      
      // Calculate total duration from first entry to last entry
      const totalDuration = finalEntry.created_at !== firstEntry.created_at
        ? new Date(finalEntry.created_at).getTime() - new Date(firstEntry.created_at).getTime()
        : finalEntry.duration_ms;
      
      result.push({
        ...finalEntry,
        _allEntries: entries,
        _totalDuration: totalDuration,
      });
    }
    
    // Sort by the final entry's created_at (most recent first)
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return result;
  }, [logs]);

  // Apply search and status filters to grouped logs
  const filteredLogs = useMemo(() => {
    let filtered = groupedLogs;
    
    // Apply status filter (on final status)
    if (statusFilter !== "all") {
      filtered = filtered.filter(log => log.status === statusFilter);
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((log) => 
        log.redemption_code?.toLowerCase().includes(term) ||
        log.recipient?.redemption_code?.toLowerCase().includes(term) ||
        log.recipient?.first_name?.toLowerCase().includes(term) ||
        log.recipient?.last_name?.toLowerCase().includes(term) ||
        log.campaign?.name?.toLowerCase().includes(term) ||
        log.session_id?.toLowerCase().includes(term) ||
        log.error_message?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [groupedLogs, statusFilter, searchTerm]);

  // Stats based on grouped logs (unique steps, not raw entries)
  const stats = useMemo(() => {
    if (!groupedLogs.length) return { total: 0, success: 0, failed: 0, sessions: 0 };
    const sessions = new Set(groupedLogs.map(l => l.session_id));
    return {
      total: groupedLogs.length,
      success: groupedLogs.filter(l => l.status === 'success').length,
      failed: groupedLogs.filter(l => l.status === 'failed').length,
      sessions: sessions.size,
    };
  }, [groupedLogs]);

  // Export to CSV
  const exportToCSV = () => {
    if (!filteredLogs.length) return;
    
    const headers = ['Timestamp', 'Session ID', 'Redemption Code', 'Campaign', 'Step', 'Status', 'Duration (ms)', 'Error Code', 'Error Message'];
    const rows = filteredLogs.map(log => [
      log.created_at,
      log.session_id,
      log.redemption_code || log.recipient?.redemption_code || '',
      log.campaign?.name || '',
      log.step_name,
      log.status,
      log._totalDuration?.toString() || '',
      log.error_code || '',
      log.error_message || '',
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redemption-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardList className="h-8 w-8" />
              Redemption Logs
            </h1>
            <p className="text-muted-foreground">
              Detailed workflow logs for call center redemptions
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={exportToCSV} disabled={!filteredLogs.length}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Steps</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Unique Sessions</CardDescription>
              <CardTitle className="text-2xl">{stats.sessions}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Successful</CardDescription>
              <CardTitle className="text-2xl text-green-600">{stats.success}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Failed</CardDescription>
              <CardTitle className="text-2xl text-red-600">{stats.failed}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Code, name, campaign..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="skipped">Skipped</SelectItem>
                    <SelectItem value="started">In Progress</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Step Filter */}
              <div className="space-y-2">
                <Label>Step</Label>
                <Select value={stepFilter} onValueChange={setStepFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All steps" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Steps</SelectItem>
                    <SelectItem value="code_lookup">Code Lookup</SelectItem>
                    <SelectItem value="campaign_select">Campaign Select</SelectItem>
                    <SelectItem value="sms_opt_in">SMS Opt-In</SelectItem>
                    <SelectItem value="condition_select">Condition Select</SelectItem>
                    <SelectItem value="provision">Provision</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Workflow Logs</CardTitle>
            <CardDescription>
              Click on a row to expand and view detailed payloads
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mb-2" />
                <p>No logs found</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead className="w-[120px]">Timestamp</TableHead>
                      <TableHead className="w-[120px]">Code</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead className="w-[140px]">Step</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[80px] text-right">Duration</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <ExpandableLogRow key={`${log.session_id}-${log.step_name}`} row={log} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
