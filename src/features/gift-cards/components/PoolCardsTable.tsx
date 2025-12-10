/**
 * PoolCardsTable Component - Migrated to TanStack Table
 * 
 * Purpose: Displays gift cards in a searchable, filterable table with reveal/hide
 * Used by: PoolDetailDialog
 * 
 * Key Features:
 * - Search by card code or status (TanStack global filter)
 * - Toggle reveal/hide for card codes (security)
 * - Status badges with color coding
 * - Balance and date information
 * - Sortable columns
 * 
 * Related Components: Table, Input, Button, Badge
 */

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
} from "@tanstack/react-table";
import { Input } from "@/shared/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Search } from "lucide-react";
import { GiftCard } from "@/types/giftCards";
import { createPoolCardsColumns, PoolCardRow } from "./poolCardsColumns";

interface PoolCardsTableProps {
  cards: GiftCard[];
  cardValue: number;
  isLoading: boolean;
}

export function PoolCardsTable({ cards, cardValue, isLoading }: PoolCardsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);

  /**
   * Toggles visibility of a card's full code
   */
  const toggleReveal = (cardId: string) => {
    const newRevealed = new Set(revealedCards);
    if (newRevealed.has(cardId)) {
      newRevealed.delete(cardId);
    } else {
      newRevealed.add(cardId);
    }
    setRevealedCards(newRevealed);
  };

  // Prepare data with card value
  const tableData: PoolCardRow[] = useMemo(
    () => cards?.map((card) => ({ ...card, cardValue })) || [],
    [cards, cardValue]
  );

  // Create columns with reveal handlers
  const columns = useMemo(
    () => createPoolCardsColumns(revealedCards, toggleReveal),
    [revealedCards]
  );

  // Setup TanStack Table
  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
      globalFilter: searchQuery,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearchQuery,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search by card code or status..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 text-base border-2 focus-visible:ring-2"
        />
      </div>

      {/* Cards Table */}
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
                <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground text-base">
                  Loading cards...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/50 transition-colors h-16">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-6">
                      {typeof cell.column.columnDef.cell === "function"
                        ? cell.column.columnDef.cell(cell.getContext())
                        : cell.renderValue()}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground text-base">
                  No cards found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
