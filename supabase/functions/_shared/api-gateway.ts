/**
 * API Gateway - Centralized Request/Response Handling
 * 
 * Provides standardized:
 * - CORS handling (via cors.ts)
 * - Request validation
 * - Authentication/authorization
 * - Role-based access control
 * - Error handling with consistent format
 * - Rate limiting hooks
 * - Audit logging
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { handleCORS as handleCORSPreflight, corsHeaders } from './cors.ts';
import { createServiceClient } from './supabase.ts';

// ============================================================================
// Types
// ============================================================================

export interface ApiRequest<T = unknown> {
  body: T;
  headers: Headers;
  method: string;
  url: URL;
  rawRequest: Request;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

export interface AuthContext {
  user: {
    id: string;
    email: string;
    role: string;
  };
  organization_id: string | null;
  client: SupabaseClient;
}

/**
 * Context provided to handlers when auth is not required
 */
export interface PublicContext {
  user: null;
  organization_id: null;
  client: SupabaseClient; // Service client for public endpoints
}

export interface ValidationSchema {
  validate: (data: unknown) => { valid: boolean; errors?: string[] };
}

/**
 * Valid user roles in the system
 */
export type UserRole =
  | 'admin'
  | 'platform_admin'
  | 'agency_owner'
  | 'agency_user'
  | 'client_admin'
  | 'client_user'
  | 'call_center_agent'
  | 'call_center_supervisor';

/**
 * Options for withApiGateway wrapper
 */
export interface ApiGatewayOptions {
  /**
   * Whether authentication is required (default: true)
   * Set to false for public endpoints or webhooks
   */
  requireAuth?: boolean;
  
  /**
   * Required role(s) for access. Can be a single role or array.
   * 'admin' role always has access to everything.
   * If array, user must have at least one of the roles.
   */
  requiredRole?: UserRole | UserRole[];
  
  /**
   * Schema for validating request body
   */
  validateSchema?: ValidationSchema;
  
  /**
   * Whether to parse request body as JSON (default: true)
   * Set to false for GET-only endpoints or form data
   */
  parseBody?: boolean;
  
  /**
   * Key for rate limiting (e.g., 'gift-card-provision')
   */
  rateLimitKey?: string;
  
  /**
   * Rate limit: max requests per window
   */
  rateLimit?: number;
  
  /**
   * Rate limit window in seconds (default: 60)
   */
  rateLimitWindow?: number;
  
  /**
   * Action name for audit logging
   */
  auditAction?: string;
}

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Custom API Error class with status code and error code
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string = 'INTERNAL_ERROR',
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Create standardized success response
 * Format: { success: true, data: T }
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200,
  headers: Record<string, string> = {}
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...headers,
    },
  });
}

/**
 * Create standardized error response
 * Format: { success: false, error: string, errorCode?: string }
 */
export function errorResponse(
  error: Error | ApiError | string,
  headers: Record<string, string> = {}
): Response {
  const isApiError = error instanceof ApiError;
  const isError = error instanceof Error;
  
  const message = typeof error === 'string' ? error : error.message;
  const code = isApiError ? error.code : 'INTERNAL_ERROR';
  const statusCode = isApiError ? error.statusCode : 500;
  const details = isApiError ? error.details : undefined;

  const response: ApiResponse = {
    success: false,
    error: message,
    errorCode: code,
  };

  // Log error details (not exposed to client)
  console.error('[API-ERROR]', {
    code,
    message,
    stack: isError ? error.stack : undefined,
    details,
  });

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...headers,
    },
  });
}

/**
 * Handle CORS preflight - delegates to cors.ts
 * @deprecated Use handleCORS from cors.ts directly
 */
export function handleCORS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// ============================================================================
// Authentication
// ============================================================================

/**
 * Authenticate request and return user context
 */
export async function authenticateRequest(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    throw new ApiError('No authorization header', 'UNAUTHORIZED', 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createServiceClient();

  // Verify the token and get user
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new ApiError('Invalid or expired token', 'INVALID_TOKEN', 401);
  }

  // Get user role from user_roles table
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role, organization_id')
    .eq('user_id', user.id)
    .single();

  if (roleError && roleError.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is OK for new users
    console.warn('[AUTH] Error fetching role:', roleError);
  }

  // Try to get organization_id from multiple sources:
  // 1. user_roles table
  // 2. user metadata
  // 3. app metadata
  const organization_id = 
    roleData?.organization_id ||
    (user.user_metadata?.organization_id as string) ||
    (user.app_metadata?.organization_id as string) ||
    null;

  return {
    user: {
      id: user.id,
      email: user.email || '',
      role: roleData?.role || 'user',
    },
    organization_id,
    client: supabase,
  };
}

/**
 * Check if user has required role
 */
function checkRole(userRole: string, requiredRole: UserRole | UserRole[]): boolean {
  // Admin always has access
  if (userRole === 'admin' || userRole === 'platform_admin') {
    return true;
  }
  
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(userRole as UserRole);
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Check rate limit using Supabase database
 * 
 * Uses a sliding window algorithm. Falls open (allows request) if check fails.
 */
export async function checkRateLimit(
  userId: string,
  operation: string,
  limit: number = 100,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  try {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase.rpc('check_and_increment_rate_limit', {
      p_identifier: userId,
      p_endpoint: operation,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.error('[RATE-LIMIT] Check failed:', error);
      // Fail open - allow the request if rate limiting fails
      return { allowed: true, remaining: limit };
    }

    return {
      allowed: data.allowed,
      remaining: data.remaining,
      retryAfter: data.allowed ? undefined : data.retry_after,
    };
  } catch (error) {
    console.error('[RATE-LIMIT] Unexpected error:', error);
    // Fail open
    return { allowed: true, remaining: limit };
  }
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate request body against schema
 */
export function validateRequest<T>(
  body: unknown,
  schema: ValidationSchema
): T {
  const result = schema.validate(body);
  
  if (!result.valid) {
    throw new ApiError(
      result.errors?.join(', ') || 'Request validation failed',
      'VALIDATION_ERROR',
      400,
      { errors: result.errors }
    );
  }

  return body as T;
}

// ============================================================================
// Audit Logging
// ============================================================================

/**
 * Log API audit event
 */
export async function logAuditEvent(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  metadata?: unknown,
  req?: Request
): Promise<void> {
  try {
    await supabase.from('audit_log').insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata: metadata || {},
      ip_address: req?.headers.get('x-forwarded-for') || req?.headers.get('x-real-ip') || null,
      user_agent: req?.headers.get('user-agent') || null,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[AUDIT-LOG-ERROR]', error);
    // Don't fail the request if audit logging fails
  }
}

// ============================================================================
// Main Gateway Wrapper
// ============================================================================

/**
 * Handler function type for authenticated endpoints
 */
type AuthenticatedHandler<TRequest, TResponse> = (
  request: TRequest,
  context: AuthContext,
  rawRequest: Request
) => Promise<TResponse>;

/**
 * Handler function type for public endpoints
 */
type PublicHandler<TRequest, TResponse> = (
  request: TRequest,
  context: PublicContext,
  rawRequest: Request
) => Promise<TResponse>;

/**
 * Wrap edge function handler with standard middleware
 * 
 * Features:
 * - CORS handling (preflight + response headers)
 * - Authentication (optional)
 * - Role-based access control
 * - Request body parsing (optional)
 * - Request validation (optional)
 * - Rate limiting (optional)
 * - Audit logging (optional)
 * - Consistent error responses
 * 
 * @example
 * // Authenticated endpoint
 * Deno.serve(withApiGateway(
 *   async (body, context) => {
 *     // context.user is available
 *     return { message: 'Hello ' + context.user.email };
 *   },
 *   { requiredRole: 'admin' }
 * ));
 * 
 * @example
 * // Public endpoint (webhook)
 * Deno.serve(withApiGateway(
 *   async (body, context) => {
 *     // context.user is null
 *     return { received: true };
 *   },
 *   { requireAuth: false }
 * ));
 * 
 * @example
 * // GET-only endpoint
 * Deno.serve(withApiGateway(
 *   async (_body, context, rawRequest) => {
 *     const url = new URL(rawRequest.url);
 *     const id = url.searchParams.get('id');
 *     return { id };
 *   },
 *   { parseBody: false }
 * ));
 */
export function withApiGateway<TRequest, TResponse>(
  handler: AuthenticatedHandler<TRequest, TResponse> | PublicHandler<TRequest, TResponse>,
  options: ApiGatewayOptions = {}
): (req: Request) => Promise<Response> {
  const {
    requireAuth = true,
    requiredRole,
    validateSchema,
    parseBody = true,
    rateLimitKey,
    rateLimit = 100,
    rateLimitWindow = 60,
    auditAction,
  } = options;

  return async (req: Request): Promise<Response> => {
    try {
      // Handle CORS preflight using cors.ts
      const corsResponse = handleCORSPreflight(req);
      if (corsResponse) {
        return corsResponse;
      }

      // Authenticate if required
      let context: AuthContext | PublicContext;
      
      if (requireAuth) {
        context = await authenticateRequest(req);

        // Check required role
        if (requiredRole && !checkRole(context.user.role, requiredRole)) {
          const roleList = Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole;
          throw new ApiError(
            `This operation requires ${roleList} role`,
            'INSUFFICIENT_PERMISSIONS',
            403
          );
        }

        // Check rate limit for authenticated users
        if (rateLimitKey) {
          const rateLimitResult = await checkRateLimit(
            context.user.id,
            rateLimitKey,
            rateLimit,
            rateLimitWindow
          );

          if (!rateLimitResult.allowed) {
            throw new ApiError(
              `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
              'RATE_LIMIT_EXCEEDED',
              429
            );
          }
        }
      } else {
        // Public endpoint - provide service client
        context = {
          user: null,
          organization_id: null,
          client: createServiceClient(),
        };
      }

      // Parse request body if needed
      let body: TRequest | null = null;
      
      if (parseBody) {
        try {
          const contentType = req.headers.get('content-type') || '';
          
          if (contentType.includes('application/json')) {
            const text = await req.text();
            body = text ? JSON.parse(text) : null;
          } else if (contentType.includes('application/x-www-form-urlencoded')) {
            // Handle form data
            const formData = await req.formData();
            const formObject: Record<string, unknown> = {};
            formData.forEach((value, key) => {
              formObject[key] = value;
            });
            body = formObject as TRequest;
          }
        } catch (parseError) {
          // Body parsing failed - might be empty or malformed
          // Only throw if we actually need the body
          if (validateSchema) {
            throw new ApiError(
              'Invalid request body - expected valid JSON',
              'INVALID_JSON',
              400
            );
          }
        }
      }

      // Validate body if schema provided
      if (validateSchema && body !== null) {
        body = validateRequest<TRequest>(body, validateSchema);
      }

      // Execute handler
      const result = await (handler as AuthenticatedHandler<TRequest, TResponse>)(
        body as TRequest,
        context as AuthContext,
        req
      );

      // Log audit event if configured
      if (auditAction && requireAuth && (context as AuthContext).user) {
        const authContext = context as AuthContext;
        await logAuditEvent(
          authContext.client,
          authContext.user.id,
          auditAction,
          'api_call',
          rateLimitKey || 'unknown',
          { request: body },
          req
        );
      }

      // Return success response
      return successResponse(result);
    } catch (error) {
      return errorResponse(error as Error);
    }
  };
}

// ============================================================================
// Service-to-Service Communication
// ============================================================================

/**
 * Call another edge function from within an edge function
 * 
 * @param functionName - Name of the edge function to call
 * @param body - Request body
 * @returns Response data
 */
export async function callEdgeFunction<TRequest, TResponse>(
  functionName: string,
  body: TRequest
): Promise<TResponse> {
  const response = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/${functionName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(
      `Edge function ${functionName} failed: ${errorText}`,
      'EDGE_FUNCTION_ERROR',
      response.status
    );
  }

  const result = await response.json() as ApiResponse<TResponse>;
  
  if (!result.success) {
    throw new ApiError(
      result.error || `Edge function ${functionName} returned error`,
      result.errorCode || 'EDGE_FUNCTION_ERROR',
      400
    );
  }

  return result.data as TResponse;
}

// ============================================================================
// Re-export for convenience
// ============================================================================

export { handleCORSPreflight as handleCORSFromCors };