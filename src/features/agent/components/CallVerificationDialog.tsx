import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@shared/hooks';
import { supabase } from '@core/services/supabase';
import { CheckCircle2, AlertCircle, User, MapPin, Phone } from "lucide-react";

interface CallVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onVerified: (recipient: any) => void;
}

export function CallVerificationDialog({
  open,
  onOpenChange,
  campaignId,
  onVerified
}: CallVerificationDialogProps) {
  const { toast } = useToast();
  const [uniqueCode, setUniqueCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [recipient, setRecipient] = useState<any>(null);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'found' | 'not_found'>('pending');

  const handleVerify = async () => {
    if (!uniqueCode) {
      toast({
        title: "Code Required",
        description: "Please enter the unique code from the mailer",
        variant: "destructive"
      });
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('pending');

    try {
      // Look up recipient by unique code (token)
      const { data, error } = await supabase
        .from('recipients')
        .select('*')
        .eq('token', uniqueCode.toUpperCase())
        .eq('audience_id', (
          await supabase
            .from('campaigns')
            .select('audience_id')
            .eq('id', campaignId)
            .single()
        ).data?.audience_id)
        .single();

      if (error || !data) {
        setVerificationStatus('not_found');
        toast({
          title: "Code Not Found",
          description: "The unique code was not found in this campaign",
          variant: "destructive"
        });
        return;
      }

      setRecipient(data);
      setVerificationStatus('found');
      
      toast({
        title: "Caller Located",
        description: "Verify the caller's information before proceeding"
      });
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
      setVerificationStatus('not_found');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirmIdentity = () => {
    if (recipient) {
      onVerified(recipient);
      onOpenChange(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setUniqueCode("");
    setRecipient(null);
    setVerificationStatus('pending');
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Verify Caller Identity</DialogTitle>
          <DialogDescription>
            Enter the unique code from the mailer to look up the caller
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="unique-code">Unique Code</Label>
            <div className="flex gap-2">
              <Input
                id="unique-code"
                placeholder="Enter code from mailer"
                value={uniqueCode}
                onChange={(e) => setUniqueCode(e.target.value.toUpperCase())}
                disabled={isVerifying || verificationStatus === 'found'}
                className="uppercase"
              />
              <Button 
                onClick={handleVerify} 
                disabled={!uniqueCode || isVerifying || verificationStatus === 'found'}
              >
                {isVerifying ? "Verifying..." : "Verify"}
              </Button>
            </div>
          </div>

          {verificationStatus === 'not_found' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Code not found. Please verify the code with the caller.
              </AlertDescription>
            </Alert>
          )}

          {verificationStatus === 'found' && recipient && (
            <Alert className="border-green-500/20 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-500">
                Caller located! Verify the following information with the caller:
              </AlertDescription>
            </Alert>
          )}

          {recipient && (
            <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">Name</div>
                  <div className="text-sm text-muted-foreground">
                    {recipient.first_name} {recipient.last_name}
                  </div>
                </div>
              </div>

              {recipient.address1 && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">Address (Last 4)</div>
                    <div className="text-sm text-muted-foreground">
                      ...{recipient.zip?.slice(-4) || 'N/A'}
                    </div>
                  </div>
                </div>
              )}

              {recipient.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">Phone</div>
                    <div className="text-sm text-muted-foreground">
                      {recipient.phone}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-border">
                <Badge variant="outline" className="text-xs">
                  Code: {recipient.token}
                </Badge>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {recipient && (
            <Button onClick={handleConfirmIdentity}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirm Identity
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
