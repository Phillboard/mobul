/**
 * Recent Deliveries Table Component - TanStack Table
 * 
 * Purpose: Displays recent gift card deliveries with sorting and filtering
 * Used by: RewardsTab
 * 
 * Key Features:
 * - Sortable columns (recipient, condition, value, status, sent date)
 * - Status filtering
 * - Type-safe column definitions
 * 
 * Related Components: Card, Table, Badge
 */

import { useMemo, useState } from "react";
import {
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createRewardDeliveriesColumns, RewardDeliveryRow } from "./rewardDeliveriesColumns";
import { basicTableModels } from "@/lib/tableHelpers";

interface RecentDeliveriesTableProps {
  campaignId: string;
  deliveries: RewardDeliveryRow[];
}

export function RecentDeliveriesTable({ deliveries }: RecentDeliveriesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "sent", desc: true } // Most recent first
  ]);

  const columns = useMemo(() => createRewardDeliveriesColumns(), []);

  const table = useReactTable({
    data: deliveries || [],
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    ...basicTableModels,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Deliveries</CardTitle>
        <CardDescription>Latest gift card fulfillments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-muted/30 hover:bg-muted/30">
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
                  <TableRow key={row.id} className="hover:bg-muted/50">
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
                  <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                    No deliveries yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
