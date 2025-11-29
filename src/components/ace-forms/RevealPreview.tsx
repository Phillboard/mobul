import { GiftCardRedemption, RevealSettings } from "@/types/aceForms";
import { GiftCardDisplay } from "./GiftCardDisplay";
import { cn } from '@/lib/utils/utils';

interface RevealPreviewProps {
  revealSettings: RevealSettings;
}

// Mock gift card data for preview
const mockRedemption: GiftCardRedemption = {
  card_code: "DEMO-1234-5678-ABCD",
  card_number: "4111 1111 1111 1111",
  card_value: 50.00,
  provider: "Demo Provider",
  brand_name: "Amazon",
  brand_logo: "https://logo.clearbit.com/amazon.com",
  brand_color: "#FF9900",
  store_url: "https://amazon.com",
  expiration_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  usage_restrictions: ["Valid online and in-store", "No cash value", "Cannot be resold"],
  redemption_instructions: "Visit amazon.com/redeem to use your gift card",
};

export function RevealPreview({ revealSettings }: RevealPreviewProps) {
  const getBackgroundStyle = () => {
    switch (revealSettings.revealBackground) {
      case 'gradient':
        return 'bg-gradient-to-br from-purple-50 via-white to-blue-50';
      case 'solid':
        return revealSettings.revealBackgroundColor 
          ? `bg-[${revealSettings.revealBackgroundColor}]`
          : 'bg-background';
      case 'transparent':
        return 'bg-transparent';
      default:
        return 'bg-gradient-to-br from-purple-50 via-white to-blue-50';
    }
  };

  const getCardGradient = () => {
    if (!revealSettings.cardGradient) {
      return mockRedemption.brand_color || '#6366f1';
    }
    
    const start = revealSettings.customGradientStart || mockRedemption.brand_color || '#6366f1';
    const end = revealSettings.customGradientEnd || (mockRedemption.brand_color + 'dd') || '#8b5cf6';
    
    return `linear-gradient(135deg, ${start} 0%, ${end} 100%)`;
  };

  // Clone redemption with settings applied
  const previewRedemption: GiftCardRedemption = {
    ...mockRedemption,
    brand_logo: revealSettings.showBrandLogo ? mockRedemption.brand_logo : undefined,
    redemption_instructions: revealSettings.showInstructions 
      ? (revealSettings.customInstructions || mockRedemption.redemption_instructions)
      : undefined,
  };

  return (
    <div className={cn(
      "relative rounded-lg overflow-hidden border-2 border-dashed p-8 min-h-[400px] flex items-center justify-center",
      getBackgroundStyle()
    )}>
      {/* Preview Label */}
      <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        Preview
      </div>

      {/* Confetti Indicator */}
      {revealSettings.showConfetti && (
        <div className="absolute top-2 left-2 text-2xl animate-bounce">
          🎉
        </div>
      )}

      {/* Card Display */}
      <div className="w-full max-w-md" style={{
        '--card-gradient': getCardGradient()
      } as any}>
        <GiftCardDisplay 
          redemption={previewRedemption}
          revealSettings={revealSettings}
          embedMode={false}
        />
      </div>
    </div>
  );
}
