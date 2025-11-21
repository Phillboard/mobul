import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useGiftCardBrands } from "@/hooks/useGiftCardBrands";
import { Receipt, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface RecordPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecordPurchaseDialog({ open, onOpenChange }: RecordPurchaseDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: brands } = useGiftCardBrands();
  const { session } = useAuth();
  
  const [brandId, setBrandId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierRef, setSupplierRef] = useState("");
  const [quantity, setQuantity] = useState("");
  const [costPerCard, setCostPerCard] = useState("");
  const [notes, setNotes] = useState("");
  const [recording, setRecording] = useState(false);

  const totalCost = parseInt(quantity || "0") * parseFloat(costPerCard || "0");

  const handleRecord = async () => {
    if (!brandId || !quantity || !costPerCard) {
      toast({
        title: "Missing Information",
        description: "Please fill in brand, quantity, and cost per card",
        variant: "destructive",
      });
      return;
    }

    setRecording(true);
    try {
      const { error } = await supabase.from("admin_gift_card_inventory").insert({
        brand_id: brandId,
        supplier_name: supplierName || null,
        supplier_reference: supplierRef || null,
        quantity: parseInt(quantity),
        cost_per_card: parseFloat(costPerCard),
        total_cost: totalCost,
        notes: notes || null,
        created_by_user_id: session?.user?.id,
        purchase_date: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Purchase Recorded!",
        description: `Recorded purchase of ${quantity} cards for ${totalCost.toFixed(2)}`,
      });

      queryClient.invalidateQueries({ queryKey: ["admin-inventory-purchases"] });
      
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Failed to Record",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRecording(false);
    }
  };

  const resetForm = () => {
    setBrandId("");
    setSupplierName("");
    setSupplierRef("");
    setQuantity("");
    setCostPerCard("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record Inventory Purchase</DialogTitle>
          <DialogDescription>
            Log a new gift card inventory purchase from a supplier
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Brand</Label>
            <Select value={brandId} onValueChange={setBrandId}>
              <SelectTrigger>
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                {brands?.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.brand_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Supplier Name</Label>
              <Input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Tillo, CardCash"
              />
            </div>

            <div className="space-y-2">
              <Label>Supplier Reference/Invoice #</Label>
              <Input
                value={supplierRef}
                onChange={(e) => setSupplierRef(e.target.value)}
                placeholder="Order or invoice number"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Number of cards"
              />
            </div>

            <div className="space-y-2">
              <Label>Cost Per Card ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={costPerCard}
                onChange={(e) => setCostPerCard(e.target.value)}
                placeholder="Cost in dollars"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details about this purchase..."
              rows={3}
            />
          </div>

          {/* Summary */}
          {quantity && costPerCard && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Quantity:</span>
                <span className="font-semibold">{quantity} cards</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Cost per card:</span>
                <span>${parseFloat(costPerCard).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total Cost:</span>
                <span className="text-red-600">${totalCost.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRecord}
              disabled={!brandId || !quantity || !costPerCard || recording}
              className="gap-2"
            >
              <Receipt className="h-4 w-4" />
              {recording ? "Recording..." : "Record Purchase"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}