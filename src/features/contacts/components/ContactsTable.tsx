import { useMemo, useEffect, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
  VisibilityState,
  RowSelectionState,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ColumnSelector } from "./ColumnSelector";
import { ContactBulkActions } from "./ContactBulkActions";
import { useContacts } from "@/hooks/useContacts";
import { useTablePreferences } from '@shared/hooks';
import { ContactFilters } from "@/types/contacts";
import { createColumns } from "./columns";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";

interface ContactsTableProps {
  filters?: ContactFilters;
  onFiltersChange?: (filters: ContactFilters) => void;
}

export function ContactsTable({ filters }: ContactsTableProps) {
  const { data: contacts, isLoading } = useContacts(filters);
  const { preferences, updatePreferences } = useTablePreferences("contacts");
  
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  
  // Initialize column visibility directly from preferences
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    const allColumns = [
      "customer_code", "name", "email", "phone", "mobile_phone", "company",
      "job_title", "address", "city", "state", "lifecycle_stage", "lead_score",
      "engagement_score", "lead_source", "last_activity_date", "created_at"
    ];
    
    const visibilityState: VisibilityState = {};
    allColumns.forEach(col => {
      visibilityState[col] = preferences.visible_columns.includes(col);
    });
    return visibilityState;
  });

  // Only update visibility when preferences change from external source (not our own updates)
  useEffect(() => {
    const allColumns = [
      "customer_code", "name", "email", "phone", "mobile_phone", "company",
      "job_title", "address", "city", "state", "lifecycle_stage", "lead_score",
      "engagement_score", "lead_source", "last_activity_date", "created_at"
    ];
    
    const currentVisible = Object.entries(columnVisibility)
      .filter(([_, visible]) => visible)
      .map(([col]) => col)
      .sort()
      .join(',');
    
    const prefsVisible = preferences.visible_columns.sort().join(',');
    
    // Only update if preferences actually changed
    if (currentVisible !== prefsVisible) {
      const visibilityState: VisibilityState = {};
      allColumns.forEach(col => {
        visibilityState[col] = preferences.visible_columns.includes(col);
      });
      setColumnVisibility(visibilityState);
    }
  }, [preferences.visible_columns]);

  // Custom handler to persist column visibility changes immediately
  const handleColumnVisibilityChange = (updater: VisibilityState | ((old: VisibilityState) => VisibilityState)) => {
    const newVisibility = typeof updater === 'function' ? updater(columnVisibility) : updater;
    setColumnVisibility(newVisibility);
    
    // Immediately persist to database
    const visibleColumns = Object.entries(newVisibility)
      .filter(([_, isVisible]) => isVisible)
      .map(([columnId]) => columnId);
    
    if (visibleColumns.length > 0) {
      updatePreferences({ visible_columns: visibleColumns });
    }
  };

  const columns = useMemo(() => createColumns(() => {}), []);

  const table = useReactTable({
    data: contacts || [],
    columns,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedIds = selectedRows.map(row => row.original.id);

  if (isLoading) {
    return <div className="p-4">Loading contacts...</div>;
  }

  if (!contacts || contacts.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No contacts found"
        description="Get started by creating your first contact or importing a list."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
          {selectedIds.length > 0 && ` • ${selectedIds.length} selected`}
        </div>
        <ColumnSelector table={table} />
      </div>

      {selectedIds.length > 0 && (
        <ContactBulkActions
          selectedIds={selectedIds}
          onComplete={() => table.resetRowSelection()}
        />
      )}

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
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
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
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
