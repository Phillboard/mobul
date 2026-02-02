/**
 * Create Preview Link Edge Function
 * 
 * Creates a secure, optionally password-protected preview link for campaigns.
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';

// ============================================================================
// Types
// ============================================================================

interface CreatePreviewLinkRequest {
  campaignId: string;
  password?: string;
  expiresInHours?: number;
  maxViews?: number;
}

interface CreatePreviewLinkResponse {
  success: boolean;
  previewLink: {
    id: string;
    token: string;
    expires_at: string;
    max_views: number | null;
  };
  url: string;
}

// ============================================================================
// Helpers
// ============================================================================

function generateSecureToken(): string {
  const tokenBytes = new Uint8Array(16);
  crypto.getRandomValues(tokenBytes);
  return Array.from(tokenBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleCreatePreviewLink(
  request: CreatePreviewLinkRequest,
  context: AuthContext
): Promise<CreatePreviewLinkResponse> {
  const { campaignId, password, expiresInHours = 168, maxViews } = request;

  if (!campaignId) {
    throw new ApiError('Campaign ID is required', 'VALIDATION_ERROR', 400);
  }

  const supabase = createServiceClient();

  // Generate unique token
  const token = generateSecureToken();

  // Hash password if provided
  let passwordHash: string | null = null;
  if (password) {
    passwordHash = await hashPassword(password);
  }

  // Calculate expiration (default 7 days)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  // Create preview link
  const { data, error } = await supabase
    .from('preview_links')
    .insert({
      campaign_id: campaignId,
      token,
      password_hash: passwordHash,
      expires_at: expiresAt.toISOString(),
      max_views: maxViews || null,
      created_by_user_id: context.user.id,
    })
    .select()
    .single();

  if (error) {
    throw new ApiError(`Failed to create preview link: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  console.log(`[CREATE-PREVIEW-LINK] Preview link created for campaign ${campaignId}: ${token}`);

  // Build preview URL
  const appUrl = Deno.env.get('PUBLIC_APP_URL') ||
    Deno.env.get('SUPABASE_URL')?.replace('/v1', '') ||
    'https://app.mobul.com';
  const url = `${appUrl}/preview/${token}`;

  return {
    success: true,
    previewLink: {
      id: data.id,
      token: data.token,
      expires_at: data.expires_at,
      max_views: data.max_views,
    },
    url,
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleCreatePreviewLink, {
  requireAuth: true,
  parseBody: true,
  auditAction: 'create_preview_link',
}));
