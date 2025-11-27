import { Smartphone, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectPlatform, getWalletName, supportsWallet } from "@/lib/walletDetection";
import { useToast } from "@/hooks/use-toast";
import { GiftCardRedemption } from "@/types/aceForms";
import { cn } from "@/lib/utils";

interface WalletButtonProps {
  redemption: GiftCardRedemption;
  size?: "default" | "sm" | "lg";
  className?: string;
}

/**
 * Smart wallet button that adapts to user's platform
 * Shows Apple Wallet on iOS, Google Wallet on Android, generic on Desktop
 */
export function WalletButton({ redemption, size = "lg", className }: WalletButtonProps) {
  const { toast } = useToast();
  const platform = detectPlatform();
  const walletName = getWalletName();
  const hasWalletSupport = supportsWallet();

  const handleAddToWallet = async () => {
    /**
     * FEATURE: Wallet Pass Integration
     * 
     * Status: Planned for future release
     * Dependencies: 
     *   - supabase/functions/generate-apple-wallet-pass
     *   - supabase/functions/generate-google-wallet-pass
     * 
     * Implementation Plan:
     * 1. Complete edge functions for pass generation
     * 2. Configure Apple Developer account for .pkpass signing
     * 3. Configure Google Wallet API credentials
     * 4. Test on actual devices
     * 
     * For now, users can download gift card details or screenshot
     */
    
    if (!hasWalletSupport) {
      toast({
        title: "Wallet Not Available",
        description: "Wallet passes are only available on mobile devices. You can download the gift card details instead.",
      });
      return;
    }

    toast({
      title: `Add to ${walletName}`,
      description: `${walletName} integration is planned for a future release. You can download or screenshot your gift card for now.`,
      duration: 5000,
    });

    // Future implementation (when edge functions are complete):
    // const { data, error } = await supabase.functions.invoke(
    //   platform === 'ios' ? 'generate-apple-wallet-pass' : 'generate-google-wallet-pass',
    //   { body: { redemptionId: redemption.id } }
    // );
    // if (error) throw error;
    // window.location.href = data.passUrl;
  };

  return (
    <div className="space-y-2">
      <Button
        size={size}
        onClick={handleAddToWallet}
        className={cn(
          "w-full gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700",
          className
        )}
      >
        {platform === 'ios' ? (
          <>
            <Wallet className="w-5 h-5" />
            Add to Apple Wallet
          </>
        ) : platform === 'android' ? (
          <>
            <Wallet className="w-5 h-5" />
            Add to Google Wallet
          </>
        ) : (
          <>
            <Smartphone className="w-5 h-5" />
            Add to Wallet
          </>
        )}
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        Save to your phone's wallet app for easy access anytime
      </p>
    </div>
  );
}
