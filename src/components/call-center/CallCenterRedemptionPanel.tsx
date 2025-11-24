import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Gift, Copy, RotateCcw, CheckCircle, AlertCircle, User, Mail, Phone, MessageSquare, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { PoolInventoryWidget } from "./PoolInventoryWidget";
import { ResendSmsButton } from "./ResendSmsButton";

interface RecipientData {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  status: string;
  audienceName?: string;
  campaignName?: string;
}

interface GiftCardData {
  id: string;
  card_code: string;
  card_number: string | null;
  card_value?: number;
  expiration_date: string | null;
  gift_card_pools?: {
    pool_name: string;
    card_value: number;
    provider: string | null;
    gift_card_brands?: {
      brand_name: string;
      logo_url: string | null;
      balance_check_url: string | null;
    } | null;
  };
}

interface RedemptionResult {
  success: boolean;
  alreadyRedeemed: boolean;
  recipient: RecipientData;
  giftCard: GiftCardData;
  redeemedAt?: string;
}

export function CallCenterRedemptionPanel() {
  const { toast } = useToast();
  const [redemptionCode, setRedemptionCode] = useState("");
  const [result, setResult] = useState<RedemptionResult | null>(null);

  const provisionMutation = useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.functions.invoke("provision-gift-card-for-call-center", {
        body: { redemptionCode: code }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.message || data.error);
      return data as RedemptionResult;
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.alreadyRedeemed) {
        toast({
          title: "Already Redeemed",
          description: "This code was already used. Card details shown below.",
        });
      } else {
        toast({
          title: "Gift Card Provisioned",
          description: "Successfully redeemed gift card for customer.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Redemption Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send SMS with card details
  const sendSmsMutation = useMutation({
    mutationFn: async () => {
      if (!result?.giftCard || !result?.recipient.phone) {
        throw new Error("Missing card or phone number");
      }

      const brand = result.giftCard.gift_card_pools?.gift_card_brands;
      const pool = result.giftCard.gift_card_pools;
      const value = pool?.card_value || result.giftCard.card_value || 0;

      const { data, error } = await supabase.functions.invoke("send-gift-card-sms", {
        body: {
          phone: result.recipient.phone,
          message: `Your ${brand?.brand_name || pool?.provider || "Gift Card"} is ready!\n\nCode: ${result.giftCard.card_code}\n${result.giftCard.card_number ? `Card: ${result.giftCard.card_number}\n` : ""}Value: $${value}\n\nRedeem at the store`,
          recipientId: result.recipient.id,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "SMS Sent",
        description: "Card details sent to customer's phone successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "SMS Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLookup = () => {
    if (!redemptionCode.trim()) {
      toast({
        title: "Code Required",
        description: "Please enter a redemption code",
        variant: "destructive",
      });
      return;
    }
    provisionMutation.mutate(redemptionCode.trim().toUpperCase());
  };

  const handleStartNew = () => {
    setRedemptionCode("");
    setResult(null);
  };

  const copyAllDetails = () => {
    if (!result?.giftCard) return;

    const card = result.giftCard;
    const pool = card.gift_card_pools;
    const brand = pool?.gift_card_brands;
    const value = pool?.card_value || card.card_value || 0;

    const details = `${brand?.brand_name || pool?.provider || "Gift Card"}
Value: $${value.toFixed(2)}
Code: ${card.card_code}
${card.card_number ? `Card Number: ${card.card_number}` : ""}
${card.expiration_date ? `Expires: ${new Date(card.expiration_date).toLocaleDateString()}` : ""}`;

    navigator.clipboard.writeText(details);
    toast({
      title: "Copied!",
      description: "All gift card details copied to clipboard",
    });
  };

  const brand = result?.giftCard.gift_card_pools?.gift_card_brands;
  const pool = result?.giftCard.gift_card_pools;
  const value = pool?.card_value || result?.giftCard.card_value || 0;

  const poolId = result?.giftCard.gift_card_pools ? result.giftCard.id : null;

  return (
    <div className="space-y-6">
      {/* Inventory Widget */}
      {poolId && <PoolInventoryWidget poolId={poolId} />}
      
      {/* Code Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Customer Redemption Code
          </CardTitle>
          <CardDescription>
            Enter the code provided by the customer to provision their gift card
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Redemption Code</Label>
            <div className="flex gap-2">
              <Input
                id="code"
                value={redemptionCode}
                onChange={(e) => setRedemptionCode(e.target.value.toUpperCase())}
                placeholder="Enter code (e.g., ABC-1234)"
                className="text-lg font-mono uppercase"
                disabled={!!result}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !result) {
                    handleLookup();
                  }
                }}
              />
              {!result ? (
                <Button
                  onClick={handleLookup}
                  disabled={provisionMutation.isPending || !redemptionCode.trim()}
                  className="min-w-[120px]"
                >
                  {provisionMutation.isPending ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Look Up
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={handleStartNew} variant="outline" className="min-w-[120px]">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Start New
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Verification Card */}
      {result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Details
                {result.alreadyRedeemed && (
                  <Badge variant="secondary">Previously Redeemed</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Name</div>
                    <div className="font-medium">
                      {result.recipient.firstName} {result.recipient.lastName}
                    </div>
                  </div>
                </div>

                {result.recipient.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Phone</div>
                      <div className="font-medium">{result.recipient.phone}</div>
                    </div>
                  </div>
                )}

                {result.recipient.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Email</div>
                      <div className="font-medium">{result.recipient.email}</div>
                    </div>
                  </div>
                )}

                {result.recipient.campaignName && (
                  <div className="flex items-start gap-3">
                    <Gift className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Campaign</div>
                      <div className="font-medium">{result.recipient.campaignName}</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Gift Card Display */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Gift Card Ready
                </span>
                <Button onClick={copyAllDetails} variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All
                </Button>
              </CardTitle>
              <CardDescription>
                {result.alreadyRedeemed
                  ? `Redeemed on ${result.redeemedAt ? new Date(result.redeemedAt).toLocaleDateString() : "earlier"}`
                  : "Share these details with the customer"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Brand and Value */}
              <div className="text-center space-y-2">
                {brand?.logo_url && (
                  <img
                    src={brand.logo_url}
                    alt={brand.brand_name}
                    className="h-12 mx-auto object-contain"
                  />
                )}
                <div className="text-4xl font-bold text-primary">
                  ${value.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {brand?.brand_name || pool?.provider || "Gift Card"}
                </div>
              </div>

              <Separator />

              {/* Card Details */}
              <div className="space-y-3">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Gift Card Code</div>
                  <div className="font-mono text-xl font-bold tracking-wider">
                    {result.giftCard.card_code}
                  </div>
                </div>

                {result.giftCard.card_number && (
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Card Number</div>
                    <div className="font-mono text-lg font-semibold">
                      {result.giftCard.card_number}
                    </div>
                  </div>
                )}

                {result.giftCard.expiration_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Expires: {new Date(result.giftCard.expiration_date).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {brand?.balance_check_url && (
                  <div className="pt-2">
                    <a
                      href={brand.balance_check_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Check balance online →
                    </a>
                  </div>
                )}
              </div>

              {/* Post-Redemption Actions */}
              {result.recipient.phone && (
                <div className="pt-4 space-y-2">
                  <Button
                    onClick={() => sendSmsMutation.mutate()}
                    disabled={sendSmsMutation.isPending}
                    variant="outline"
                    className="w-full"
                  >
                    {sendSmsMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="mr-2 h-4 w-4" />
                    )}
                    Send Card via SMS
                  </Button>
                  
                  <ResendSmsButton
                    giftCardId={result.giftCard.id}
                    recipientId={result.recipient.id}
                    recipientPhone={result.recipient.phone}
                    giftCardCode={result.giftCard.card_code}
                    giftCardValue={value}
                    brandName={brand?.brand_name || pool?.provider}
                    cardNumber={result.giftCard.card_number || undefined}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
