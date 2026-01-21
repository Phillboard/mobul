import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@core/services/supabase";
import { Layout } from "@/shared/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import { Download, Search, RefreshCw, Undo2, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, SortingState, ColumnFiltersState } from "@tanstack/react-table";
import { DataTable } from "@/shared/components/ui/data-table";
import { DataTablePagination } from "@/shared/components/ui/data-table-pagination";
import { DataTableToolbar } from "@/shared/components/ui/data-table-toolbar";
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options";
import { createAuditLogColumns, AuditLogRow } from "@/features/settings/components/auditLogColumns";
import { createUploadHistoryColumns, UploadHistoryRow } from "@/features/settings/components/uploadHistoryColumns";
import { createRevokeLogColumns, RevokeLogRow } from "@/features/gift-cards/components/revokeLogColumns";
import { exportTableToCSV } from "@/shared/utils/table";

export default function AdminAuditLog() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [auditSorting, setAuditSorting] = useState<SortingState>([]);
  const [auditColumnFilters, setAuditColumnFilters] = useState<ColumnFiltersState>([]);
  const [uploadSorting, setUploadSorting] = useState<SortingState>([]);
  const [uploadColumnFilters, setUploadColumnFilters] = useState<ColumnFiltersState>([]);
  const [revokeSorting, setRevokeSorting] = useState<SortingState>([]);
  const [revokeColumnFilters, setRevokeColumnFilters] = useState<ColumnFiltersState>([]);
  const [activeTab, setActiveTab] = useState("activity");

  // Fetch unique agents for filter
  const { data: agents } = useQuery({
    queryKey: ["agents-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "call_center", "company_owner"]);

      if (error) throw error;
      return data;
    },
  });

  // Fetch audit logs
  const { data: auditLogs, isLoading, refetch } = useQuery({
    queryKey: ["audit-logs", actionFilter, statusFilter, agentFilter, searchTerm, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("recipient_audit_log")
        .select(`
          *,
          recipient:recipients(redemption_code, first_name, last_name, phone)
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      if (agentFilter !== "all") {
        query = query.eq("performed_by_user_id", agentFilter);
      }

      if (dateFrom) {
        query = query.gte("created_at", new Date(dateFrom).toISOString());
      }

      if (dateTo) {
        query = query.lte("created_at", new Date(dateTo).toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by search term and status locally
      let filteredData = data || [];

      if (searchTerm) {
        filteredData = filteredData.filter((log: any) => {
          const searchLower = searchTerm.toLowerCase();
          return (
            log.recipient?.redemption_code?.toLowerCase().includes(searchLower) ||
            log.recipient?.first_name?.toLowerCase().includes(searchLower) ||
            log.recipient?.last_name?.toLowerCase().includes(searchLower) ||
            log.recipient?.phone?.includes(searchTerm)
          );
        });
      }

      if (statusFilter !== "all") {
        filteredData = filteredData.filter((log: any) => 
          log.recipient?.status === statusFilter
        );
      }

      return filteredData as AuditLogRow[];
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
      return data as UploadHistoryRow[];
    },
  });

  // Fetch gift card revoke log
  const { data: revokeLogs, isLoading: revokeLoading, refetch: refetchRevokes } = useQuery({
    queryKey: ["gift-card-revoke-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_revoke_log")
        .select(`
          *,
          campaign:campaigns(name)
        `)
        .order("revoked_at", { ascending: false })
        .limit(500);

      if (error) {
        console.error("Revoke log query error:", error);
        return [];
      }
      return data as RevokeLogRow[];
    },
  });

  const auditColumns = useMemo(() => createAuditLogColumns(), []);
  const uploadColumns = useMemo(() => createUploadHistoryColumns(), []);
  const revokeColumns = useMemo(() => createRevokeLogColumns(), []);

  const auditTable = useReactTable({
    data: auditLogs || [],
    columns: auditColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setAuditSorting,
    onColumnFiltersChange: setAuditColumnFilters,
    state: {
      sorting: auditSorting,
      columnFilters: auditColumnFilters,
    },
  });

  const uploadTable = useReactTable({
    data: uploads || [],
    columns: uploadColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setUploadSorting,
    onColumnFiltersChange: setUploadColumnFilters,
    state: {
      sorting: uploadSorting,
      columnFilters: uploadColumnFilters,
    },
  });

  const revokeTable = useReactTable({
    data: revokeLogs || [],
    columns: revokeColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setRevokeSorting,
    onColumnFiltersChange: setRevokeColumnFilters,
    state: {
      sorting: revokeSorting,
      columnFilters: revokeColumnFilters,
    },
  });

  const exportAuditToCSV = () => {
    if (!auditLogs) return;
    exportTableToCSV(
      auditLogs,
      [
        { header: "Timestamp", accessorKey: "created_at" },
        { header: "Action", accessorKey: "action" },
        { header: "Code", accessorKey: "recipient.redemption_code" },
        { header: "Performed By", accessorKey: "performed_by_user_id" },
        { header: "IP Address", accessorKey: "ip_address" },
      ],
      `audit_log_${format(new Date(), "yyyy-MM-dd")}`
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Audit Log & Activity Monitoring</h1>
          <p className="text-muted-foreground mt-2">
            Complete tracking of all customer code activities and gift card revocations
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="activity">
              <ClipboardList className="h-4 w-4 mr-2" />
              Activity Log
            </TabsTrigger>
            <TabsTrigger value="revokes">
              <Undo2 className="h-4 w-4 mr-2" />
              Gift Card Revokes
              {(revokeLogs?.length || 0) > 0 && (
                <span className="ml-2 bg-gray-200 dark:bg-gray-700 text-xs px-1.5 py-0.5 rounded-full">
                  {revokeLogs?.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-6">
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="redeemed">Redeemed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Agent</Label>
                <Select value={agentFilter} onValueChange={setAgentFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    {agents?.map((agent) => (
                      <SelectItem key={agent.user_id} value={agent.user_id}>
                        {agent.user_id.substring(0, 8)}...
                      </SelectItem>
                    ))}
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

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Button onClick={exportAuditToCSV} variant="outline">
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
                {isLoading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : (
                  <div className="space-y-4">
                    <DataTableToolbar table={auditTable}>
                      <DataTableViewOptions table={auditTable} />
                    </DataTableToolbar>
                    <DataTable table={auditTable} />
                    <DataTablePagination table={auditTable} />
                  </div>
                )}
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
                  <div className="space-y-4">
                    <DataTableToolbar table={uploadTable}>
                      <DataTableViewOptions table={uploadTable} />
                    </DataTableToolbar>
                    <DataTable table={uploadTable} />
                    <DataTablePagination table={uploadTable} />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="revokes" className="space-y-6">
            {/* Revoke Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Revocations</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{revokeLogs?.length || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Today's Revocations</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {revokeLogs?.filter((log) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return new Date(log.revoked_at) >= today;
                    }).length || 0}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Value Revoked</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    ${revokeLogs?.reduce((sum, log) => sum + (Number(log.card_value) || 0), 0).toFixed(2) || '0.00'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Revoke Log Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gift Card Revoke Log</CardTitle>
                    <CardDescription>Complete audit trail of all gift card revocations</CardDescription>
                  </div>
                  <Button onClick={() => refetchRevokes()} variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {revokeLoading ? (
                  <div className="text-center py-8">Loading revoke log...</div>
                ) : revokeLogs && revokeLogs.length > 0 ? (
                  <div className="space-y-4">
                    <DataTableToolbar table={revokeTable}>
                      <DataTableViewOptions table={revokeTable} />
                    </DataTableToolbar>
                    <DataTable table={revokeTable} />
                    <DataTablePagination table={revokeTable} />
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Undo2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No gift cards have been revoked yet</p>
                    <p className="text-sm mt-2">When admins revoke gift cards, the audit trail will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
