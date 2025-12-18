/**
 * test-sms-provider
 * 
 * Edge function for testing SMS provider configuration and delivery.
 * Returns detailed provider status and test results for admin diagnostics.
 * 
 * Supports two modes:
 * 1. Status check (no phone/message) - Returns provider configuration status
 * 2. Send test (with phone/message) - Sends test SMS and returns detailed results
 * 
 * Request body:
 * {
 *   mode: 'status' | 'send',
 *   phone?: string,        // Required for 'send' mode
 *   message?: string,      // Required for 'send' mode
 *   provider?: string,     // Optional: force specific provider
 * }
 * 
 * Response for status mode:
 * {
 *   success: true,
 *   providers: {
 *     notificationapi: { available: boolean, active: boolean, role: string },
 *     infobip: { available: boolean, active: boolean, role: string },
 *     twilio: { available: boolean, active: boolean, role: string },
 *     eztexting: { available: boolean, active: boolean, role: string, credits?: number }
 *   },
 *   primaryProvider: string,
 *   fallbackChain: string[],
 *   fallbackEnabled: boolean
 * }
 * 
 * Response for send mode:
 * {
 *   success: boolean,
 *   provider: string,
 *   messageId?: string,
 *   status?: string,
 *   error?: string,
 *   fallbackUsed?: boolean,
 *   attempts?: Array<{ provider: string, success: boolean, error?: string }>,
 *   duration: number
 * }
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";
import { sendSMS, getCurrentProviderConfig, formatPhoneE164 } from "../_shared/sms-provider.ts";
import { getEZTextingClient } from "../_shared/eztexting-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Phone number validation regex (US numbers)
const PHONE_REGEX = /^\+?1?[\s.-]?\(?[0-9]{3}\)?[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}$/;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    const mode = requestData.mode || 'status';
    
    console.log(`[TEST-SMS-PROVIDER] Mode: ${mode}`);

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Mode: Status check
    if (mode === 'status') {
      const config = await getCurrentProviderConfig(supabaseAdmin);
      
      // Build provider status map
      const providers: Record<string, { 
        available: boolean; 
        active: boolean; 
        role: string;
        credits?: number;
      }> = {
        notificationapi: {
          available: config.notificationapiAvailable,
          active: config.activeProvider === 'notificationapi',
          role: getProviderRole('notificationapi', config.settings.primaryProvider, config.fallbackChain),
        },
        infobip: {
          available: config.infobipAvailable,
          active: config.activeProvider === 'infobip',
          role: getProviderRole('infobip', config.settings.primaryProvider, config.fallbackChain),
        },
        twilio: {
          available: config.twilioAvailable,
          active: config.activeProvider === 'twilio',
          role: getProviderRole('twilio', config.settings.primaryProvider, config.fallbackChain),
        },
        eztexting: {
          available: config.eztextingAvailable,
          active: config.activeProvider === 'eztexting',
          role: getProviderRole('eztexting', config.settings.primaryProvider, config.fallbackChain),
        },
      };

      // Try to get EZTexting credits if available
      if (config.eztextingAvailable) {
        try {
          const eztextingClient = getEZTextingClient();
          const balanceResult = await eztextingClient.getCreditBalance();
          if (balanceResult.credits !== undefined) {
            providers.eztexting.credits = balanceResult.credits;
          }
        } catch (e) {
          console.warn('[TEST-SMS-PROVIDER] Could not fetch EZTexting credits:', e);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        providers,
        primaryProvider: config.settings.primaryProvider,
        fallbackChain: config.fallbackChain,
        fallbackEnabled: config.settings.enableFallback,
        activeProvider: config.activeProvider,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode: Send test SMS
    if (mode === 'send') {
      const phone = requestData.phone;
      const message = requestData.message;
      const forceProvider = requestData.provider;

      if (!phone) {
        return new Response(JSON.stringify({
          success: false,
          error: "Phone number is required for send mode",
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!message) {
        return new Response(JSON.stringify({
          success: false,
          error: "Message is required for send mode",
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate phone format
      if (!PHONE_REGEX.test(phone)) {
        return new Response(JSON.stringify({
          success: false,
          error: "Invalid phone number format. Use US format: (xxx) xxx-xxxx or +1xxxxxxxxxx",
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const formattedPhone = formatPhoneE164(phone);
      console.log(`[TEST-SMS-PROVIDER] Sending test SMS to ${formattedPhone}`);

      const startTime = Date.now();

      // Send SMS using the provider abstraction layer
      const smsResult = await sendSMS(formattedPhone, message, supabaseAdmin);

      const duration = Date.now() - startTime;

      // Log the test to database (optional - for admin audit)
      try {
        await supabaseAdmin.from("sms_delivery_log").insert({
          phone: formattedPhone,
          message: message.substring(0, 160),
          status: smsResult.success ? 'sent' : 'failed',
          provider_used: smsResult.provider,
          message_sid: smsResult.messageId || null,
          error_message: smsResult.error || null,
          metadata: {
            test: true,
            duration,
            fallbackUsed: smsResult.fallbackUsed,
            attempts: smsResult.attempts,
          },
        });
      } catch (logError) {
        console.warn('[TEST-SMS-PROVIDER] Could not log test SMS:', logError);
      }

      return new Response(JSON.stringify({
        success: smsResult.success,
        provider: smsResult.provider,
        messageId: smsResult.messageId,
        status: smsResult.status,
        error: smsResult.error,
        fallbackUsed: smsResult.fallbackUsed || false,
        attempts: smsResult.attempts,
        formattedPhone,
        duration,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Unknown mode
    return new Response(JSON.stringify({
      success: false,
      error: `Unknown mode: ${mode}. Use 'status' or 'send'.`,
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[TEST-SMS-PROVIDER] Error:", errorMessage);
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Determine the role of a provider in the current configuration
 */
function getProviderRole(
  provider: string, 
  primaryProvider: string, 
  fallbackChain: string[]
): string {
  if (provider === primaryProvider) {
    return 'primary';
  }
  
  const fallbackIndex = fallbackChain.indexOf(provider);
  if (fallbackIndex >= 0) {
    return `fallback-${fallbackIndex + 1}`;
  }
  
  return 'disabled';
}
