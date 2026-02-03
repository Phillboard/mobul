/**
 * Shared Supabase Client for Edge Functions
 * 
 * Provides factory functions for creating Supabase clients with different auth contexts.
 * Use these instead of creating clients manually to ensure consistent configuration.
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

/**
 * Cached service client instance (singleton)
 */
let serviceClient: SupabaseClient | null = null;

/**
 * Create a Supabase client with service role (admin) access
 * 
 * Use for server-side operations that need full database access
 * and should bypass RLS policies.
 * 
 * @returns SupabaseClient with service role privileges
 * @throws Error if SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing
 * 
 * @example
 * const supabase = createServiceClient();
 * const { data } = await supabase.from('users').select('*');
 */
export function createServiceClient(): SupabaseClient {
  if (!serviceClient) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    serviceClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
  }
  
  return serviceClient;
}

/**
 * Create a Supabase client with user's JWT token from Authorization header
 * 
 * Use for operations that should respect RLS policies and act
 * on behalf of the authenticated user.
 * 
 * @param authHeader - The full Authorization header value (e.g., "Bearer xxx")
 * @returns SupabaseClient with user's auth context
 * @throws Error if SUPABASE_URL or SUPABASE_ANON_KEY is missing
 * 
 * @example
 * const authHeader = req.headers.get('Authorization')!;
 * const supabase = createUserClient(authHeader);
 */
export function createUserClient(authHeader: string): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  }

  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Authorization: authHeader },
    },
    auth: { persistSession: false },
  });
}

/**
 * Create a Supabase client from a Request object
 * 
 * Convenience wrapper that extracts the Authorization header from the request.
 * Use for operations that should respect RLS policies.
 * 
 * @param req - The incoming Request object
 * @returns SupabaseClient with user's auth context, or null if no auth header
 * 
 * @example
 * const supabase = createAuthenticatedClient(req);
 * if (!supabase) return errorResponse('Unauthorized', 401);
 */
export function createAuthenticatedClient(req: Request): SupabaseClient | null {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    return null;
  }

  return createUserClient(authHeader);
}

/**
 * Extract JWT token from Authorization header
 * 
 * @param req - The incoming Request object
 * @returns The JWT token string, or null if not present
 */
export function extractToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    return null;
  }

  // Handle both "Bearer xxx" and just "xxx" formats
  return authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;
}

/**
 * Verify a JWT token and get the user
 * 
 * @param token - The JWT token to verify
 * @returns The user object if valid, null otherwise
 */
export async function verifyToken(token: string): Promise<{
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
} | null> {
  try {
    const supabase = createServiceClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}