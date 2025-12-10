import { useMemo, useState } from "react";
import {
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { useGiftCardDeliveries } from "../hooks/useGiftCards";
import { createDeliveryHistoryColumns } from "./deliveryHistoryColumns";
import { basicTableModels } from '@shared/utils/table';

interface DeliveryHistoryProps {
  campaignId?: string;
}

export function DeliveryHistory({ campaignId }: DeliveryHistoryProps) {
  const { deliveries, isLoading } = useGiftCardDeliveries(campaignId);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "delivered_at", desc: true }
  ]);

  const columns = useMemo(() => createDeliveryHistoryColumns(), []);

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
        <CardTitle>Delivery History</CardTitle>
        <CardDescription>
          All gift card deliveries and their status
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  Loading deliveries...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
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
                  No deliveries found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
