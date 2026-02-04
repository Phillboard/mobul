/**
 * CORS Utilities for Edge Functions
 * 
 * Provides standardized CORS handling across all edge functions.
 */

/**
 * Standard CORS headers for all responses
 * Kept for backward compatibility with existing functions
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
};

/**
 * Full CORS headers including methods and max-age
 */
export const fullCorsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

/**
 * Handle CORS preflight requests
 * 
 * @param req - The incoming request
 * @returns A complete preflight Response for OPTIONS requests, or null if not OPTIONS
 * 
 * @example
 * const corsResponse = handleCORS(req);
 * if (corsResponse) return corsResponse;
 */
export function handleCORS(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: fullCorsHeaders,
    });
  }
  return null;
}

/**
 * Attach CORS headers to an existing response
 * 
 * @param response - The response to add CORS headers to
 * @returns A new Response with CORS headers attached
 * 
 * @example
 * return withCORS(new Response(JSON.stringify(data), { status: 200 }));
 */
export function withCORS(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  
  // Add CORS headers
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type, x-request-id');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Create a JSON response with CORS headers
 * 
 * @param data - The data to serialize to JSON
 * @param status - HTTP status code (default: 200)
 * @returns A Response with JSON body and CORS headers
 */
export function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

/**
 * Create an error response with CORS headers
 * 
 * @param message - Error message
 * @param status - HTTP status code (default: 500)
 * @param errorCode - Optional error code for client handling
 * @returns A Response with error JSON body and CORS headers
 */
export function errorJsonResponse(
  message: string,
  status: number = 500,
  errorCode?: string
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      ...(errorCode && { errorCode }),
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    }
  );
}
