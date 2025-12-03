/**
 * AdminIndividualCardsView - Individual gift card inventory management
 * 
 * Features:
 * - Filter by brand, denomination, status
 * - Search by card code
 * - View individual card details
 * - Bulk balance checking
 * - Delete individual cards
 * - Export to CSV
 */

import { useState, useMemo } from "react";
import { 
  useReactTable, 
  getCoreRowModel, 
  getSortedRowModel, 
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  ColumnFiltersState,
  RowSelectionState,
  flexRender,
} from "@tanstack/react-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Search, 
  RefreshCw, 
  Trash2, 
  Download, 
  Eye, 
  EyeOff,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Package,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/utils";
import { formatDate, DATE_FORMATS } from "@/lib/utils/dateUtils";
import { 
  useIndividualCards, 
  useDeleteCard, 
  useBulkDeleteCards,
  useCheckCardBalance,
  useBulkCheckBalances,
  type InventoryCard,
  type InventoryCardFilters,
} from "@/hooks/useIndividualCardInventory";
import { useGiftCardBrandsWithDenominations } from "@/hooks/useGiftCardBrands";
import { IndividualCardDetailDialog } from "./IndividualCardDetailDialog";
import { ColumnDef } from "@tanstack/react-table";

// Helper to mask card code
function maskCardCode(code: string): string {
  if (!code || code.length < 4) return code;
  return code.slice(0, 4) + "****" + code.slice(-4);
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    available: { variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
    assigned: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
    delivered: { variant: "outline", icon: <Package className="h-3 w-3" /> },
    expired: { variant: "destructive", icon: <AlertTriangle className="h-3 w-3" /> },
  };

  const config = variants[status] || variants.available;

  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {status}
    </Badge>
  );
}

// Balance check status indicator
function BalanceStatus({ status, balance }: { status: string | null; balance: number | null }) {
  if (status === "success" && balance !== null) {
    return (
      <span className="text-green-600 font-medium">${balance.toFixed(2)}</span>
    );
  }
  if (status === "error") {
    return (
      <span className="text-red-500 flex items-center gap-1">
        <XCircle className="h-3 w-3" /> Error
      </span>
    );
  }
  if (status === "manual") {
    return (
      <span className="text-blue-500 flex items-center gap-1">
        {balance !== null ? `$${balance.toFixed(2)}` : "Manual"}
      </span>
    );
  }
  return (
    <span className="text-muted-foreground flex items-center gap-1">
      <Clock className="h-3 w-3" /> Unchecked
    </span>
  );
}

export function AdminIndividualCardsView() {
  // State
  const [filters, setFilters] = useState<InventoryCardFilters>({
    status: "all",
    limit: 50,
    offset: 0,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  // Data fetching
  const { data: cardsData, isLoading: cardsLoading, refetch } = useIndividualCards(filters);
  const { data: brands } = useGiftCardBrandsWithDenominations(false);
  
  // Mutations
  const deleteCard = useDeleteCard();
  const bulkDeleteCards = useBulkDeleteCards();
  const checkBalance = useCheckCardBalance();
  const bulkCheckBalances = useBulkCheckBalances();

  // Get unique denominations for the selected brand
  const denominations = useMemo(() => {
    if (!filters.brandId || !brands) return [];
    const brand = brands.find(b => b.id === filters.brandId);
    return brand?.denominations?.map(d => d.denomination).sort((a, b) => a - b) || [];
  }, [filters.brandId, brands]);

  // Toggle card code visibility
  const toggleReveal = (cardId: string) => {
    const newRevealed = new Set(revealedCards);
    if (newRevealed.has(cardId)) {
      newRevealed.delete(cardId);
    } else {
      newRevealed.add(cardId);
    }
    setRevealedCards(newRevealed);
  };

  // Handle search
  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchInput, offset: 0 }));
  };

  // Handle delete confirmation
  const handleDeleteClick = (cardId: string) => {
    setCardToDelete(cardId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (cardToDelete) {
      await deleteCard.mutateAsync({ cardId: cardToDelete });
      setDeleteConfirmOpen(false);
      setCardToDelete(null);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    const selectedIds = Object.keys(rowSelection);
    if (selectedIds.length > 0) {
      await bulkDeleteCards.mutateAsync({ cardIds: selectedIds });
      setRowSelection({});
      setBulkDeleteConfirmOpen(false);
    }
  };

  // Handle bulk balance check
  const handleBulkBalanceCheck = async () => {
    const selectedIds = Object.keys(rowSelection);
    if (selectedIds.length > 0) {
      await bulkCheckBalances.mutateAsync({ cardIds: selectedIds });
    } else if (filters.brandId) {
      await bulkCheckBalances.mutateAsync({ 
        brandId: filters.brandId, 
        denomination: filters.denomination 
      });
    }
  };

  // Export to CSV
  const handleExport = () => {
    if (!cardsData?.cards?.length) return;

    const headers = ["Card Code", "Brand", "Denomination", "Status", "Balance", "Last Check", "Expiration"];
    const rows = cardsData.cards.map(card => [
      card.card_code,
      card.gift_card_brands?.brand_name || "",
      card.denomination,
      card.status,
      card.current_balance ?? "",
      card.last_balance_check || "",
      card.expiration_date || "",
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gift-cards-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Column definitions
  const columns = useMemo<ColumnDef<InventoryCard>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "card_code",
      header: "Card Code",
      cell: ({ row }) => {
        const isRevealed = revealedCards.has(row.original.id);
        const code = row.original.card_code;
        return (
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
              {isRevealed ? code : maskCardCode(code)}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleReveal(row.original.id)}
              className="h-6 w-6 p-0"
            >
              {isRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: "gift_card_brands",
      header: "Brand",
      cell: ({ row }) => {
        const brand = row.original.gift_card_brands;
        return (
          <div className="flex items-center gap-2">
            {brand?.logo_url && (
              <img 
                src={brand.logo_url} 
                alt={brand.brand_name} 
                className="h-6 w-auto object-contain"
              />
            )}
            <span className="font-medium">{brand?.brand_name || "Unknown"}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "denomination",
      header: "Value",
      cell: ({ row }) => (
        <Badge variant="outline">{formatCurrency(row.original.denomination)}</Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "current_balance",
      header: "Balance",
      cell: ({ row }) => (
        <BalanceStatus 
          status={row.original.balance_check_status} 
          balance={row.original.current_balance} 
        />
      ),
    },
    {
      accessorKey: "last_balance_check",
      header: "Last Check",
      cell: ({ row }) => {
        const date = row.original.last_balance_check;
        return date ? (
          <span className="text-sm text-muted-foreground">
            {formatDate(date, DATE_FORMATS.RELATIVE)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "expiration_date",
      header: "Expires",
      cell: ({ row }) => {
        const date = row.original.expiration_date;
        if (!date) return <span className="text-muted-foreground">—</span>;
        
        const isExpired = new Date(date) < new Date();
        return (
          <span className={isExpired ? "text-red-500" : "text-muted-foreground"}>
            {formatDate(date, DATE_FORMATS.SHORT)}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const card = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedCardId(card.id)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => checkBalance.mutate(card.id)}
                disabled={checkBalance.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${checkBalance.isPending ? "animate-spin" : ""}`} />
                Check Balance
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleDeleteClick(card.id)}
                className="text-red-600"
                disabled={card.status === "assigned" || card.status === "delivered"}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [revealedCards, checkBalance.isPending]);

  // Table instance
  const table = useReactTable({
    data: cardsData?.cards || [],
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
  });

  const selectedCount = Object.keys(rowSelection).length;

  // Calculate summary stats
  const stats = useMemo(() => {
    const cards = cardsData?.cards || [];
    return {
      total: cards.length,
      available: cards.filter(c => c.status === "available").length,
      assigned: cards.filter(c => c.status === "assigned").length,
      delivered: cards.filter(c => c.status === "delivered").length,
      totalValue: cards
        .filter(c => c.status === "available" || c.status === "assigned")
        .reduce((sum, c) => sum + c.denomination, 0),
      uncheckedCount: cards.filter(c => c.balance_check_status === "unchecked" || !c.balance_check_status).length,
    };
  }, [cardsData?.cards]);

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Cards</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Available</div>
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Assigned</div>
            <div className="text-2xl font-bold text-blue-600">{stats.assigned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Value</div>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Unchecked</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.uncheckedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Select
                value={filters.brandId || "all"}
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  brandId: value === "all" ? undefined : value,
                  denomination: undefined, // Reset denomination when brand changes
                  offset: 0,
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands?.map(brand => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.brand_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[150px]">
              <Select
                value={filters.denomination?.toString() || "all"}
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  denomination: value === "all" ? undefined : parseFloat(value),
                  offset: 0,
                }))}
                disabled={!filters.brandId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Values" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Values</SelectItem>
                  {denominations.map(d => (
                    <SelectItem key={d} value={d.toString()}>
                      ${d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[150px]">
              <Select
                value={filters.status || "all"}
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  status: value,
                  offset: 0,
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 flex-1 min-w-[250px]">
              <Input
                placeholder="Search by card code..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button variant="secondary" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedCount > 0 && (
        <Card className="bg-primary/5 border-primary">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedCount} card{selectedCount > 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleBulkBalanceCheck}
                  disabled={bulkCheckBalances.isPending}
                >
                  {bulkCheckBalances.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Check Balances
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setBulkDeleteConfirmOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRowSelection({})}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Individual Cards</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleBulkBalanceCheck}
                disabled={bulkCheckBalances.isPending || !filters.brandId}
              >
                {bulkCheckBalances.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Check All Balances
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
          <CardDescription>
            {cardsLoading ? "Loading..." : `Showing ${cardsData?.cards?.length || 0} cards`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map(row => (
                    <TableRow 
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      {cardsLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading cards...
                        </div>
                      ) : (
                        <div className="text-muted-foreground">
                          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          No cards found. Try adjusting your filters.
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between py-4">
            <div className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Detail Dialog */}
      <IndividualCardDetailDialog
        cardId={selectedCardId}
        open={!!selectedCardId}
        onOpenChange={(open) => !open && setSelectedCardId(null)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gift Card?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The gift card will be permanently removed from inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteCard.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} Gift Cards?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. {selectedCount} gift card{selectedCount > 1 ? "s" : ""} will be permanently removed from inventory.
              Note: Cards that are assigned or delivered cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {bulkDeleteCards.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete {selectedCount} Cards
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

