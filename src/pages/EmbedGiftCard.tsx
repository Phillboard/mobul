import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Gift, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { callPublicEdgeFunction } from "@core/api/client";
import { Endpoints } from "@core/api/endpoints";
import { toast } from "sonner";
import { z } from "zod";

const codeSchema = z.string()
  .trim()
  .min(4, "Code must be at least 4 characters")
  .max(50, "Code must be less than 50 characters")
  .regex(/^[A-Za-z0-9-]+$/, "Code can only contain letters, numbers, and hyphens");

export default function EmbedGiftCard() {
  const { campaignId } = useParams();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [giftCard, setGiftCard] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Get optional styling params
  const primaryColor = searchParams.get("primary") || "#3b82f6";
  const accentColor = searchParams.get("accent") || "#10b981";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGiftCard(null);

    // Validate input
    try {
      codeSchema.parse(code);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    setIsValidating(true);

    try {
      const data = await callPublicEdgeFunction<{
        valid: boolean;
        message?: string;
        giftCard?: any;
      }>(
        Endpoints.giftCards.redeemEmbed,
        {
          code: code.trim().toUpperCase(),
        }
      );

      if (data.valid) {
        setGiftCard(data.giftCard);
      } else {
        setError(data.message || "Invalid code. Please check and try again.");
      }
    } catch (err: unknown) {
      console.error("Validation error:", err);
      setError("Failed to validate code. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#f9fafb" }}>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor + "20" }}>
            <Gift className="h-6 w-6" style={{ color: primaryColor }} />
          </div>
          <CardTitle className="text-2xl">Claim Your Gift Card</CardTitle>
          <CardDescription>Enter your redemption code below</CardDescription>
        </CardHeader>
        <CardContent>
          {!giftCard ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Enter your code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  className="text-center text-lg font-mono"
                  maxLength={50}
                  disabled={isValidating}
                />
                {error && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={!code.trim() || isValidating}
                style={{ backgroundColor: primaryColor }}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  "Claim Gift Card"
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full flex items-center justify-center" style={{ backgroundColor: accentColor + "20" }}>
                <CheckCircle className="h-8 w-8" style={{ color: accentColor }} />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Congratulations!</h3>
                <p className="text-muted-foreground mb-4">
                  Your gift card has been revealed
                </p>
              </div>
              <Card className="bg-muted">
                <CardContent className="pt-6 space-y-2">
                  <div className="text-sm text-muted-foreground">Gift Card Code</div>
                  <div className="text-2xl font-mono font-bold">{giftCard.card_code}</div>
                  {giftCard.card_number && (
                    <>
                      <div className="text-sm text-muted-foreground mt-4">Card Number</div>
                      <div className="text-lg font-mono">{giftCard.card_number}</div>
                    </>
                  )}
                  <div className="text-sm text-muted-foreground mt-4">Value</div>
                  <div className="text-lg font-semibold">${giftCard.value}</div>
                  {giftCard.provider && (
                    <>
                      <div className="text-sm text-muted-foreground mt-4">Provider</div>
                      <div className="text-lg">{giftCard.provider}</div>
                    </>
                  )}
                </CardContent>
              </Card>
              <p className="text-sm text-muted-foreground">
                Save this code - you'll need it to redeem your gift card!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
