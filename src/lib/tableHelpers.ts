/**
 * TanStack Table Helpers
 * Reusable utilities and configurations for consistent table implementations
 */
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";

/**
 * Standard table model configuration
 * Use this for all basic tables
 */
export const basicTableModels = {
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
};

/**
 * Table with pagination
 */
export const paginatedTableModels = {
  ...basicTableModels,
  getPaginationRowModel: getPaginationRowModel(),
};

/**
 * Initial table state factory
 */
export function createInitialTableState(options?: {
  sorting?: SortingState;
  columnFilters?: ColumnFiltersState;
  columnVisibility?: VisibilityState;
  pagination?: { pageSize: number; pageIndex: number };
}) {
  return {
    sorting: options?.sorting || [],
    columnFilters: options?.columnFilters || [],
    columnVisibility: options?.columnVisibility || {},
    pagination: options?.pagination || { pageIndex: 0, pageSize: 10 },
  };
}

/**
 * Global filter function for search across all columns
 */
export function globalFilterFn(row: any, columnId: string, filterValue: string) {
  const value = row.getValue(columnId);
  if (value == null) return false;
  
  return String(value)
    .toLowerCase()
    .includes(String(filterValue).toLowerCase());
}

/**
 * Export table data to CSV
 */
export function exportTableToCSV<TData>(
  data: TData[],
  columns: Array<{ header: string; accessorKey: string }>,
  filename: string
) {
  const headers = columns.map(col => col.header);
  const rows = data.map(row =>
    columns.map(col => {
      const value = (row as any)[col.accessorKey];
      // Handle objects/arrays
      if (typeof value === 'object') return JSON.stringify(value);
      // Escape commas and quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    })
  );

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Create a checkbox column configuration for row selection
 * Note: You'll need to implement the actual checkbox rendering in your component
 */
export function createCheckboxColumnConfig<TData>(): ColumnDef<TData> {
  return {
    id: "select",
    header: "select-all",  // Component should check for this and render checkbox
    cell: "select-row",     // Component should check for this and render checkbox
    enableSorting: false,
    enableHiding: false,
  };
}
