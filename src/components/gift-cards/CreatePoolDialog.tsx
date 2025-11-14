import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CreatePoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreatePool: (pool: { 
    pool_name: string; 
    card_value: number; 
    provider: string;
    client_id: string;
  }) => void;
  clientId: string;
}

const PROVIDERS = [
  "Visa",
  "Mastercard",
  "Amazon",
  "Target",
  "Walmart",
  "Starbucks",
  "Gas Station",
  "Other"
];

export function CreatePoolDialog({
  open,
  onOpenChange,
  onCreatePool,
  clientId,
}: CreatePoolDialogProps) {
  const [poolName, setPoolName] = useState("");
  const [cardValue, setCardValue] = useState("");
  const [provider, setProvider] = useState("");

  const handleCreate = () => {
    if (!poolName || !cardValue || !provider) return;

    onCreatePool({
      pool_name: poolName,
      card_value: parseFloat(cardValue),
      provider,
      client_id: clientId,
    });

    // Reset form
    setPoolName("");
    setCardValue("");
    setProvider("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Gift Card Pool</DialogTitle>
          <DialogDescription>
            Create a new pool to organize gift cards by type and value
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pool-name">Pool Name</Label>
            <Input
              id="pool-name"
              placeholder="e.g., Visa $5 Rewards"
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="card-value">Card Value ($)</Label>
            <Input
              id="card-value"
              type="number"
              step="0.01"
              min="0"
              placeholder="5.00"
              value={cardValue}
              onChange={(e) => setCardValue(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!poolName || !cardValue || !provider}
          >
            Create Pool
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
