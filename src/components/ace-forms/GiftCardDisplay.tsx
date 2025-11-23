import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GiftCardRedemption } from "@/types/aceForms";
import { GiftCardInstructions } from "./GiftCardInstructions";
import { useToast } from "@/hooks/use-toast";

interface GiftCardDisplayProps {
  redemption: GiftCardRedemption;
}

export function GiftCardDisplay({ redemption }: GiftCardDisplayProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(redemption.card_code);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Gift card code copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Gift Card */}
      <div
        className="rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${redemption.brand_color || "#6366f1"}dd, ${redemption.brand_color || "#6366f1"}88)`,
        }}
      >
        {/* Brand Logo */}
        {redemption.brand_logo && (
          <div className="mb-4">
            <img
              src={redemption.brand_logo}
              alt={redemption.brand_name}
              className="h-12 object-contain"
            />
          </div>
        )}

        {/* Brand Name */}
        <div className="text-sm opacity-90 mb-2">{redemption.provider}</div>

        {/* Value */}
        <div className="text-4xl font-bold mb-6">${redemption.card_value.toFixed(2)}</div>

        {/* Code */}
        <div className="bg-white/20 backdrop-blur rounded-lg p-3 mb-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs opacity-75 mb-1">Redemption Code</div>
              <div className="text-lg font-mono font-semibold">{redemption.card_code}</div>
            </div>
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Card Number */}
        {redemption.card_number && (
          <div className="text-sm opacity-75">
            Card #: {redemption.card_number.replace(/(\d{4})/g, "$1 ").trim()}
          </div>
        )}

        {/* Expiration */}
        {redemption.expiration_date && (
          <div className="text-sm opacity-75 mt-1">
            Expires: {new Date(redemption.expiration_date).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Store Link */}
      {redemption.store_url && (
        <Button
          className="w-full"
          size="lg"
          onClick={() => window.open(redemption.store_url, "_blank")}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Use at {redemption.brand_name}
        </Button>
      )}

      {/* Instructions */}
      {(redemption.usage_restrictions || redemption.redemption_instructions) && (
        <GiftCardInstructions
          instructions={redemption.redemption_instructions}
          restrictions={redemption.usage_restrictions}
        />
      )}
    </div>
  );
}
