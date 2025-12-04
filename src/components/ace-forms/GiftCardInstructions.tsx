import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Smartphone, Globe, Store, AlertCircle, CheckCircle } from "lucide-react";

interface GiftCardInstructionsProps {
  instructions?: string;
  restrictions?: string[];
  brandName?: string;
  storeUrl?: string;
}

export function GiftCardInstructions({ 
  instructions, 
  restrictions,
  brandName = "this gift card",
  storeUrl 
}: GiftCardInstructionsProps) {
  
  // Use custom instructions if provided, otherwise generate comprehensive default
  const displayInstructions = instructions || generateDefaultInstructions(brandName, storeUrl);

  return (
    <Accordion type="single" collapsible className="w-full" defaultValue="instructions">
      <AccordionItem value="instructions">
        <AccordionTrigger>
          <div className="flex items-center gap-2 text-gray-800">
            <AlertCircle className="w-4 h-4" />
            <span className="font-semibold">How to Use Your Gift Card</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-6 text-sm">
            {/* Digital Wallet Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-base font-semibold text-gray-800">
                <Smartphone className="w-5 h-5 text-primary" />
                <span>Option 1: Add to Digital Wallet (Recommended)</span>
              </div>
              <div className="pl-7 space-y-2 text-gray-600">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p>Tap <strong>"Add to Apple Wallet"</strong> or <strong>"Add to Google Wallet"</strong> button above</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p>Your gift card will be saved to your phone's wallet app for easy access</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p>Show the digital pass at checkout or use the code online</p>
                </div>
              </div>
            </div>

            {/* Online Use Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-base font-semibold text-gray-800">
                <Globe className="w-5 h-5 text-primary" />
                <span>Option 2: Use Code Online</span>
              </div>
              <div className="pl-7 space-y-2 text-gray-600">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p>Visit {storeUrl || `the ${brandName} website`}</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p>At checkout, select "Gift Card" or "Promo Code"</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p>Enter the gift card code shown above</p>
                </div>
              </div>
            </div>

            {/* In-Store Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-base font-semibold text-gray-800">
                <Store className="w-5 h-5 text-primary" />
                <span>Option 3: Use In-Store</span>
              </div>
              <div className="pl-7 space-y-2 text-gray-600">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p>Show the QR code to the cashier to scan at register</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p>Or provide the gift card code verbally or in writing</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p>If using your phone's wallet, open the pass and show at checkout</p>
                </div>
              </div>
            </div>

            {/* Custom Instructions */}
            {displayInstructions && (
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-gray-800">
                  <AlertCircle className="w-4 h-4" />
                  Additional Information
                </h4>
                <p className="text-gray-600 whitespace-pre-wrap">{displayInstructions}</p>
              </div>
            )}

            {/* Important Notes */}
            {restrictions && restrictions.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-amber-700">
                  <AlertCircle className="w-4 h-4" />
                  Important Notes
                </h4>
                <ul className="list-disc list-inside space-y-1.5 text-gray-600">
                  {restrictions.map((restriction, i) => (
                    <li key={i}>{restriction}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pro Tips */}
            <div className="pt-4 border-t bg-gray-100 -mx-4 px-4 py-3 rounded-lg">
              <h4 className="font-semibold mb-2 text-sm text-gray-800">💡 Pro Tips</h4>
              <ul className="space-y-1.5 text-xs text-gray-600">
                <li>• Screenshot or save this page for backup access to your code</li>
                <li>• Check the expiration date (if applicable) before using</li>
                <li>• Some retailers require full balance to be used in one transaction</li>
                <li>• Keep your gift card code private and secure</li>
              </ul>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function generateDefaultInstructions(brandName: string, storeUrl?: string): string {
  return `This gift card can be used for purchases at ${brandName}. ${
    storeUrl ? `Visit ${storeUrl} to shop online or ` : ''
  }visit any physical store location. The card value will be deducted from your purchase total. If your purchase exceeds the gift card balance, you can pay the remaining amount with another payment method.`;
}
