/**
 * EmbedGiftCard Page
 *
 * Public-facing embedded gift card validation and reveal page.
 * Enhanced UX with:
 * - Step progress indicator (Enter Code → Validating → Revealed)
 * - Animated card reveal with brand logo
 * - Copy-to-clipboard for code and card number
 * - Provider/brand display
 * - Customizable colors via query params (?primary=&accent=)
 */

import { useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Gift, Loader2, CheckCircle, AlertCircle, Copy, Check, CreditCard } from "lucide-react";
import { callPublicEdgeFunction } from "@core/api/client";
import { Endpoints } from "@core/api/endpoints";
import { z } from "zod";

const codeSchema = z.string()
  .trim()
  .min(4, "Code must be at least 4 characters")
  .max(50, "Code must be less than 50 characters")
  .regex(/^[A-Za-z0-9-]+$/, "Code can only contain letters, numbers, and hyphens");

type RedemptionStep = "enter" | "validating" | "revealed" | "error";

interface RevealedCard {
  card_code: string;
  card_number?: string;
  value: number;
  provider?: string;
  brand_name?: string;
  logo_url?: string;
}

export default function EmbedGiftCard() {
  const { campaignId } = useParams();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState("");
  const [step, setStep] = useState<RedemptionStep>("enter");
  const [giftCard, setGiftCard] = useState<RevealedCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const primaryColor = searchParams.get("primary") || "#3b82f6";
  const accentColor = searchParams.get("accent") || "#10b981";

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGiftCard(null);

    try {
      codeSchema.parse(code);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    setStep("validating");

    try {
      const data = await callPublicEdgeFunction<{
        valid: boolean;
        message?: string;
        giftCard?: RevealedCard;
      }>(Endpoints.giftCards.redeemEmbed, {
        code: code.trim().toUpperCase(),
      });

      if (data.valid && data.giftCard) {
        setGiftCard(data.giftCard);
        setStep("revealed");
      } else {
        setError(data.message || "Invalid code. Please check and try again.");
        setStep("error");
      }
    } catch (err: unknown) {
      console.error("Validation error:", err);
      setError("Failed to validate code. Please try again.");
      setStep("error");
    }
  };

  const handleReset = () => {
    setCode("");
    setGiftCard(null);
    setError(null);
    setStep("enter");
  };

  // Step indicator
  const steps = [
    { key: "enter", label: "Enter Code" },
    { key: "validating", label: "Validating" },
    { key: "revealed", label: "Revealed" },
  ];

  const currentStepIndex = step === "error" ? 0 : steps.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#f9fafb" }}>
      <Card className="w-full max-w-md shadow-lg overflow-hidden">
        {/* Colored header bar */}
        <div className="h-1.5" style={{ backgroundColor: step === "revealed" ? accentColor : primaryColor }} />

        <CardHeader className="text-center pb-4">
          <div
            className="mx-auto mb-4 h-14 w-14 rounded-full flex items-center justify-center transition-all duration-500"
            style={{
              backgroundColor: step === "revealed" ? accentColor + "20" : primaryColor + "20",
              transform: step === "revealed" ? "scale(1.1)" : "scale(1)",
            }}
          >
            {step === "revealed" ? (
              <CheckCircle className="h-7 w-7 transition-all duration-300" style={{ color: accentColor }} />
            ) : step === "validating" ? (
              <Loader2 className="h-7 w-7 animate-spin" style={{ color: primaryColor }} />
            ) : (
              <Gift className="h-7 w-7" style={{ color: primaryColor }} />
            )}
          </div>
          <CardTitle className="text-2xl">
            {step === "revealed" ? "Your Gift Card" : "Claim Your Gift Card"}
          </CardTitle>
          <CardDescription>
            {step === "revealed"
              ? "Your gift card details are below"
              : step === "validating"
              ? "Verifying your code..."
              : "Enter your redemption code below"}
          </CardDescription>
        </CardHeader>

        {/* Step Progress */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                      i <= currentStepIndex
                        ? "text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                    style={i <= currentStepIndex ? { backgroundColor: step === "revealed" ? accentColor : primaryColor } : undefined}
                  >
                    {i < currentStepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`w-16 h-0.5 mx-1 mb-4 transition-all duration-500 ${
                      i < currentStepIndex ? "" : "bg-gray-200"
                    }`}
                    style={i < currentStepIndex ? { backgroundColor: step === "revealed" ? accentColor : primaryColor } : undefined}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <CardContent className="pb-6">
          {/* Enter Code Form */}
          {(step === "enter" || step === "error") && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Enter your code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError(null);
                    if (step === "error") setStep("enter");
                  }}
                  className="text-center text-lg font-mono tracking-wider h-12"
                  maxLength={50}
                  autoFocus
                />
                {error && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
              <Button
                type="submit"
                className="w-full h-11 text-base"
                disabled={!code.trim()}
                style={{ backgroundColor: primaryColor }}
              >
                Claim Gift Card
              </Button>
            </form>
          )}

          {/* Validating State */}
          {step === "validating" && (
            <div className="text-center py-8 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin mx-auto" style={{ color: primaryColor }} />
              <div>
                <p className="font-medium">Verifying your code</p>
                <p className="text-sm text-muted-foreground mt-1">This will only take a moment...</p>
              </div>
            </div>
          )}

          {/* Revealed Card */}
          {step === "revealed" && giftCard && (
            <div className="space-y-4">
              {/* Brand + Value Header */}
              <div
                className="rounded-xl p-5 text-center text-white relative overflow-hidden"
                style={{ backgroundColor: primaryColor }}
              >
                {/* Decorative circles */}
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
                <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full opacity-10 bg-white" />

                <div className="relative z-10">
                  {giftCard.logo_url ? (
                    <img
                      src={giftCard.logo_url}
                      alt={giftCard.brand_name || "Brand"}
                      className="h-10 mx-auto mb-3 object-contain brightness-0 invert"
                    />
                  ) : giftCard.brand_name ? (
                    <p className="text-sm font-medium opacity-90 mb-1">{giftCard.brand_name}</p>
                  ) : null}
                  <p className="text-4xl font-bold">${giftCard.value}</p>
                  {giftCard.provider && (
                    <p className="text-sm opacity-80 mt-1">{giftCard.provider}</p>
                  )}
                </div>
              </div>

              {/* Card Code */}
              <div className="space-y-3">
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Gift Card Code</span>
                    <button
                      onClick={() => copyToClipboard(giftCard.card_code, "code")}
                      className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copiedField === "code" ? (
                        <>
                          <Check className="h-3 w-3" style={{ color: accentColor }} />
                          <span style={{ color: accentColor }}>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xl font-mono font-bold tracking-wider text-center py-1">
                    {giftCard.card_code}
                  </p>
                </div>

                {giftCard.card_number && (
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Card Number</span>
                      <button
                        onClick={() => copyToClipboard(giftCard.card_number!, "number")}
                        className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copiedField === "number" ? (
                          <>
                            <Check className="h-3 w-3" style={{ color: accentColor }} />
                            <span style={{ color: accentColor }}>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-lg font-mono text-center py-1 flex items-center justify-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      {giftCard.card_number}
                    </p>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="text-center pt-2">
                <p className="text-sm text-muted-foreground">
                  Save this information - you'll need it to use your gift card.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
