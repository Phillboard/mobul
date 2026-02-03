/**
 * ExpandableInventoryRow - Expandable row showing individual cards for a brand/denomination
 * 
 * Features:
 * - Fetches and displays individual cards when expanded
 * - Multi-select with checkboxes
 * - Bulk delete selected cards
 * - Shows card code (masked), status, and actions
 */

import { useState } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  Trash2, 
  Eye, 
  EyeOff,
  Loader2,
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { 
  useIndividualCards, 
  useBulkDeleteCards,
  type InventoryCard,
} from '@/features/gift-cards/hooks';
import { formatDate, DATE_FORMATS } from '@shared/utils/date';

interface ExpandableInventoryRowProps {
  brandId: string;
  brandName: string;
  logoUrl?: string;
  denomination: number;
  available: number;
  assigned: number;
  delivered: number;
  totalValue: number;
  avgCost?: number;
  costSources?: string[];
  isExpanded: boolean;
  onToggle: () => void;
  onUploadClick: () => void;
}

// Source badge component
function SourceBadge({ source }: { source: string }) {
  const configs: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    csv: { label: "CSV", variant: "outline" },
    tillo_api: { label: "Tillo", variant: "secondary" },
    manual: { label: "Manual", variant: "outline" },
    unknown: { label: "Unknown", variant: "outline" },
  };
  
  const config = configs[source] || configs.unknown;
  
  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
}

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
    <Badge variant={config.variant} className="gap-1 text-xs">
      {config.icon}
      {status}
    </Badge>
  );
}

export function ExpandableInventoryRow({
  brandId,
  brandName,
  logoUrl,
  denomination,
  available,
  assigned,
  delivered,
  totalValue,
  avgCost = 0,
  costSources = [],
  isExpanded,
  onToggle,
  onUploadClick,
}: ExpandableInventoryRowProps) {
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Fetch individual cards when expanded
  const { data: cardsData, isLoading } = useIndividualCards({
    brandId,
    denomination,
    status: "all",
    limit: 100,
  });

  const bulkDeleteCards = useBulkDeleteCards();

  const cards = cardsData?.cards || [];

  // Toggle card selection
  const toggleCardSelection = (cardId: string) => {
    const newSelected = new Set(selectedCards);
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId);
    } else {
      newSelected.add(cardId);
    }
    setSelectedCards(newSelected);
  };

  // Toggle all available cards
  const toggleSelectAll = () => {
    const availableCards = cards.filter(c => c.status === "available");
    if (selectedCards.size === availableCards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(availableCards.map(c => c.id)));
    }
  };

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

  // Handle bulk delete
  const handleBulkDelete = async () => {
    const cardIds = Array.from(selectedCards);
    if (cardIds.length > 0) {
      await bulkDeleteCards.mutateAsync({ cardIds });
      setSelectedCards(new Set());
      setDeleteConfirmOpen(false);
    }
  };

  const availableCards = cards.filter(c => c.status === "available");
  const allAvailableSelected = availableCards.length > 0 && selectedCards.size === availableCards.length;

  return (
    <>
      {/* Summary Row */}
      <TableRow 
        className="cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <TableCell className="w-8">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {logoUrl && (
              <img src={logoUrl} alt={brandName} className="h-6 w-auto object-contain" />
            )}
            <span className="font-medium">{brandName}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline">${denomination}</Badge>
        </TableCell>
        <TableCell className="text-right font-medium">
          <Badge variant={available > 50 ? "default" : available > 10 ? "secondary" : "destructive"}>
            {available}
          </Badge>
        </TableCell>
        <TableCell className="text-right text-muted-foreground">{assigned}</TableCell>
        <TableCell className="text-right text-muted-foreground">{delivered}</TableCell>
        <TableCell className="text-right text-muted-foreground">
          {avgCost > 0 ? `$${avgCost.toFixed(2)}` : "—"}
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            {costSources.length > 0 ? (
              costSources.map((source) => (
                <SourceBadge key={source} source={source} />
              ))
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right font-semibold">${totalValue.toLocaleString()}</TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onUploadClick}
          >
            Add More
          </Button>
        </TableCell>
      </TableRow>

      {/* Expanded Content */}
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={10} className="p-0 bg-muted/30">
            <div className="p-4 space-y-3">
              {/* Bulk Actions Bar */}
              {selectedCards.size > 0 && (
                <div className="flex items-center justify-between bg-primary/10 rounded-lg p-3 border border-primary/20">
                  <span className="text-sm font-medium">
                    {selectedCards.size} card{selectedCards.size > 1 ? "s" : ""} selected
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => setDeleteConfirmOpen(true)}
                      disabled={bulkDeleteCards.isPending}
                    >
                      {bulkDeleteCards.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Delete Selected
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCards(new Set())}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              {/* Cards Table */}
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading cards...
                </div>
              ) : cards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No cards found for this denomination
                </div>
              ) : (
                <div className="rounded-md border bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allAvailableSelected}
                            onCheckedChange={toggleSelectAll}
                            aria-label="Select all available"
                            disabled={availableCards.length === 0}
                          />
                        </TableHead>
                        <TableHead>Card Code</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expiration</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cards.map((card) => (
                        <TableRow key={card.id} data-state={selectedCards.has(card.id) && "selected"}>
                          <TableCell>
                            <Checkbox
                              checked={selectedCards.has(card.id)}
                              onCheckedChange={() => toggleCardSelection(card.id)}
                              aria-label="Select card"
                              disabled={card.status !== "available"}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                {revealedCards.has(card.id) ? card.card_code : maskCardCode(card.card_code)}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleReveal(card.id)}
                                className="h-6 w-6 p-0"
                              >
                                {revealedCards.has(card.id) ? (
                                  <EyeOff className="h-3 w-3" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={card.status} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {card.expiration_date 
                              ? formatDate(card.expiration_date, DATE_FORMATS.SHORT) 
                              : "—"
                            }
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {card.uploaded_at 
                              ? formatDate(card.uploaded_at, DATE_FORMATS.RELATIVE) 
                              : "—"
                            }
                          </TableCell>
                          <TableCell>
                            {card.status === "assigned" && (
                              <Badge variant="outline" className="text-xs">
                                In Use
                              </Badge>
                            )}
                            {card.status === "delivered" && (
                              <Badge variant="outline" className="text-xs">
                                Sent
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Summary Footer */}
              <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
                <span>
                  Showing {cards.length} cards • {availableCards.length} available for selection
                </span>
                {cards.length >= 100 && (
                  <span className="text-xs">
                    Limited to first 100 cards. Use Individual Cards tab for full access.
                  </span>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCards.size} Gift Card{selectedCards.size > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. {selectedCards.size} gift card{selectedCards.size > 1 ? "s" : ""} will be permanently removed from inventory.
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
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

