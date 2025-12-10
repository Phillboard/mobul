import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Printer, Download, Copy, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from "@core/auth/AuthProvider";

export default function GiftCardReveal() {
  const { campaignId, redemptionToken } = useParams();
  const { hasRole } = useAuth();
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ["redemption", redemptionToken],
    queryFn: async () => {
      // Fetch redemption record (NEW SYSTEM)
      const { data: redemptionData, error: redemptionError } = await supabase
        .from("gift_card_redemptions")
        .select(`
          *,
          gift_card:gift_cards(
            *,
            pool:gift_card_pools(*)
          ),
          brand:gift_card_brands(*),
          campaign:campaigns(*),
          recipient:recipients(*)
        `)
        .eq("redemption_code", redemptionToken)
        .single();

      if (redemptionError) {
        // If not found in new system, try legacy system for backwards compatibility
        const { data: legacyData, error: legacyError } = await supabase
          .from("gift_card_redemptions_legacy")
          .select(`
            *,
            recipient:recipients(*),
            delivery:gift_card_deliveries(
              *,
              gift_card:gift_cards(
                *,
                pool:gift_card_pools(*)
              )
            ),
            campaign:campaigns(*)
          `)
          .eq("id", redemptionToken)
          .single();

        if (legacyError) throw new Error("Redemption code not found");
        return legacyData;
      }

      // Mark as delivered if still provisioned
      if (redemptionData.status === "provisioned") {
        await supabase
          .from("gift_card_redemptions")
          .update({
            status: "delivered",
            delivered_at: new Date().toISOString(),
          })
          .eq("id", redemptionData.id);

        // Log event
        await supabase.from("events").insert({
          campaign_id: redemptionData.campaign_id,
          recipient_id: redemptionData.recipient_id,
          event_type: "gift_card_viewed",
          source: "landing_page",
          metadata: {
            redemption_id: redemptionData.id,
            source: redemptionData.provisioning_source
          }
        });
      }

      return redemptionData;
    },
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: "Gift card code copied to clipboard",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your gift card...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>
              This gift card link is invalid or has expired. Please contact support.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const giftCard = data.gift_card;
  const pool = giftCard?.pool;
  const brand = data.brand;

  // Handle redemption failures
  if (data.status === "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-center">Redemption Failed</CardTitle>
            <CardDescription className="text-center">
              We were unable to provision your gift card. This could be due to:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>Campaign budget exhausted</li>
              <li>Insufficient credit</li>
              <li>System maintenance</li>
            </ul>
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription>
                Please contact campaign support. Your redemption code: <strong>{data.redemption_code}</strong>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!giftCard || !pool) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Not Available</CardTitle>
            <CardDescription>
              This gift card is not yet available. Please try again later or contact support.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-950 flex items-center justify-center p-4">
      {hasRole("admin") && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white p-2 text-center z-50 text-sm font-medium">
          ⚡ Admin Preview Mode
        </div>
      )}

      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl">Congratulations!</CardTitle>
            <CardDescription className="text-lg mt-2">
              Your ${data.denomination} {brand?.brand_name || pool.provider} Gift Card
            </CardDescription>
          </div>
          {data.provisioning_source && (
            <div className="text-xs text-muted-foreground">
              Provisioned via {data.provisioning_source === "csv" ? "Inventory" : "API"}
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Gift Card Display */}
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl p-8 text-white shadow-xl">
            <div className="text-center space-y-4">
              <div className="text-sm opacity-90 uppercase tracking-wide">
                {brand?.brand_name || pool.provider} Gift Card
              </div>
              <div className="text-6xl font-bold">${data.denomination}</div>

              {giftCard.card_code && (
                <div className="mt-6 bg-white/20 backdrop-blur rounded-lg p-4">
                  <div className="text-xs opacity-90 mb-2 uppercase tracking-wide">
                    Redemption Code
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="text-3xl font-mono tracking-wider font-bold">
                      {giftCard.card_code}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20"
                      onClick={() => handleCopyCode(giftCard.card_code)}
                    >
                      <Copy className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}

              {giftCard.card_number && (
                <div className="mt-4 bg-white/20 backdrop-blur rounded-lg p-3">
                  <div className="text-xs opacity-90 mb-1 uppercase tracking-wide">
                    Card Number
                  </div>
                  <div className="text-xl font-mono tracking-wide">
                    {giftCard.card_number}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <Alert>
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-semibold text-base">How to use your gift card:</p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Save or screenshot this page for your records</li>
                  <li>Visit {brand?.brand_name || pool.provider} website or store</li>
                  <li>Enter the code above at checkout</li>
                  {giftCard.expiration_date && (
                    <li className="text-orange-600 dark:text-orange-400 font-medium">
                      ⏰ Valid until {format(new Date(giftCard.expiration_date), "MMM dd, yyyy")}
                    </li>
                  )}
                </ol>
                {data.profit && hasRole("admin") && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                    <strong>Admin Info:</strong> Cost: ${data.cost_basis} | Charged: ${data.amount_charged} | Profit: ${data.profit.toFixed(2)}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {/* Save Options */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                // Simple screenshot functionality
                toast({
                  title: "Tip",
                  description: "Use your device's screenshot function to save this",
                });
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Save as Image
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            This gift card was delivered as part of campaign: {data.campaign?.name}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
