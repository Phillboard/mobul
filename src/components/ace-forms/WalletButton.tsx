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
    // TODO: Implement actual wallet pass generation
    // For now, show platform-appropriate message
    
    if (!hasWalletSupport) {
      toast({
        title: "Wallet Not Available",
        description: "Wallet passes are only available on mobile devices. You can download the gift card details instead.",
      });
      return;
    }

    toast({
      title: `Add to ${walletName}`,
      description: `${walletName} integration coming soon! Your gift card will be saved for easy access.`,
    });

    // Future implementation:
    // const passData = await generateWalletPass(redemption);
    // if (platform === 'ios') {
    //   // Download .pkpass file
    //   window.location.href = passData.appleWalletUrl;
    // } else {
    //   // Open Google Wallet with JWT
    //   window.location.href = passData.googleWalletUrl;
    // }
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
