import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { QrCode } from "lucide-react";
import { GiftCardRedemption } from "@/types/aceForms";

interface GiftCardQRCodeProps {
  redemption: GiftCardRedemption;
  variant?: "button" | "inline";
}

export function GiftCardQRCode({ redemption, variant = "button" }: GiftCardQRCodeProps) {
  const [open, setOpen] = useState(false);

  // Encode gift card data as JSON string for QR code
  const qrData = JSON.stringify({
    brand: redemption.brand_name,
    code: redemption.card_code,
    number: redemption.card_number,
    value: redemption.card_value,
    url: redemption.store_url,
  });

  if (variant === "inline") {
    return (
      <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-lg">
        <p className="text-sm font-medium text-gray-700">Scan to Use</p>
        <QRCodeSVG
          value={qrData}
          size={200}
          level="H"
          includeMargin
          bgColor="#ffffff"
          fgColor="#000000"
        />
        <p className="text-xs text-gray-500 text-center">
          Show this QR code to the cashier to redeem
        </p>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2 bg-card">
          <QrCode className="w-4 h-4" />
          Show QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gift Card QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
            <QRCodeSVG
              value={qrData}
              size={256}
              level="H"
              includeMargin
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm font-medium">
              {redemption.brand_name} - ${redemption.card_value}
            </p>
            <p className="text-xs text-muted-foreground">
              Show this QR code to the cashier at {redemption.brand_name} to redeem your gift card
            </p>
          </div>
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="w-full"
          >
            Print QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
