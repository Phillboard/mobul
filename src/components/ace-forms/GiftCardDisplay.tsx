import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GiftCardRedemption } from "@/types/aceForms";
import { GiftCardInstructions } from "./GiftCardInstructions";
import { useToast } from "@/hooks/use-toast";

interface GiftCardDisplayProps {
  redemption: GiftCardRedemption;
  embedMode?: boolean;
}

export function GiftCardDisplay({ redemption, embedMode = false }: GiftCardDisplayProps) {
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
    <div className={`w-full space-y-4 ${embedMode ? 'max-w-sm' : 'max-w-md space-y-6'}`}>
      {/* Gift Card */}
      <div
        className={`rounded-2xl text-white shadow-2xl relative overflow-hidden ${
          embedMode ? 'p-6' : 'p-8'
        }`}
        style={{
          background: `linear-gradient(135deg, ${redemption.brand_color || "#6366f1"}dd, ${redemption.brand_color || "#6366f1"}88)`,
        }}
      >
        {/* Brand Logo */}
        {redemption.brand_logo && (
          <div className={embedMode ? 'mb-3' : 'mb-4'}>
            <img
              src={redemption.brand_logo}
              alt={redemption.brand_name}
              className={embedMode ? 'h-10 object-contain' : 'h-12 object-contain'}
            />
          </div>
        )}

        {/* Brand Name */}
        <div className={`opacity-90 ${embedMode ? 'text-xs mb-1' : 'text-sm mb-2'}`}>
          {redemption.provider}
        </div>

        {/* Value */}
        <div className={`font-bold ${embedMode ? 'text-3xl mb-4' : 'text-4xl mb-6'}`}>
          ${redemption.card_value.toFixed(2)}
        </div>

        {/* Code */}
        <div className={`bg-white/20 backdrop-blur rounded-lg mb-2 ${embedMode ? 'p-2' : 'p-3'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`opacity-75 mb-1 ${embedMode ? 'text-[10px]' : 'text-xs'}`}>
                Redemption Code
              </div>
              <div className={`font-mono font-semibold ${embedMode ? 'text-base' : 'text-lg'}`}>
                {redemption.card_code}
              </div>
            </div>
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              {copied ? (
                <Check className={embedMode ? 'w-4 h-4' : 'w-5 h-5'} />
              ) : (
                <Copy className={embedMode ? 'w-4 h-4' : 'w-5 h-5'} />
              )}
            </button>
          </div>
        </div>

        {/* Card Number */}
        {redemption.card_number && (
          <div className={`opacity-75 ${embedMode ? 'text-xs' : 'text-sm'}`}>
            Card #: {redemption.card_number.replace(/(\d{4})/g, "$1 ").trim()}
          </div>
        )}

        {/* Expiration */}
        {redemption.expiration_date && (
          <div className={`opacity-75 mt-1 ${embedMode ? 'text-xs' : 'text-sm'}`}>
            Expires: {new Date(redemption.expiration_date).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Store Link */}
      {redemption.store_url && (
        <Button
          className="w-full"
          size={embedMode ? 'default' : 'lg'}
          onClick={() => window.open(redemption.store_url, "_blank")}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Use at {redemption.brand_name}
        </Button>
      )}

      {/* Instructions - Collapsed by default in embed mode */}
      {!embedMode && (redemption.usage_restrictions || redemption.redemption_instructions) && (
        <GiftCardInstructions
          instructions={redemption.redemption_instructions}
          restrictions={redemption.usage_restrictions}
        />
      )}
    </div>
  );
}
