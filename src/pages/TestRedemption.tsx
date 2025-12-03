import { useState } from "react";
import { GiftCardDisplay } from "@/components/ace-forms/GiftCardDisplay";
import { GiftCardRedemption } from "@/types/aceForms";
import { detectPlatform, getWalletName } from "@/lib/web/walletDetection";
import { Smartphone, Apple, Chrome, Bug, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/**
 * Test Redemption Page
 * 
 * A simple test page for testing the gift card redemption UI
 * and wallet integration (Google Wallet & Apple Wallet) with hardcoded Starbucks data.
 */
export default function TestRedemption() {
  const platform = detectPlatform();
  const walletName = getWalletName();
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [isTestingApple, setIsTestingApple] = useState(false);
  const [isTestingGoogle, setIsTestingGoogle] = useState(false);

  const addLog = (message: string) => {
    setDebugLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const testAppleWallet = async () => {
    setIsTestingApple(true);
    setDebugLog([]);
    addLog("Starting Apple Wallet test...");
    
    try {
      const giftCardData = {
        id: "6346948495275900",
        card_code: "6346948495275900",
        card_number: "6346948495275900",
        card_value: 5,
        provider: "Starbucks",
        brand_name: "Starbucks",
      };
      
      addLog(`Calling generate-apple-wallet-pass with: ${JSON.stringify(giftCardData)}`);
      
      const { data, error } = await supabase.functions.invoke(
        'generate-apple-wallet-pass',
        { body: { giftCard: giftCardData } }
      );
      
      if (error) {
        addLog(`❌ Error: ${JSON.stringify(error)}`);
        return;
      }
      
      addLog(`Response received: ${JSON.stringify(data, null, 2)}`);
      
      if (data?.success && data?.pkpass) {
        addLog(`✅ Success! Pass size: ${data.size} bytes`);
        addLog(`Filename: ${data.filename}`);
      } else if (data?.error) {
        addLog(`❌ Server error: ${data.error}`);
        if (data?.hint) addLog(`Hint: ${data.hint}`);
        if (data?.requiredSecrets) addLog(`Required secrets: ${data.requiredSecrets.join(', ')}`);
      }
    } catch (err) {
      addLog(`❌ Exception: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsTestingApple(false);
    }
  };

  const testGoogleWallet = async () => {
    setIsTestingGoogle(true);
    setDebugLog([]);
    addLog("Starting Google Wallet test...");
    
    try {
      const giftCardData = {
        id: "6346948495275900",
        card_code: "6346948495275900",
        card_number: "6346948495275900",
        card_value: 5,
        provider: "Starbucks",
        brand_name: "Starbucks",
      };
      
      addLog(`Calling generate-google-wallet-pass with: ${JSON.stringify(giftCardData)}`);
      
      const { data, error } = await supabase.functions.invoke(
        'generate-google-wallet-pass',
        { body: { giftCard: giftCardData } }
      );
      
      if (error) {
        addLog(`❌ Error: ${JSON.stringify(error)}`);
        return;
      }
      
      addLog(`Response received: ${JSON.stringify(data, null, 2)}`);
      
      if (data?.success && data?.url) {
        addLog(`✅ Success! Save URL generated`);
        addLog(`URL: ${data.url.substring(0, 100)}...`);
      } else if (data?.error) {
        addLog(`❌ Server error: ${data.error}`);
        if (data?.hint) addLog(`Hint: ${data.hint}`);
      }
    } catch (err) {
      addLog(`❌ Exception: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsTestingGoogle(false);
    }
  };

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
    redemption_instructions: "Add this card to your Starbucks app or use the code at any Starbucks location. You can also add it to Apple Wallet (iPhone) or Google Wallet (Android) for easy access.",
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
            Testing wallet integration with a Starbucks gift card
          </p>
          
          {/* Platform Detection Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm border">
            {platform === 'ios' ? (
              <Apple className="w-4 h-4" />
            ) : platform === 'android' ? (
              <Chrome className="w-4 h-4" />
            ) : (
              <Smartphone className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {platform === 'ios' ? 'iPhone Detected' : 
               platform === 'android' ? 'Android Detected' : 
               'Desktop Detected'}
            </span>
            <span className="text-xs text-gray-500">
              → {walletName}
            </span>
          </div>
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

        {/* Debug Testing Section */}
        <div className="bg-white/80 backdrop-blur rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-orange-500" />
            <h2 className="font-semibold text-gray-900">Debug Testing</h2>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={testAppleWallet} 
              disabled={isTestingApple}
              variant="outline"
              className="flex-1"
            >
              {isTestingApple ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testing...</>
              ) : (
                <><Apple className="w-4 h-4 mr-2" /> Test Apple Wallet</>
              )}
            </Button>
            <Button 
              onClick={testGoogleWallet} 
              disabled={isTestingGoogle}
              variant="outline"
              className="flex-1"
            >
              {isTestingGoogle ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testing...</>
              ) : (
                <><Chrome className="w-4 h-4 mr-2" /> Test Google Wallet</>
              )}
            </Button>
          </div>
          
          {debugLog.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
              <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                {debugLog.join('\n')}
              </pre>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="text-center text-sm text-gray-500 space-y-2">
          <p>Click "Add to {walletName}" to test the wallet integration.</p>
          
          <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
            <p className="font-medium text-gray-700">Required Secrets:</p>
            {platform === 'ios' ? (
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>Apple Developer Account with Wallet capability</li>
                <li>Pass Type ID certificate (.p12)</li>
                <li>APPLE_WALLET_PASS_TYPE_ID</li>
                <li>APPLE_WALLET_TEAM_ID</li>
                <li>APPLE_WALLET_CERTIFICATE (base64)</li>
              </ul>
            ) : (
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>GOOGLE_WALLET_ISSUER_ID</li>
                <li>GOOGLE_WALLET_SERVICE_ACCOUNT</li>
              </ul>
            )}
          </div>
          
          <p className="text-xs text-gray-400">
            On desktop, the button will prompt you to open on mobile.
          </p>
        </div>
      </div>
    </div>
  );
}

