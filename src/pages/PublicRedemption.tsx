import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Gift, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GiftCardDisplay } from "@/components/ace-forms/GiftCardDisplay";
import { cn } from "@/lib/utils/utils";

/**
 * Public Redemption Page - No authentication required
 * Customer enters cell phone + unique code to claim gift card
 * URL: /redeem-gift-card?code=XXX&campaign=YYY
 */
export default function PublicRedemption() {
  const [searchParams] = useSearchParams();
  const [cellPhone, setCellPhone] = useState("");
  const [redemptionCode, setRedemptionCode] = useState(searchParams.get("code") || "");
  const [campaignId, setCampaignId] = useState(searchParams.get("campaign") || "");
  const [isFlipped, setIsFlipped] = useState(false);
  const [redemption, setRedemption] = useState<any>(null);

  // Format phone number as user types (auto-format to (XXX) XXX-XXXX)
  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/\D/g, "");
    const phoneNumberLength = phoneNumber.length;

    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setCellPhone(formatted);
  };

  const redeemMutation = useMutation({
    mutationFn: async () => {
      if (!redemptionCode || !campaignId) {
        throw new Error("Missing redemption code or campaign ID");
      }

      // Call the edge function to redeem
      const { data, error } = await supabase.functions.invoke("redeem-customer-code", {
        body: {
          redemptionCode: redemptionCode.trim().toUpperCase(),
          campaignId: campaignId.trim(),
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Redemption failed");

      return data;
    },
    onSuccess: (data) => {
      setRedemption(data.giftCard);
      // Flip to show gift card after a brief delay
      setTimeout(() => setIsFlipped(true), 100);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    redeemMutation.mutate();
  };

  // Flip animation container
  const containerClasses = cn(
    "transition-all duration-700 transform-gpu",
    isFlipped && "scale-105"
  );

  if (isFlipped && redemption) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className={containerClasses}>
          <Card className="max-w-md w-full shadow-2xl">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-2">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-500" />
              </div>
              <CardTitle className="text-2xl">Congratulations!</CardTitle>
              <CardDescription>Your gift card is ready to use</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <GiftCardDisplay redemption={redemption} embedMode={false} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Gift className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">Claim Your Gift Card</CardTitle>
            <CardDescription className="mt-2">
              Enter your information below to receive your reward
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Cell Phone Input */}
            <div className="space-y-2">
              <Label htmlFor="cellPhone">Cell Phone Number</Label>
              <Input
                id="cellPhone"
                type="tel"
                placeholder="(555) 123-4567"
                value={cellPhone}
                onChange={handlePhoneChange}
                maxLength={14}
                required
                className="text-lg"
                disabled={redeemMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Enter the phone number you used when calling
              </p>
            </div>

            {/* Redemption Code Input */}
            <div className="space-y-2">
              <Label htmlFor="redemptionCode">Unique Code</Label>
              <Input
                id="redemptionCode"
                type="text"
                placeholder="Enter your code"
                value={redemptionCode}
                onChange={(e) => setRedemptionCode(e.target.value.toUpperCase())}
                className="text-lg font-mono text-center tracking-wider"
                maxLength={20}
                required
                disabled={redeemMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Find this code on your mailer
              </p>
            </div>

            {/* Campaign ID (hidden from user but included for tracking) */}
            {!searchParams.get("campaign") && (
              <div className="space-y-2">
                <Label htmlFor="campaignId">Campaign ID</Label>
                <Input
                  id="campaignId"
                  type="text"
                  placeholder="Campaign ID"
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="text-sm"
                  disabled={redeemMutation.isPending}
                />
              </div>
            )}

            {/* Error Display */}
            {redeemMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {redeemMutation.error instanceof Error
                    ? redeemMutation.error.message
                    : "Failed to redeem gift card. Please check your code and try again."}
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full text-lg py-6"
              disabled={
                redeemMutation.isPending ||
                !redemptionCode ||
                !cellPhone ||
                cellPhone.replace(/\D/g, "").length < 10
              }
            >
              {redeemMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Claiming Your Gift Card...
                </>
              ) : (
                <>
                  <Gift className="h-5 w-5 mr-2" />
                  Claim Gift Card
                </>
              )}
            </Button>

            {/* Help Text */}
            <div className="text-center text-sm text-muted-foreground mt-6">
              <p>Need help? Contact customer support.</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

