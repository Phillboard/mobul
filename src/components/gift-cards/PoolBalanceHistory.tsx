/**
 * PoolBalanceHistory Component
 * 
 * Purpose: Displays historical balance checks for pool cards
 * Used by: PoolDetailDialog
 * 
 * Key Features:
 * - Chronological balance check history
 * - Shows previous vs new balance
 * - Calculates balance changes
 * - Color-coded positive/negative changes
 * - Success/error status badges
 * 
 * Props:
 * @param {BalanceHistoryWithCard[]} history - Array of balance check records
 * 
 * Related Components: Table, Badge
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { BalanceHistoryWithCard } from "@/types/giftCards";
import { createPoolBalanceHistoryColumns } from "./poolBalanceHistoryColumns";
import { basicTableModels } from '@/lib/utils/tableHelpers";

interface PoolBalanceHistoryProps {
  history: BalanceHistoryWithCard[];
}

export function PoolBalanceHistory({ history }: PoolBalanceHistoryProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "checked_at", desc: true }]);

  const columns = createPoolBalanceHistoryColumns();

  const table = useReactTable({
    data: history || [],
    columns,
    ...basicTableModels,
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <div className="border-2 rounded-xl overflow-hidden shadow-sm bg-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-b-2 bg-muted/30 hover:bg-muted/30 h-14">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="font-semibold text-base px-6">
                  {header.isPlaceholder ? null : (
                    <div
                      className={
                        header.column.getCanSort()
                          ? "flex items-center gap-2 cursor-pointer select-none"
                          : ""
                      }
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {typeof header.column.columnDef.header === "function"
                        ? header.column.columnDef.header(header.getContext())
                        : header.column.columnDef.header}
                      {header.column.getIsSorted() && (
                        <span>{header.column.getIsSorted() === "asc" ? "↑" : "↓"}</span>
                      )}
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
              <TableRow key={row.id} className="hover:bg-muted/50 transition-colors h-16">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="px-6">
                    {typeof cell.column.columnDef.cell === "function"
                      ? cell.column.columnDef.cell(cell.getContext())
                      : cell.getValue()}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground text-base">
                No balance checks yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
