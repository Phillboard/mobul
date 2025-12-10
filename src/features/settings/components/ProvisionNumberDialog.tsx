import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { supabase } from '@core/services/supabase';
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ProvisionNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ProvisionNumberDialog({
  open,
  onOpenChange,
  onSuccess,
}: ProvisionNumberDialogProps) {
  const [areaCode, setAreaCode] = useState("");
  const [friendlyName, setFriendlyName] = useState("");
  const [forwardToNumber, setForwardToNumber] = useState("");
  const [isProvisioning, setIsProvisioning] = useState(false);

  const handleProvision = async () => {
    if (areaCode && areaCode.length !== 3) {
      toast.error("Area code must be 3 digits");
      return;
    }

    setIsProvisioning(true);

    try {
      const { data, error } = await supabase.functions.invoke('provision-twilio-number', {
        body: {
          areaCode: areaCode || undefined,
          friendlyName: friendlyName || undefined,
          forwardToNumber: forwardToNumber || undefined,
        },
      });

      if (error) throw error;

      toast.success(`Successfully provisioned ${data.phoneNumber.phone_number}`);
      onSuccess();
      onOpenChange(false);
      setAreaCode("");
      setFriendlyName("");
      setForwardToNumber("");
    } catch (error: any) {
      console.error('Provision error:', error);
      toast.error(`Failed to provision number: ${error.message}`);
    } finally {
      setIsProvisioning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Provision New Phone Number</DialogTitle>
          <DialogDescription>
            Purchase a new phone number from Twilio for call tracking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="areaCode">Area Code (Optional)</Label>
            <Input
              id="areaCode"
              placeholder="e.g., 310, 415, 917"
              value={areaCode}
              onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
              maxLength={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty for any available number
            </p>
          </div>

          <div>
            <Label htmlFor="friendlyName">Friendly Name (Optional)</Label>
            <Input
              id="friendlyName"
              placeholder="e.g., Main Campaign Line"
              value={friendlyName}
              onChange={(e) => setFriendlyName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="forwardTo">Forward Calls To (Optional)</Label>
            <Input
              id="forwardTo"
              placeholder="e.g., +1 (555) 123-4567"
              value={forwardToNumber}
              onChange={(e) => setForwardToNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Can be configured later
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProvisioning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProvision}
              disabled={isProvisioning}
            >
              {isProvisioning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Provisioning...
                </>
              ) : (
                'Provision Number'
              )}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground border-t pt-4">
            <p className="font-medium mb-1">Pricing:</p>
            <p>• Local phone number: $1.15/month</p>
            <p>• Incoming calls: $0.0085/minute</p>
            <p>• Outgoing calls: $0.013/minute</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
