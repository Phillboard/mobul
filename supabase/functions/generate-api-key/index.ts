/**
 * Generate API Key Edge Function
 * 
 * Creates a new API key for a client.
 * Authenticated endpoint - user must have access to the client.
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

// ============================================================================
// Types
// ============================================================================

interface GenerateApiKeyRequest {
  client_id: string;
  name: string;
}

interface GenerateApiKeyResponse {
  id: string;
  api_key: string;
  key_prefix: string;
}

// ============================================================================
// Helpers
// ============================================================================

function generateSecureApiKey(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return `ace_live_${Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function createKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 9) + '••••••••' + apiKey.slice(-4);
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleGenerateApiKey(
  request: GenerateApiKeyRequest,
  context: AuthContext
): Promise<GenerateApiKeyResponse> {
  const { client_id, name } = request;

  if (!client_id || !name) {
    throw new ApiError('Missing required fields: client_id, name', 'VALIDATION_ERROR', 400);
  }

  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('generate-api-key');

  // Verify user has access to this client
  const { data: clientAccess, error: accessError } = await supabase
    .rpc('user_can_access_client', {
      _user_id: context.user.id,
      _client_id: client_id,
    });

  if (accessError || !clientAccess) {
    throw new ApiError('You do not have permission to create API keys for this client', 'FORBIDDEN', 403);
  }

  // Generate API key
  const apiKey = generateSecureApiKey();
  const keyHash = await hashApiKey(apiKey);
  const keyPrefix = createKeyPrefix(apiKey);

  // Insert the API key into the database
  const { data: apiKeyData, error } = await supabase
    .from('api_keys')
    .insert({
      client_id,
      name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      created_by: context.user.id,
    })
    .select()
    .single();

  if (error) {
    throw new ApiError(`Failed to create API key: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  console.log(`[GENERATE-API-KEY] API key created: ${apiKeyData.id} for client ${client_id}`);

  // Log activity
  await activityLogger.api('api_key_created', 'success', {
    userId: context.user.id,
    clientId: client_id,
    description: `API key "${name}" created`,
    metadata: {
      api_key_id: apiKeyData.id,
      key_name: name,
      key_prefix: keyPrefix,
    },
  });

  return {
    id: apiKeyData.id,
    api_key: apiKey, // Return full key only once
    key_prefix: keyPrefix,
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleGenerateApiKey, {
  requireAuth: true,
  parseBody: true,
  auditAction: 'generate_api_key',
}));
