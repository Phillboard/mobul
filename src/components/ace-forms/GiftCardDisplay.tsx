import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GiftCardRedemption, RevealSettings } from "@/types/aceForms";
import { GiftCardInstructions } from "./GiftCardInstructions";
import { GiftCardQRCode } from "./GiftCardQRCode";
import { SmartRedeemButton } from "./SmartRedeemButton";
import { WalletButton } from "./WalletButton";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils/utils';

interface GiftCardDisplayProps {
  redemption: GiftCardRedemption;
  revealSettings?: RevealSettings;
  embedMode?: boolean;
}

export function GiftCardDisplay({ redemption, revealSettings, embedMode = false }: GiftCardDisplayProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Apply revealSettings with sensible defaults
  const showBrandLogo = revealSettings?.showBrandLogo !== false;
  const showWalletButton = revealSettings?.showWalletButton !== false;
  const showQRCode = revealSettings?.showQRCode !== false;
  const showOpenInApp = revealSettings?.showOpenInApp !== false;

  // Cash App style - copy ALL gift card info
  const handleCopyAll = async () => {
    try {
      const fullInfo = [
        redemption.card_number ? `Card Number: ${redemption.card_number}` : null,
        `Gift Card Code: ${redemption.card_code}`,
        redemption.expiration_date ? `Expires: ${new Date(redemption.expiration_date).toLocaleDateString()}` : null,
        `Value: $${redemption.card_value}`,
        `Brand: ${redemption.brand_name}`,
      ].filter(Boolean).join('\n');

      await navigator.clipboard.writeText(fullInfo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Gift card details copied. Paste in text messages or notes to save.",
      });
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={cn("w-full", embedMode ? 'max-w-sm' : 'max-w-md')}>
      {/* Gift Card */}
      <div
        className={cn(
          "rounded-2xl text-white shadow-2xl relative overflow-hidden",
          embedMode ? 'p-6' : 'p-8'
        )}
        style={{
          background: redemption.brand_color 
            ? `linear-gradient(135deg, ${redemption.brand_color} 0%, ${redemption.brand_color}dd 100%)`
            : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
        }}
      >
        {/* Brand Logo - Conditionally rendered */}
        {showBrandLogo && redemption.brand_logo && (
          <div className={cn(embedMode ? 'mb-3' : 'mb-4')}>
            <img
              src={redemption.brand_logo}
              alt={redemption.brand_name}
              className={cn("object-contain bg-white/90 rounded p-1", embedMode ? 'h-10' : 'h-12')}
            />
          </div>
        )}

        {/* Brand Name */}
        <div className={cn("opacity-90", embedMode ? 'text-xs mb-1' : 'text-sm mb-2')}>
          {redemption.brand_name}
        </div>

        {/* Value */}
        <div className={cn("font-bold", embedMode ? 'text-4xl mb-4' : 'text-5xl mb-6')}>
          ${redemption.card_value.toFixed(2)}
        </div>

        {/* Card Number (Primary) with Copy Button - Cash App Style */}
        <div className={cn("bg-white/20 backdrop-blur rounded-lg", embedMode ? 'p-3' : 'p-4')}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className={cn("opacity-75 mb-1", embedMode ? 'text-[10px]' : 'text-xs')}>
                Card Number
              </div>
              <div className={cn("font-mono font-semibold whitespace-nowrap overflow-x-auto", embedMode ? 'text-base' : 'text-lg')} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                {redemption.card_number || redemption.card_code}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyAll}
              className="shrink-0 hover:bg-white/20 text-white h-auto py-2 px-3"
            >
              {copied ? (
                <>
                  <Check className={cn(embedMode ? 'w-4 h-4 mr-1' : 'w-4 h-4 mr-1')} />
                  <span className="text-xs font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className={cn(embedMode ? 'w-4 h-4 mr-1' : 'w-4 h-4 mr-1')} />
                  <span className="text-xs font-medium">Copy All</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Card Details - Code shown below */}
        <div className={cn("mt-3 space-y-1", embedMode ? 'text-xs' : 'text-sm')}>
          {redemption.card_code && redemption.card_number && (
            <div className="opacity-75" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
              Code: {redemption.card_code}
            </div>
          )}
          {redemption.expiration_date && (
            <div className="opacity-75" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
              Expires: {new Date(redemption.expiration_date).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons - Conditionally rendered based on revealSettings */}
      <div className={cn("space-y-3", embedMode ? 'mt-3' : 'mt-4')}>
        {/* PRIMARY - Add to Wallet Button */}
        {showWalletButton && (
          <WalletButton
            redemption={redemption}
            size={embedMode ? 'default' : 'lg'}
            className="w-full"
          />
        )}
        
        {/* SECONDARY - Smart Redeem and QR Code */}
        {(showOpenInApp || showQRCode) && (
          <div className="flex gap-2">
            {showOpenInApp && (
              <SmartRedeemButton 
                redemption={redemption} 
                className="flex-1"
                size="sm"
              />
            )}
            {showQRCode && (
              <GiftCardQRCode redemption={redemption} variant="button" />
            )}
          </div>
        )}
      </div>

      {/* Instructions - Show based on revealSettings, default to true */}
      {!embedMode && revealSettings?.showInstructions !== false && (
        <div className="mt-4">
          <GiftCardInstructions
            instructions={redemption.redemption_instructions}
            restrictions={redemption.usage_restrictions}
            brandName={redemption.brand_name}
            storeUrl={redemption.store_url}
          />
        </div>
      )}
    </div>
  );
}
