/**
 * AdminUploadDialog - Enhanced CSV Upload for Brand-Denomination System
 * Uploads gift cards directly to gift_card_inventory table (no pools)
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, AlertCircle, CheckCircle, FileText, DollarSign } from "lucide-react";
import { useInventoryUpload, parseCSV } from "@/hooks/useInventoryUpload";
import { useDenominationInventory } from "@/hooks/useGiftCardDenominations";

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

  const { data: inventory } = useDenominationInventory(brandId, denomination);
  const uploadMutation = useInventoryUpload();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError("");

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

        setCards(parsedCards);
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
              Format: card_code, card_number (optional), expiration_date (optional)
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
                <AlertDescription>
                  Found {cards.length} gift cards in file
                </AlertDescription>
              </Alert>
            )}
            {parseError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}
          </div>

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
                  <li>First column: Card code (required)</li>
                  <li>Second column: Card number (optional)</li>
                  <li>Third column: Expiration date (optional, YYYY-MM-DD)</li>
                  <li>Header row is optional and will be skipped if detected</li>
                  <li>Duplicate card codes will be skipped automatically</li>
                </ul>
                <p className="text-xs mt-2">
                  Example: <code className="bg-background px-1 py-0.5 rounded">ABC123,1234567890,2025-12-31</code>
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
