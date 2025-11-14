import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ExternalLink, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface CallLogTableProps {
  campaignId: string;
}

export function CallLogTable({ campaignId }: CallLogTableProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [matchFilter, setMatchFilter] = useState("all");

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['call-sessions-log', campaignId, statusFilter, matchFilter],
    queryFn: async () => {
      let query = supabase
        .from('call_sessions')
        .select('*, recipient:recipients(*), tracked_number:tracked_phone_numbers(*), conditions:call_conditions_met(count)')
        .eq('campaign_id', campaignId)
        .order('call_started_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('call_status', statusFilter);
      }

      if (matchFilter !== 'all') {
        query = query.eq('match_status', matchFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
  });

  const filteredSessions = sessions?.filter(session => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      session.caller_phone.includes(searchQuery) ||
      session.recipient?.first_name?.toLowerCase().includes(searchLower) ||
      session.recipient?.last_name?.toLowerCase().includes(searchLower)
    );
  });

  const handleExportCSV = () => {
    if (!filteredSessions) return;

    const headers = ['Call Date', 'Caller', 'Match Status', 'Recipient', 'Duration', 'Status', 'Conditions Met'];
    const rows = filteredSessions.map(session => [
      new Date(session.call_started_at).toLocaleString(),
      session.caller_phone,
      session.match_status,
      session.recipient ? `${session.recipient.first_name} ${session.recipient.last_name}` : '-',
      session.call_duration_seconds ? `${Math.floor(session.call_duration_seconds / 60)}m ${session.call_duration_seconds % 60}s` : '-',
      session.call_status,
      (session.conditions as any)?.[0]?.count || 0,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-log-${campaignId}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Call Log</CardTitle>
            <CardDescription>Complete history of all calls</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by phone or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Call Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="ringing">Ringing</SelectItem>
              <SelectItem value="no_answer">No Answer</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
            </SelectContent>
          </Select>
          <Select value={matchFilter} onValueChange={setMatchFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Match Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Matches</SelectItem>
              <SelectItem value="matched">Matched</SelectItem>
              <SelectItem value="unmatched">Unmatched</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading call log...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Call Date</TableHead>
                <TableHead>Caller</TableHead>
                <TableHead>Match Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Conditions Met</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No calls found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSessions?.map((session: any) => (
                  <TableRow key={session.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(session.call_started_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {session.caller_phone}
                    </TableCell>
                    <TableCell>
                      {session.match_status === 'matched' ? (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-600">✓ Matched</Badge>
                          <span className="text-sm text-muted-foreground">
                            {session.recipient?.first_name} {session.recipient?.last_name}
                          </span>
                        </div>
                      ) : (
                        <Badge variant="secondary">✗ Unmatched</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {session.call_duration_seconds ? (
                        <span className="font-mono text-sm">
                          {Math.floor(session.call_duration_seconds / 60)}m {session.call_duration_seconds % 60}s
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={session.call_status === 'completed' ? 'default' : 'secondary'}>
                        {session.call_status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {session.conditions?.[0]?.count > 0 ? (
                        <Badge className="bg-purple-600">
                          {session.conditions[0].count} condition(s)
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/agent/call/${session.id}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
