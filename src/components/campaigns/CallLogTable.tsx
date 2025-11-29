/**
 * Call Log Table - Migrated to TanStack Table
 * Displays complete history of all campaign calls with advanced filtering
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createCallLogColumns, CallSessionRow } from "./callLogColumns";
import { exportTableToCSV } from '@/lib/utils/tableHelpers";
import { formatDate, DATE_FORMATS } from '@/lib/utils/dateUtils";

interface CallLogTableProps {
  campaignId: string;
}

export function CallLogTable({ campaignId }: CallLogTableProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [matchFilter, setMatchFilter] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "call_started_at", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Fetch data with filters
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["call-sessions-log", campaignId, statusFilter, matchFilter],
    queryFn: async () => {
      let query = supabase
        .from("call_sessions")
        .select(
          "*, recipient:recipients(*), tracked_number:tracked_phone_numbers(*), conditions:call_conditions_met(count)"
        )
        .eq("campaign_id", campaignId)
        .order("call_started_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("call_status", statusFilter);
      }

      if (matchFilter !== "all") {
        query = query.eq("match_status", matchFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CallSessionRow[];
    },
    enabled: !!campaignId,
  });

  // Create columns with navigation handler
  const columns = useMemo(
    () => createCallLogColumns((id) => navigate(`/recipients/${id}`)),
    [navigate]
  );

  // Setup TanStack Table
  const table = useReactTable({
    data: sessions || [],
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter: searchQuery,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setSearchQuery,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const value = row.getValue(columnId);
      return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
    },
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (!sessions) return;

    exportTableToCSV(
      sessions,
      [
        { header: "Call Date", accessorKey: "call_started_at" },
        { header: "Caller", accessorKey: "caller_phone" },
        { header: "Match Status", accessorKey: "match_status" },
        { header: "Call Status", accessorKey: "call_status" },
        { header: "Duration (s)", accessorKey: "call_duration_seconds" },
      ],
      `call-log-${campaignId}-${formatDate(new Date(), DATE_FORMATS.DATE_ONLY)}`
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Call Log</CardTitle>
            <CardDescription>Complete history of all calls</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!sessions?.length}>
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : (
                          <div
                            className={
                              header.column.getCanSort()
                                ? "cursor-pointer select-none flex items-center gap-2"
                                : ""
                            }
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {typeof header.column.columnDef.header === "function"
                              ? header.column.columnDef.header(header.getContext())
                              : header.column.columnDef.header}
                            {{
                              asc: " 🔼",
                              desc: " 🔽",
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {typeof cell.column.columnDef.cell === "function"
                            ? cell.column.columnDef.cell(cell.getContext())
                            : cell.renderValue()}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No calls found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
