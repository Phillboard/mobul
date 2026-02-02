/**
 * Gift Card API Testing - Redirect Stub
 * 
 * This function is DEPRECATED. All provisioning logic has been consolidated
 * into provision-gift-card-unified with entryPoint: "api_test".
 * 
 * This stub exists for backward compatibility with existing callers.
 * It redirects all requests to the unified function.
 * 
 * Frontend callers:
 * - src/features/gift-cards/components/GiftCardTesting.tsx
 * - src/test/edge-functions.test.ts
 */

import { handleCORS, corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  try {
    // Parse the original request body
    const body = await req.json();

    // Add the entry point for API test flow
    const unifiedRequest = {
      ...body,
      entryPoint: 'api_test',
    };

    // Forward to unified provisioning function
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing environment variables');
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/provision-gift-card-unified`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'x-request-id': req.headers.get('x-request-id') || '',
        },
        body: JSON.stringify(unifiedRequest),
      }
    );

    // Return the unified function's response
    const result = await response.json();

    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('[REDIRECT] Error forwarding to unified:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to forward request',
        errorCode: 'REDIRECT_ERROR',
        testMode: false,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});
