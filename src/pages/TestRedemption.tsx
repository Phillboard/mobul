import { GiftCardDisplay } from "@/components/ace-forms/GiftCardDisplay";
import { GiftCardRedemption } from "@/types/aceForms";

/**
 * Test Redemption Page
 * 
 * A simple test page for testing the gift card redemption UI
 * and Google Wallet integration with hardcoded Starbucks data.
 */
export default function TestRedemption() {
  // Hardcoded Starbucks gift card for testing
  const testRedemption: GiftCardRedemption = {
    card_code: "6346948495275900",
    card_number: "6346948495275900",
    card_value: 5,
    provider: "Starbucks",
    brand_name: "Starbucks",
    brand_logo: "https://upload.wikimedia.org/wikipedia/en/thumb/d/d3/Starbucks_Corporation_Logo_2011.svg/1200px-Starbucks_Corporation_Logo_2011.svg.png",
    brand_color: "#00704A", // Starbucks green
    store_url: "https://www.starbucks.com/card",
    redemption_instructions: "Add this card to your Starbucks app or use the code at any Starbucks location. You can also add it to Google Wallet for easy access.",
    usage_restrictions: [
      "Valid at participating Starbucks locations",
      "Cannot be redeemed for cash",
      "No expiration date"
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 py-12 px-4">
      <div className="max-w-lg mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            🎁 Test Redemption
          </h1>
          <p className="text-gray-600">
            Testing Google Wallet integration with a Starbucks gift card
          </p>
        </div>

        {/* Gift Card Display */}
        <GiftCardDisplay 
          redemption={testRedemption}
          revealSettings={{
            animationStyle: 'confetti',
            showConfetti: false,
            cardStyle: 'modern',
            cardGradient: true,
            showBrandLogo: true,
            showQRCode: true,
            showOpenInApp: true,
            showShareButton: true,
            showWalletButton: true,
            showDownloadButton: true,
            showInstructions: true,
            revealBackground: 'gradient',
          }}
        />

        {/* Test Info */}
        <div className="bg-white/80 backdrop-blur rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">Test Card Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">ID:</span>
              <span className="font-mono text-gray-900">13965731</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Code:</span>
              <span className="font-mono text-gray-900">6346948495275900</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Value:</span>
              <span className="font-semibold text-green-600">$5.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Brand:</span>
              <span className="text-gray-900">Starbucks</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center text-sm text-gray-500 space-y-1">
          <p>Click "Add to Google Wallet" to test the wallet integration.</p>
          <p className="text-xs">
            Note: Requires GOOGLE_WALLET_ISSUER_ID and GOOGLE_WALLET_SERVICE_ACCOUNT secrets.
          </p>
        </div>
      </div>
    </div>
  );
}

