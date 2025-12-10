import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useToast } from '@shared/hooks';
import { DollarSign, Wallet, CreditCard } from "lucide-react";

interface SellGiftCardsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SellGiftCardsDialog({ open, onOpenChange }: SellGiftCardsDialogProps) {
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedPool, setSelectedPool] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [pricePerCard, setPricePerCard] = useState("");
  const [selling, setSelling] = useState(false);

  const { data: clients } = useQuery({
    queryKey: ["clients-for-sale"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, credits")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: masterPools } = useQuery({
    queryKey: ["master-pools-for-sale"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_pools")
        .select("id, pool_name, card_value, available_cards, provider, gift_card_brands(brand_name)")
        .eq("is_master_pool", true)
        .gt("available_cards", 0)
        .order("pool_name");
      if (error) throw error;
      return data;
    },
  });

  const selectedClientData = clients?.find(c => c.id === selectedClient);
  const selectedPoolData = masterPools?.find(p => p.id === selectedPool);
  const totalAmount = parseInt(quantity || "0") * parseFloat(pricePerCard || "0");
  const costPerCard = selectedPoolData?.card_value || 0;
  const totalCost = parseInt(quantity || "0") * Number(costPerCard);
  const profit = totalAmount - totalCost;

  const handleSell = async () => {
    if (!selectedClient || !selectedPool || !quantity || !pricePerCard) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setSelling(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke("transfer-admin-cards", {
        body: {
          masterPoolId: selectedPool,
          buyerClientId: selectedClient,
          quantity: parseInt(quantity),
          pricePerCard: parseFloat(pricePerCard),
          soldByUserId: user.user?.id,
          notes: `Sold ${parseInt(quantity)} cards at $${parseFloat(pricePerCard)} each`,
        },
      });

      if (error) throw error;

      toast({
        title: "Sale Successful!",
        description: `Transferred ${quantity} cards to client. Profit: $${profit.toFixed(2)}`,
      });

      onOpenChange(false);
      setSelectedClient("");
      setSelectedPool("");
      setQuantity("1");
      setPricePerCard("");
    } catch (error: any) {
      toast({
        title: "Sale Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSelling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sell Gift Cards to Client</DialogTitle>
          <DialogDescription>
            Deduct from client wallet balance and assign gift cards
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Select Client</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a client" />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{client.name}</span>
                      <span className="text-xs text-muted-foreground ml-4">
                        ${client.credits?.toLocaleString() || 0} credits
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClientData && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4" />
                <span>Current Balance: ${selectedClientData.credits?.toLocaleString() || 0}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Select Gift Card Pool</Label>
            <Select value={selectedPool} onValueChange={setSelectedPool}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a pool" />
              </SelectTrigger>
              <SelectContent>
                {masterPools?.map((pool) => (
                  <SelectItem key={pool.id} value={pool.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{pool.gift_card_brands?.brand_name} - {pool.pool_name}</span>
                      <span className="text-xs text-muted-foreground ml-4">
                        ${pool.card_value} • {pool.available_cards} available
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPoolData && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                <span>Card Value: ${selectedPoolData.card_value} • {selectedPoolData.available_cards} cards available</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                max={selectedPoolData?.available_cards || 999}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Number of cards"
              />
            </div>

            <div className="space-y-2">
              <Label>Price Per Card ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={pricePerCard}
                onChange={(e) => setPricePerCard(e.target.value)}
                placeholder="Price in dollars"
              />
            </div>
          </div>

          {/* Summary */}
          {selectedClient && selectedPool && quantity && pricePerCard && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Card Cost (basis):</span>
                <span className="text-muted-foreground">${totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Selling Price:</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-green-600">
                <span>Profit:</span>
                <span>${profit.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Client Current Wallet:</span>
                  <span>${selectedClientData?.credits?.toFixed(2) || 0}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>After Purchase:</span>
                  <span className={
                    (selectedClientData?.credits || 0) >= totalAmount 
                      ? "text-green-600" 
                      : "text-red-600"
                  }>
                    ${((selectedClientData?.credits || 0) - totalAmount).toFixed(2)}
                  </span>
                </div>
              </div>
              {(selectedClientData?.credits || 0) < totalAmount && (
                <p className="text-sm text-destructive">
                  ⚠️ Insufficient wallet balance
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSell}
              disabled={
                !selectedClient ||
                !selectedPool ||
                !quantity ||
                !pricePerCard ||
                (selectedClientData?.credits || 0) < totalAmount ||
                selling
              }
              className="gap-2"
            >
              <DollarSign className="h-4 w-4" />
              {selling ? "Processing..." : `Sell ${quantity} Card${parseInt(quantity) > 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}