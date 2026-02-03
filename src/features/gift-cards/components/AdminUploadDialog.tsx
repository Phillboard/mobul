/**
 * AdminUploadDialog - Enhanced CSV Upload for Brand-Denomination System
 * Uploads gift cards directly to gift_card_inventory table (no pools)
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Upload, AlertCircle, CheckCircle, FileText, DollarSign, Eye, AlertTriangle } from "lucide-react";
import { useInventoryUpload, parseCSV } from '@/features/gift-cards/hooks';
import { useDenominationInventory } from '@/features/gift-cards/hooks';

interface AdminUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId?: string;
  brandName?: string;
  denomination?: number;
  logoUrl?: string;
}

export function AdminUploadDialog({
  open,
  onOpenChange,
  brandId,
  brandName,
  denomination,
  logoUrl,
}: AdminUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [costBasis, setCostBasis] = useState("");
  const [cards, setCards] = useState<any[]>([]);
  const [parseError, setParseError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const { data: inventory } = useDenominationInventory(brandId, denomination);
  const uploadMutation = useInventoryUpload();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError("");
    setDuplicateWarning(null);
    setShowPreview(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsedCards = parseCSV(content);

        if (parsedCards.length === 0) {
          setParseError("No valid cards found in file");
          setCards([]);
          return;
        }

        // Check for duplicates within the file
        const seen = new Set<string>();
        const duplicatesInFile: string[] = [];
        const uniqueCards: any[] = [];

        parsedCards.forEach((card: any) => {
          const code = card.card_code?.toLowerCase();
          if (seen.has(code)) {
            duplicatesInFile.push(card.card_code);
          } else {
            seen.add(code);
            uniqueCards.push(card);
          }
        });

        if (duplicatesInFile.length > 0) {
          setDuplicateWarning(`${duplicatesInFile.length} duplicate card(s) found in file and will be skipped`);
        }

        setCards(uniqueCards);
        setShowPreview(true); // Auto-show preview when file is loaded
      } catch (error) {
        setParseError("Failed to parse CSV file");
        setCards([]);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleUpload = async () => {
    if (!brandId || !denomination || cards.length === 0) return;

    await uploadMutation.mutateAsync({
      brandId,
      denomination,
      cards,
      costBasis: costBasis ? parseFloat(costBasis) : undefined,
    });

    // Reset form
    setFile(null);
    setCards([]);
    setCostBasis("");
    onOpenChange(false);
  };

  const handleReset = () => {
    setFile(null);
    setCards([]);
    setCostBasis("");
    setParseError("");
    setShowPreview(false);
    setDuplicateWarning(null);
  };

  // Helper to mask card code for display
  const maskCardCode = (code: string) => {
    if (!code || code.length < 6) return code;
    return code.slice(0, 3) + "***" + code.slice(-3);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) handleReset();
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CSV Gift Cards
            </div>
          </DialogTitle>
          <DialogDescription>
            Upload gift card codes to CSV inventory (provisioned before Tillo API)
          </DialogDescription>
        </DialogHeader>

        {/* Brand & Denomination Display */}
        {brandId && denomination && (
          <Card className="p-4 bg-muted/30">
            <div className="flex items-center gap-3">
              {logoUrl && (
                <img src={logoUrl} alt={brandName} className="h-10 w-auto object-contain" />
              )}
              <div className="flex-1">
                <p className="font-semibold text-lg">{brandName}</p>
                <p className="text-sm text-muted-foreground">
                  Denomination: <span className="font-medium">${denomination}</span>
                </p>
                {inventory && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Current CSV inventory: {inventory.available} available • {inventory.assigned} assigned • {inventory.delivered} delivered
                  </p>
                )}
              </div>
              <Badge variant="outline" className="text-lg px-3 py-1">
                ${denomination}
              </Badge>
            </div>
          </Card>
        )}

        <div className="space-y-6">
          {/* CSV File Upload */}
          <div className="space-y-2">
            <Label htmlFor="csv-file" className="text-base font-semibold">
              CSV File *
            </Label>
            <p className="text-sm text-muted-foreground">
              Format: card_code, card_number (optional), expiration_date (optional), cost (optional)
            </p>
            <Input
              id="csv-file"
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {file && cards.length > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Found {cards.length} unique gift cards in file</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    className="h-7"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    {showPreview ? "Hide" : "Preview"}
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {duplicateWarning && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{duplicateWarning}</AlertDescription>
              </Alert>
            )}
            {parseError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* CSV Preview Table */}
          {showPreview && cards.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  <Eye className="h-4 w-4 inline mr-2" />
                  Preview ({cards.length} cards)
                </Label>
                <Badge variant="outline" className="text-xs">
                  {cards.length > 10 ? `Showing first 10 of ${cards.length}` : `${cards.length} cards`}
                </Badge>
              </div>
              <Card className="border">
                <ScrollArea className="h-[200px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Card Code</TableHead>
                        <TableHead>Card Number</TableHead>
                        <TableHead>Expiration</TableHead>
                        <TableHead>Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cards.slice(0, 10).map((card, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {maskCardCode(card.card_code)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {card.card_number || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {card.expiration_date || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {card.cost ? `$${card.cost}` : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </Card>
              {cards.length > 10 && (
                <p className="text-xs text-muted-foreground text-center">
                  + {cards.length - 10} more cards not shown in preview
                </p>
              )}
            </div>
          )}

          {/* Cost Basis */}
          <div className="space-y-2">
            <Label htmlFor="cost-basis" className="text-base font-semibold">
              Cost Basis <span className="text-muted-foreground text-sm">(optional)</span>
            </Label>
            <p className="text-sm text-muted-foreground">
              What you paid per card (used for profit tracking)
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="cost-basis"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={costBasis}
                onChange={(e) => setCostBasis(e.target.value)}
                className="pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This will update the cost basis for this denomination if provided
            </p>
          </div>

          {/* CSV Format Info */}
          <Card className="p-4 bg-muted/30">
            <div className="flex items-start gap-2">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium">CSV Format Guidelines:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li><strong>card_code</strong> - Required, must be unique</li>
                  <li><strong>card_number</strong> - Optional, numeric identifier</li>
                  <li><strong>expiration_date</strong> - Optional, format: YYYY-MM-DD</li>
                  <li><strong>cost</strong> - Optional, cost per card for profit tracking</li>
                  <li>Header row is recommended and will be auto-detected</li>
                </ul>
                <Alert className="mt-2 py-2">
                  <AlertTriangle className="h-3 w-3" />
                  <AlertDescription className="text-xs">
                    Duplicate card codes (in file or already in system) will be automatically skipped
                  </AlertDescription>
                </Alert>
                <p className="text-xs mt-2">
                  Example: <code className="bg-background px-1 py-0.5 rounded">card_code,card_number,expiration_date,cost</code>
                  <br />
                  <code className="bg-background px-1 py-0.5 rounded">ABC123,1234567890,2025-12-31,23.50</code>
                </p>
              </div>
            </div>
          </Card>

          {/* Provisioning Info */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-2">
              <DollarSign className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Provisioning Strategy</p>
                <p className="text-muted-foreground mt-1">
                  The system will use CSV inventory first. When CSV runs out, it automatically falls back to Tillo API purchases.
                  Custom pricing applies to both sources.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReset} disabled={uploadMutation.isPending}>
            Reset
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploadMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={
              !brandId ||
              !denomination ||
              !file ||
              cards.length === 0 ||
              uploadMutation.isPending
            }
          >
            {uploadMutation.isPending ? "Uploading..." : `Upload ${cards.length} Cards`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
