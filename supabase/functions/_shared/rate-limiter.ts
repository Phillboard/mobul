/**
 * Rate Limiter Utility for Edge Functions
 * 
 * Implements IP-based rate limiting using Supabase for storage.
 * Prevents abuse and DoS attacks on public endpoints.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
  identifier?: string; // Optional custom identifier (defaults to IP)
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // Seconds until next allowed request
}

/**
 * Check if a request is allowed based on rate limit
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  req: Request,
  config: RateLimitConfig,
  endpoint: string
): Promise<RateLimitResult> {
  // Get identifier (IP address or custom)
  const identifier = config.identifier || getClientIp(req);
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  // Count requests in current window
  const { data: requests, error } = await supabase
    .from('rate_limit_tracking')
    .select('id, created_at', { count: 'exact', head: false })
    .eq('endpoint', endpoint)
    .eq('identifier', identifier)
    .gte('created_at', windowStart.toISOString());

  if (error) {
    console.error('Rate limit check error:', error);
    // On error, allow request but log
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(now.getTime() + config.windowMs),
    };
  }

  const requestCount = requests?.length || 0;
  const remaining = Math.max(0, config.maxRequests - requestCount);
  const resetAt = new Date(now.getTime() + config.windowMs);

  if (requestCount >= config.maxRequests) {
    // Rate limit exceeded
    const oldestRequest = requests?.[0];
    const oldestTime = oldestRequest ? new Date(oldestRequest.created_at as string) : now;
    const retryAfter = Math.ceil((oldestTime.getTime() + config.windowMs - now.getTime()) / 1000);

    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter: Math.max(1, retryAfter),
    };
  }

  // Record this request
  await supabase
    .from('rate_limit_tracking')
    .insert({
      endpoint,
      identifier,
      user_agent: req.headers.get('user-agent') || 'unknown',
    });

  return {
    allowed: true,
    remaining: remaining - 1, // Account for current request
    resetAt,
  };
}

/**
 * Create a rate limit response with proper headers
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  const headers: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': 'application/json',
    'X-RateLimit-Limit': String(result.remaining + (result.allowed ? 1 : 0)),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
  };

  if (!result.allowed && result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: `Rate limit exceeded. Please try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers,
      }
    );
  }

  return new Response(
    JSON.stringify({ error: 'Unexpected rate limit response' }),
    { status: 500, headers }
  );
}

/**
 * Extract client IP from request headers
 */
function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}
