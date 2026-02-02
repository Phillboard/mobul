import { useState } from "react";
import { Smartphone, Wallet, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { detectPlatform, getWalletName, supportsWallet } from '@/core/services/web/walletDetection';
import { useToast } from '@shared/hooks';
import { GiftCardRedemption } from "@/types/aceForms";
import { cn } from '@shared/utils/cn';
import { callEdgeFunction } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';

interface WalletButtonProps {
  redemption: GiftCardRedemption;
  size?: "default" | "sm" | "lg";
  className?: string;
}

/**
 * Smart wallet button that adapts to user's platform
 * Shows Apple Wallet on iOS, Google Wallet on Android, generic on Desktop
 * 
 * Calls the appropriate edge function to generate wallet passes:
 * - iOS: generate-apple-wallet-pass (returns .pkpass file)
 * - Android: generate-google-wallet-pass (returns save URL)
 */
export function WalletButton({ redemption, size = "lg", className }: WalletButtonProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const platform = detectPlatform();
  const walletName = getWalletName();
  const hasWalletSupport = supportsWallet();

  const handleAddToWallet = async () => {
    // On desktop, show a helpful message
    if (!hasWalletSupport) {
      toast({
        title: "Open on Mobile",
        description: "Wallet passes work best on mobile devices. Open this page on your phone to add to your wallet.",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Prepare gift card data for the edge function
      const giftCardData = {
        id: redemption.card_code, // Use card_code as unique ID
        card_code: redemption.card_code,
        card_number: redemption.card_number,
        card_value: redemption.card_value,
        provider: redemption.provider,
        brand_name: redemption.brand_name,
        logo_url: redemption.brand_logo,
        expiration_date: redemption.expiration_date,
        // balance_check_url could be added if available
      };

      if (platform === 'ios') {
        // Apple Wallet - download .pkpass file
        await handleAppleWallet(giftCardData);
      } else {
        // Google Wallet - redirect to save URL
        await handleGoogleWallet(giftCardData);
      }

    } catch (error) {
      console.error('Wallet error:', error);
      
      // Check if it's a configuration error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('not configured') || errorMessage.includes('GOOGLE_WALLET') || errorMessage.includes('APPLE_WALLET')) {
        toast({
          title: "Wallet Not Configured",
          description: `${walletName} integration needs to be set up by the administrator. Required secrets are missing.`,
          variant: "destructive",
        });
      } else if (errorMessage.includes('service account') || errorMessage.includes('private key')) {
        toast({
          title: "Configuration Error",
          description: "There's an issue with the wallet service account configuration. Please contact the administrator.",
          variant: "destructive",
        });
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('network')) {
        toast({
          title: "Network Error",
          description: "Could not connect to the wallet service. Please check your internet connection and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to Add to Wallet",
          description: errorMessage || "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle Apple Wallet pass generation and download
   */
  const handleAppleWallet = async (giftCard: Record<string, unknown>) => {
    const data = await callEdgeFunction<{ success?: boolean; error?: string; pkpass?: string; filename?: string }>(
      Endpoints.wallet.appleWalletPass,
      { giftCard }
    );

    // Check if the response is an error JSON
    if (data.error) {
      throw new Error(data.error);
    }

    // Check for success response with base64 pkpass
    if (!data.success || !data.pkpass) {
      throw new Error('Invalid response from server');
    }

    // Decode base64 to binary
    const binaryString = atob(data.pkpass);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create download link
    const blob = new Blob([bytes], { type: 'application/vnd.apple.pkpass' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = data.filename || `giftcard-${giftCard.id}.pkpass`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);

    toast({
      title: "Pass Downloaded",
      description: "Open the downloaded file to add to Apple Wallet.",
    });
  };

  /**
   * Handle Google Wallet pass generation and redirect
   */
  const handleGoogleWallet = async (giftCard: Record<string, unknown>) => {
    const data = await callEdgeFunction<{ success?: boolean; error?: string; hint?: string; message?: string; url?: string }>(
      Endpoints.wallet.googleWalletPass,
      { giftCard }
    );

    // Check for error response in data
    if (data.error) {
      const errorDetails = data.hint ? `${data.error}. ${data.hint}` : data.error;
      throw new Error(errorDetails);
    }

    if (!data.success) {
      throw new Error(data.message || 'Failed to generate wallet pass');
    }

    // Redirect to Google's save URL
    if (data.url) {
      toast({
        title: "Opening Google Wallet",
        description: "Redirecting to add your gift card...",
      });
      
      // Small delay to show the toast
      setTimeout(() => {
        window.location.href = data.url;
      }, 500);
    } else {
      throw new Error('No save URL returned from server');
    }
  };

  return (
    <div className="space-y-2">
      <Button
        size={size}
        onClick={handleAddToWallet}
        disabled={isLoading}
        className={cn(
          "w-full gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-70",
          className
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating Pass...
          </>
        ) : platform === 'ios' ? (
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
        {isLoading 
          ? "Creating your wallet pass..." 
          : "Save to your phone's wallet app for easy access anytime"
        }
      </p>
    </div>
  );
}
