import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Search, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminAuditLog() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Fetch audit logs
  const { data: auditLogs, isLoading, refetch } = useQuery({
    queryKey: ["audit-logs", actionFilter, searchTerm, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("recipient_audit_log")
        .select(`
          *,
          recipient:recipients(redemption_code, first_name, last_name, phone),
          performed_by:auth.users(id)
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      if (dateFrom) {
        query = query.gte("created_at", new Date(dateFrom).toISOString());
      }

      if (dateTo) {
        query = query.lte("created_at", new Date(dateTo).toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by search term locally
      if (searchTerm) {
        return data.filter((log: any) => {
          const searchLower = searchTerm.toLowerCase();
          return (
            log.recipient?.redemption_code?.toLowerCase().includes(searchLower) ||
            log.recipient?.first_name?.toLowerCase().includes(searchLower) ||
            log.recipient?.last_name?.toLowerCase().includes(searchLower) ||
            log.recipient?.phone?.includes(searchTerm)
          );
        });
      }

      return data;
    },
  });

  // Fetch upload history
  const { data: uploads } = useQuery({
    queryKey: ["bulk-uploads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bulk_code_uploads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      uploaded: "secondary",
      approved: "default",
      rejected: "destructive",
      redeemed: "outline",
      viewed: "secondary",
    };

    return <Badge variant={variants[action] || "secondary"}>{action}</Badge>;
  };

  const exportToCSV = () => {
    if (!auditLogs) return;

    const headers = ["Timestamp", "Action", "Code", "Customer", "Performed By", "IP Address"];
    const rows = auditLogs.map((log: any) => [
      format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
      log.action,
      log.recipient?.redemption_code || "N/A",
      `${log.recipient?.first_name || ""} ${log.recipient?.last_name || ""}`.trim() || "N/A",
      log.performed_by_user_id || "System",
      log.ip_address || "N/A",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_log_${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Audit Log & Activity Monitoring</h1>
          <p className="text-muted-foreground mt-2">
            Complete tracking of all customer code activities
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Uploads</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{uploads?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Events</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{auditLogs?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Approvals</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {auditLogs?.filter((log: any) => log.action === "approved").length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Redemptions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {auditLogs?.filter((log: any) => log.action === "redeemed").length || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Action Type</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="uploaded">Uploaded</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="redeemed">Redeemed</SelectItem>
                    <SelectItem value="viewed">Viewed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Code, name, phone..."
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label>Date From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div>
                <Label>Date To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={exportToCSV} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log Table */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>Showing {auditLogs?.length || 0} events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : auditLogs && auditLogs.length > 0 ? (
                    auditLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(new Date(log.created_at), "MMM dd, yyyy HH:mm:ss")}
                        </TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {log.recipient?.redemption_code || "N/A"}
                        </TableCell>
                        <TableCell>
                          {log.recipient
                            ? `${log.recipient.first_name || ""} ${log.recipient.last_name || ""}`.trim() || "N/A"
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.performed_by_user_id || "System"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.ip_address || "N/A"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No activity found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Upload History */}
        {uploads && uploads.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Upload History</CardTitle>
              <CardDescription>Recent bulk code uploads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>File Name</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Success</TableHead>
                      <TableHead>Duplicates</TableHead>
                      <TableHead>Errors</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploads.map((upload: any) => (
                      <TableRow key={upload.id}>
                        <TableCell className="text-sm">
                          {format(new Date(upload.created_at), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell>{upload.file_name}</TableCell>
                        <TableCell>{upload.total_codes}</TableCell>
                        <TableCell className="text-green-600">{upload.successful_codes}</TableCell>
                        <TableCell className="text-yellow-600">{upload.duplicate_codes}</TableCell>
                        <TableCell className="text-red-600">{upload.error_codes}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              upload.upload_status === "completed"
                                ? "default"
                                : upload.upload_status === "failed"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {upload.upload_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
