/**
 * API Gateway - Centralized Request/Response Handling
 * 
 * Provides standardized:
 * - Request validation
 * - Authentication/authorization
 * - Error handling
 * - Rate limiting hooks
 * - Audit logging
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface ApiRequest<T = any> {
  body: T;
  headers: Headers;
  method: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface AuthContext {
  user: {
    id: string;
    email: string;
    role: string;
  };
  client?: SupabaseClient;
}

export interface ValidationSchema {
  validate: (data: any) => { valid: boolean; errors?: string[] };
}

/**
 * Create authenticated Supabase client from request
 */
export async function authenticateRequest(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    throw new ApiError('No authorization header', 'UNAUTHORIZED', 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new ApiError('Invalid or expired token', 'INVALID_TOKEN', 401);
  }

  // Get user role
  const { data: profile, error: profileError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profileError) {
    throw new ApiError('User profile not found', 'PROFILE_NOT_FOUND', 403);
  }

  return {
    user: {
      id: user.id,
      email: user.email!,
      role: profile.role,
    },
    client: supabase,
  };
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string = 'INTERNAL_ERROR',
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Validate request body against schema
 */
export function validateRequest<T>(
  body: any,
  schema: ValidationSchema
): T {
  const result = schema.validate(body);
  
  if (!result.valid) {
    throw new ApiError(
      'Request validation failed',
      'VALIDATION_ERROR',
      400,
      { errors: result.errors }
    );
  }

  return body as T;
}

/**
 * Create standardized success response
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
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      ...headers,
    },
  });
}

/**
 * Create standardized error response
 */
export function errorResponse(
  error: Error | ApiError,
  headers: Record<string, string> = {}
): Response {
  const isApiError = error instanceof ApiError;
  
  const response: ApiResponse = {
    success: false,
    error: error.message,
    code: isApiError ? error.code : 'INTERNAL_ERROR',
  };

  const statusCode = isApiError ? error.statusCode : 500;

  // Log error details
  console.error('[API-ERROR]', {
    code: response.code,
    message: error.message,
    stack: error.stack,
    details: isApiError ? error.details : undefined,
  });

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      ...headers,
    },
  });
}

/**
 * Handle CORS preflight
 */
export function handleCORS(): Response {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Check rate limit (placeholder - integrate with actual rate limiter)
 */
export async function checkRateLimit(
  userId: string,
  operation: string,
  limit: number = 100,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number }> {
  // TODO: Implement actual rate limiting with Redis or Supabase
  // For now, always allow
  return {
    allowed: true,
    remaining: limit,
  };
}

/**
 * Log API audit event
 */
export async function logAuditEvent(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  metadata?: any
): Promise<void> {
  try {
    await supabase.from('audit_log').insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata: metadata || {},
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      user_agent: req.headers.get('user-agent') || null
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[AUDIT-LOG-ERROR]', error);
    // Don't fail the request if audit logging fails
  }
}

/**
 * Wrap edge function handler with standard middleware
 */
export function withApiGateway<TRequest, TResponse>(
  handler: (
    request: TRequest,
    context: AuthContext
  ) => Promise<TResponse>,
  options: {
    requireAuth?: boolean;
    requiredRole?: string;
    validateSchema?: ValidationSchema;
    rateLimitKey?: string;
    auditAction?: string;
  } = {}
) {
  return async (req: Request): Promise<Response> => {
    try {
      // Handle CORS
      if (req.method === 'OPTIONS') {
        return handleCORS();
      }

      // Authenticate if required
      let context: AuthContext | undefined;
      if (options.requireAuth !== false) {
        context = await authenticateRequest(req);

        // Check required role
        if (options.requiredRole && context.user.role !== options.requiredRole && context.user.role !== 'admin') {
          throw new ApiError(
            `This operation requires ${options.requiredRole} role`,
            'INSUFFICIENT_PERMISSIONS',
            403
          );
        }

        // Check rate limit
        if (options.rateLimitKey) {
          const rateLimit = await checkRateLimit(
            context.user.id,
            options.rateLimitKey
          );

          if (!rateLimit.allowed) {
            throw new ApiError(
              'Rate limit exceeded',
              'RATE_LIMIT_EXCEEDED',
              429
            );
          }
        }
      }

      // Parse and validate request body
      const body = await req.json();
      let validatedBody = body;

      if (options.validateSchema) {
        validatedBody = validateRequest(body, options.validateSchema);
      }

      // Execute handler
      const result = await handler(validatedBody, context!);

      // Log audit event if configured
      if (options.auditAction && context && context.client) {
        await logAuditEvent(
          context.client,
          context.user.id,
          options.auditAction,
          'api_call',
          options.rateLimitKey || 'unknown',
          { request: validatedBody }
        );
      }

      // Return success response
      return successResponse(result);
    } catch (error) {
      return errorResponse(error as Error);
    }
  };
}

/**
 * Service-to-service authentication (for internal edge function calls)
 */
export function createServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}

/**
 * Call another edge function from within an edge function
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

  const result = await response.json();
  
  if (!result.success) {
    throw new ApiError(
      result.error || `Edge function ${functionName} returned error`,
      result.code || 'EDGE_FUNCTION_ERROR',
      400
    );
  }

  return result.data;
}

