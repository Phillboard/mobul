import { useState } from "react";
import { ExternalLink, Smartphone, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { GiftCardRedemption } from "@/types/aceForms";
import { getBrandLinks, detectPlatform, attemptDeepLink } from '@/lib/web/brandDeepLinks";

interface SmartRedeemButtonProps {
  redemption: GiftCardRedemption;
  className?: string;
  size?: "default" | "sm" | "lg";
}

export function SmartRedeemButton({ redemption, className, size = "lg" }: SmartRedeemButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const brandLinks = getBrandLinks(redemption.brand_name);
  const platform = detectPlatform();
  const hasAppSupport = brandLinks && (brandLinks.ios || brandLinks.android);

  const handleSmartRedeem = () => {
    if (!brandLinks) {
      // Fallback to store_url if no brand config
      if (redemption.store_url) {
        window.open(redemption.store_url, "_blank");
      }
      return;
    }

    if (platform === 'ios' && brandLinks.ios) {
      attemptDeepLink(brandLinks.ios, brandLinks.website);
    } else if (platform === 'android' && brandLinks.android) {
      attemptDeepLink(brandLinks.android, brandLinks.website);
    } else {
      window.open(brandLinks.website, "_blank");
    }
  };

  const handleOpenInApp = () => {
    if (!brandLinks) return;

    if (platform === 'ios' && brandLinks.ios) {
      window.location.href = brandLinks.ios;
    } else if (platform === 'android' && brandLinks.android) {
      window.location.href = brandLinks.android;
    }
  };

  const handleOpenWebsite = () => {
    const url = brandLinks?.website || redemption.store_url;
    if (url) {
      window.open(url, "_blank");
    }
  };

  // Simple button if no app support
  if (!hasAppSupport) {
    return (
      <Button
        className={`bg-primary text-primary-foreground hover:bg-primary/90 ${className}`}
        size={size}
        onClick={handleSmartRedeem}
      >
        <ExternalLink className="w-4 h-4 mr-2" />
        Use at {redemption.brand_name}
      </Button>
    );
  }

  // Smart button with dropdown for app options
  return (
    <div className="flex gap-2">
      <Button
        className={`flex-1 ${className}`}
        size={size}
        onClick={handleSmartRedeem}
      >
        <Smartphone className="w-4 h-4 mr-2" />
        Open in App
      </Button>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button size={size} variant="outline" className="px-3">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handleOpenInApp}>
            <Smartphone className="w-4 h-4 mr-2" />
            Open in {redemption.brand_name} App
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleOpenWebsite}>
            <Globe className="w-4 h-4 mr-2" />
            Open Website
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
