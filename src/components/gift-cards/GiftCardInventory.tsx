import { useState, useMemo } from "react";
import {
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGiftCards } from "@/hooks/useGiftCards";
import { useGiftCardPools } from "@/hooks/useGiftCardPools";
import { createGiftCardInventoryColumns } from "./giftCardInventoryColumns";
import { basicTableModels } from "@/lib/tableHelpers";

interface GiftCardInventoryProps {
  clientId: string;
}

export function GiftCardInventory({ clientId }: GiftCardInventoryProps) {
  const [selectedPoolId, setSelectedPoolId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [revealedCodes, setRevealedCodes] = useState<Set<string>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  
  const { pools } = useGiftCardPools(clientId);
  const { cards, isLoading } = useGiftCards(selectedPoolId || undefined);

  const filteredCards = cards?.filter(card => 
    statusFilter === "all" || card.status === statusFilter
  );

  const toggleReveal = (cardId: string) => {
    const newRevealed = new Set(revealedCodes);
    if (newRevealed.has(cardId)) {
      newRevealed.delete(cardId);
    } else {
      newRevealed.add(cardId);
    }
    setRevealedCodes(newRevealed);
  };

  const columns = useMemo(
    () => createGiftCardInventoryColumns(revealedCodes, toggleReveal),
    [revealedCodes]
  );

  const table = useReactTable({
    data: filteredCards || [],
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    ...basicTableModels,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Gift Card Inventory</CardTitle>
          <CardDescription>
            View and manage individual gift card codes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={selectedPoolId} onValueChange={setSelectedPoolId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pool to view cards" />
                </SelectTrigger>
                <SelectContent>
                  {pools?.map((pool) => (
                    <SelectItem key={pool.id} value={pool.id}>
                      {pool.pool_name} ({pool.total_cards} cards)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="claimed">Claimed</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedPoolId && (
        <Card>
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
                      Loading cards...
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
                      No cards found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
