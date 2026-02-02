/**
 * Accept Invitation Edge Function
 * 
 * Allows users to accept an invitation and create their account.
 * Public endpoint (user may not be authenticated yet).
 */

import { withApiGateway, ApiError, type PublicContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

// ============================================================================
// Types
// ============================================================================

interface AcceptInviteRequest {
  token: string;
  password: string;
  fullName: string;
}

interface AcceptInviteResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
  };
  message: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  org_id: string | null;
  client_id: string | null;
}

// ============================================================================
// Validation Helpers
// ============================================================================

function validateInvitation(invitation: Invitation | null): Invitation {
  if (!invitation) {
    throw new ApiError('Invalid invitation token', 'INVALID_TOKEN', 400);
  }

  if (invitation.status !== 'pending') {
    throw new ApiError(`Invitation is ${invitation.status}`, 'INVALID_STATUS', 400);
  }

  if (new Date(invitation.expires_at) < new Date()) {
    throw new ApiError('Invitation has expired', 'EXPIRED', 400);
  }

  if (!invitation.role) {
    throw new ApiError('Invitation missing role information', 'INVALID_INVITATION', 400);
  }

  return invitation;
}

function validatePassword(password: string): void {
  if (!password || password.length < 8) {
    throw new ApiError('Password must be at least 8 characters', 'VALIDATION_ERROR', 400);
  }
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleAcceptInvitation(
  request: AcceptInviteRequest,
  _context: PublicContext
): Promise<AcceptInviteResponse> {
  const { token, password, fullName } = request;

  // Validate required fields
  if (!token || !password || !fullName) {
    throw new ApiError('Token, password, and full name are required', 'VALIDATION_ERROR', 400);
  }

  validatePassword(password);

  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('accept-invitation');

  console.log('[ACCEPT-INVITATION] Processing invitation token');

  // Get invitation
  const { data: invitation, error: inviteError } = await supabase
    .from('user_invitations')
    .select('*')
    .eq('token', token)
    .single();

  if (inviteError) {
    throw new ApiError('Invalid invitation token', 'INVALID_TOKEN', 400);
  }

  // Validate invitation state
  const validInvitation = validateInvitation(invitation as Invitation);

  // Mark as expired if needed (and throw)
  if (new Date(validInvitation.expires_at) < new Date()) {
    await supabase
      .from('user_invitations')
      .update({ status: 'expired' })
      .eq('id', validInvitation.id);
    throw new ApiError('Invitation has expired', 'EXPIRED', 400);
  }

  console.log(`[ACCEPT-INVITATION] Creating account for ${validInvitation.email}`);

  // Create user account
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: validInvitation.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (authError) {
    console.error('[ACCEPT-INVITATION] Auth error:', authError);
    throw new ApiError(authError.message, 'AUTH_ERROR', 400);
  }

  const userId = authData.user.id;

  // Update profile
  await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', userId);

  // Assign role from invitation
  await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role: validInvitation.role,
    });

  // Add to organization if specified
  if (validInvitation.org_id) {
    await supabase
      .from('org_members')
      .insert({
        user_id: userId,
        org_id: validInvitation.org_id,
      });
  }

  // Add to client if specified
  if (validInvitation.client_id) {
    await supabase
      .from('client_users')
      .insert({
        user_id: userId,
        client_id: validInvitation.client_id,
      });
  }

  // Mark invitation as accepted
  await supabase
    .from('user_invitations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', validInvitation.id);

  console.log(`[ACCEPT-INVITATION] Success: ${validInvitation.email} joined as ${validInvitation.role}`);

  // Log activity
  await activityLogger.user('user_accepted_invite', 'success',
    `User ${validInvitation.email} accepted invitation and joined as ${validInvitation.role}`,
    {
      userId,
      clientId: validInvitation.client_id || undefined,
      targetUserEmail: validInvitation.email,
      role: validInvitation.role,
      metadata: {
        invitation_id: validInvitation.id,
        org_id: validInvitation.org_id,
        full_name: fullName,
      },
    }
  );

  return {
    success: true,
    user: {
      id: userId,
      email: validInvitation.email,
    },
    message: 'Invitation accepted successfully',
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleAcceptInvitation, {
  requireAuth: false, // User is not authenticated yet
  parseBody: true,
  auditAction: 'accept_invitation',
}));
