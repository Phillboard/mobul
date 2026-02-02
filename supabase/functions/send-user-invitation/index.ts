/**
 * Send User Invitation Edge Function
 * 
 * Creates a user invitation and sends an email with the invite link.
 * Uses the shared email provider and templates.
 */

import { withApiGateway, ApiError, AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { sendEmail } from '../_shared/email-provider.ts';
import { buildInvitationEmailHtml } from '../_shared/email-templates.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

interface InvitationRequest {
  email: string;
  role: string;
  orgId?: string;
  clientId?: string;
  message?: string;
}

interface InvitationResponse {
  success: boolean;
  invitation: {
    id: string;
    email: string;
    role: string;
    token: string;
  };
  inviteUrl: string;
  message: string;
  emailSent: boolean;
}

const VALID_ROLES = ['admin', 'tech_support', 'agency_owner', 'company_owner', 'developer', 'call_center'];

const roleRequirements: Record<string, { requiresOrg: boolean; requiresClient: boolean }> = {
  admin: { requiresOrg: false, requiresClient: false },
  tech_support: { requiresOrg: false, requiresClient: false },
  agency_owner: { requiresOrg: true, requiresClient: false },
  company_owner: { requiresOrg: false, requiresClient: true },
  developer: { requiresOrg: false, requiresClient: false },
  call_center: { requiresOrg: false, requiresClient: true },
};

const roleHierarchy: Record<string, string[]> = {
  admin: ['admin', 'tech_support', 'agency_owner', 'company_owner', 'developer', 'call_center'],
  tech_support: ['agency_owner', 'company_owner', 'developer', 'call_center'],
  agency_owner: ['company_owner', 'call_center'],
  company_owner: ['call_center'],
  developer: [],
  call_center: [],
};

async function handleSendUserInvitation(
  request: InvitationRequest,
  context: AuthContext,
  rawRequest: Request
): Promise<InvitationResponse> {
  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('send-user-invitation', rawRequest);

  const { email, role, orgId, clientId, message } = request;
  const userId = context.user.id;

  // Validate required fields
  if (!email || !role) {
    throw new ApiError('Email and role are required', 'VALIDATION_ERROR', 400);
  }

  // Validate role
  if (!VALID_ROLES.includes(role)) {
    throw new ApiError(`Invalid role: ${role}`, 'VALIDATION_ERROR', 400);
  }

  // Get inviter's role
  const { data: inviterRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (!inviterRole) {
    throw new ApiError('Inviter role not found', 'AUTHORIZATION_ERROR', 403);
  }

  // Check permission to invite
  const canInvite = roleHierarchy[inviterRole.role];
  if (!canInvite || !canInvite.includes(role)) {
    throw new ApiError(
      `You do not have permission to invite ${role} users`,
      'AUTHORIZATION_ERROR',
      403
    );
  }

  // Validate org/client requirements
  const requirements = roleRequirements[role];
  if (requirements.requiresOrg && !orgId) {
    throw new ApiError(`Organization is required for ${role} role`, 'VALIDATION_ERROR', 400);
  }
  if (requirements.requiresClient && !clientId) {
    throw new ApiError(`Client is required for ${role} role`, 'VALIDATION_ERROR', 400);
  }

  // Check for existing user
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    throw new ApiError('User with this email already exists', 'CONFLICT', 409);
  }

  // Check for pending invitation
  const { data: existingInvite } = await supabase
    .from('user_invitations')
    .select('id')
    .eq('email', email)
    .eq('status', 'pending')
    .single();

  if (existingInvite) {
    throw new ApiError('Pending invitation already exists for this email', 'CONFLICT', 409);
  }

  // Get inviter details
  const { data: inviter } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId)
    .single();

  // Create invitation
  const { data: invitation, error: inviteError } = await supabase
    .from('user_invitations')
    .insert({
      email,
      role,
      org_id: orgId,
      client_id: clientId,
      invited_by: userId,
      metadata: { message, inviter_name: inviter?.full_name },
    })
    .select()
    .single();

  if (inviteError) {
    throw new ApiError(`Failed to create invitation: ${inviteError.message}`, 'DATABASE_ERROR', 500);
  }

  // Get organization/client name
  let orgName = 'the platform';
  if (clientId) {
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', clientId)
      .single();
    orgName = client?.name || 'the organization';
  } else if (orgId) {
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single();
    orgName = org?.name || 'the organization';
  }

  // Build invite URL
  const origin = rawRequest.headers.get('origin') || Deno.env.get('APP_URL') || '';
  const inviteUrl = `${origin}/accept-invite?token=${encodeURIComponent(invitation.token)}`;
  
  const roleDisplay = role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  // Build email HTML using shared template
  const emailHtml = buildInvitationEmailHtml({
    inviterName: inviter?.full_name || '',
    inviterEmail: inviter?.email,
    organizationName: orgName,
    roleName: roleDisplay,
    inviteUrl,
    message,
    expiresIn: '7 days',
  });

  // Send invitation email
  let emailSent = false;
  const emailResult = await sendEmail({
    to: email,
    subject: `You're invited to join ${orgName}`,
    html: emailHtml,
  });

  emailSent = emailResult.success;

  if (!emailSent) {
    console.warn(`[INVITATION] Email failed but invitation created: ${emailResult.error}`);
  }

  console.log(`[INVITATION] Created for ${email} with role ${role}`);

  // Log activity
  await activityLogger.user('user_invited', 'success',
    `${inviter?.full_name || inviter?.email} invited ${email} as ${roleDisplay}`,
    {
      userId,
      clientId,
      targetUserEmail: email,
      role,
      metadata: {
        invitation_id: invitation.id,
        org_id: orgId,
        org_name: orgName,
        email_sent: emailSent,
      },
    }
  );

  return {
    success: true,
    invitation: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      token: invitation.token,
    },
    inviteUrl,
    message: emailSent 
      ? 'Invitation sent successfully' 
      : 'Invitation created but email delivery failed',
    emailSent,
  };
}

Deno.serve(withApiGateway(handleSendUserInvitation, {
  requireAuth: true,
  parseBody: true,
}));
