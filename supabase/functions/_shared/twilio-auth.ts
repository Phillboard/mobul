/**
 * Twilio Authorization Helpers
 * 
 * Centralized authorization logic for Twilio configuration management.
 * Used by update-twilio-config, disable-twilio-config, remove-twilio-config,
 * revalidate-twilio, get-twilio-status, etc.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================================================
// Types
// ============================================================================

export type TwilioLevel = 'client' | 'agency' | 'admin';

export interface TwilioAuthResult {
  authorized: boolean;
  isAdmin: boolean;
  reason?: string;
}

export interface TwilioLevelRequest {
  level: TwilioLevel;
  entityId?: string;
}

// ============================================================================
// Authorization Checks
// ============================================================================

/**
 * Check if user is authorized to modify/view Twilio config at the specified level.
 * 
 * Rules:
 * - Admin: Can modify any level
 * - Agency Owner: Can modify own agency and their clients
 * - Client Owner: Can only modify own client
 */
export async function checkTwilioAuthorization(
  supabase: SupabaseClient,
  userId: string,
  level: TwilioLevel,
  entityId?: string
): Promise<TwilioAuthResult> {
  // Get user roles
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  const isAdmin = roles?.some(r => r.role === 'admin') ?? false;

  // Admin can do anything
  if (isAdmin) {
    return { authorized: true, isAdmin: true };
  }

  // Admin level requires admin role
  if (level === 'admin') {
    return {
      authorized: false,
      isAdmin: false,
      reason: 'Only platform admins can modify admin-level Twilio configuration',
    };
  }

  // Agency level
  if (level === 'agency') {
    if (!entityId) {
      return { authorized: false, isAdmin: false, reason: 'Entity ID required for agency level' };
    }

    const { data: agencyRole } = await supabase
      .from('user_agencies')
      .select('role')
      .eq('user_id', userId)
      .eq('agency_id', entityId)
      .single();

    if (agencyRole?.role === 'owner') {
      return { authorized: true, isAdmin: false };
    }

    return {
      authorized: false,
      isAdmin: false,
      reason: 'Only agency owners can modify agency Twilio configuration',
    };
  }

  // Client level
  if (level === 'client') {
    if (!entityId) {
      return { authorized: false, isAdmin: false, reason: 'Entity ID required for client level' };
    }

    // Check if user's agency owns this client
    const { data: client } = await supabase
      .from('clients')
      .select('agency_id')
      .eq('id', entityId)
      .single();

    if (client?.agency_id) {
      const { data: agencyRole } = await supabase
        .from('user_agencies')
        .select('role')
        .eq('user_id', userId)
        .eq('agency_id', client.agency_id)
        .single();

      if (agencyRole?.role === 'owner') {
        return { authorized: true, isAdmin: false };
      }
    }

    // Check if user is a client owner
    const { data: clientUser } = await supabase
      .from('client_users')
      .select('user_id')
      .eq('user_id', userId)
      .eq('client_id', entityId)
      .single();

    const isCompanyOwner = roles?.some(r => r.role === 'company_owner') ?? false;

    if (clientUser && isCompanyOwner) {
      return { authorized: true, isAdmin: false };
    }

    return {
      authorized: false,
      isAdmin: false,
      reason: "Not authorized to modify this client's Twilio configuration",
    };
  }

  return { authorized: false, isAdmin: false, reason: 'Invalid level' };
}

/**
 * Check if user can view Twilio status (slightly more permissive than modify)
 */
export async function checkTwilioViewAuthorization(
  supabase: SupabaseClient,
  userId: string,
  level: 'client' | 'agency',
  entityId: string
): Promise<boolean> {
  // Get user roles
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  const isAdmin = roles?.some(r => r.role === 'admin') ?? false;
  if (isAdmin) return true;

  if (level === 'agency') {
    const { data: agencyRole } = await supabase
      .from('user_agencies')
      .select('role')
      .eq('user_id', userId)
      .eq('agency_id', entityId)
      .single();

    return agencyRole?.role === 'owner';
  }

  if (level === 'client') {
    // Check if user's agency owns this client
    const { data: client } = await supabase
      .from('clients')
      .select('agency_id')
      .eq('id', entityId)
      .single();

    if (client?.agency_id) {
      const { data: agencyRole } = await supabase
        .from('user_agencies')
        .select('role')
        .eq('user_id', userId)
        .eq('agency_id', client.agency_id)
        .single();

      if (agencyRole?.role === 'owner') return true;
    }

    // Check if user is associated with client
    const { data: clientUser } = await supabase
      .from('client_users')
      .select('user_id')
      .eq('user_id', userId)
      .eq('client_id', entityId)
      .single();

    return !!clientUser;
  }

  return false;
}

/**
 * Check if user is a platform admin
 */
export async function isUserAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  return roles?.some(r => r.role === 'admin') ?? false;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate Twilio level request parameters
 */
export function validateTwilioLevelRequest(
  level: string | undefined,
  entityId: string | undefined
): { valid: boolean; error?: string; errorCode?: string } {
  if (!level || !['client', 'agency', 'admin'].includes(level)) {
    return { valid: false, error: 'Invalid level specified', errorCode: 'INVALID_LEVEL' };
  }

  if ((level === 'client' || level === 'agency') && !entityId) {
    return { valid: false, error: 'Entity ID required for client/agency level', errorCode: 'MISSING_ENTITY_ID' };
  }

  return { valid: true };
}

/**
 * Validate phone number format (E.164)
 */
export function validateE164PhoneNumber(phoneNumber: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(phoneNumber);
}

/**
 * Validate Twilio Account SID format
 */
export function validateTwilioAccountSid(accountSid: string): boolean {
  return accountSid.startsWith('AC') && accountSid.length === 34;
}

// ============================================================================
// Twilio API Testing
// ============================================================================

/**
 * Test Twilio credentials by calling the Twilio API
 */
export async function testTwilioCredentials(
  accountSid: string,
  authToken: string,
  phoneNumber?: string
): Promise<{ success: boolean; error?: string; errorCode?: string; accountName?: string }> {
  try {
    // Validate Account SID format
    if (!validateTwilioAccountSid(accountSid)) {
      return {
        success: false,
        error: "Invalid Twilio Account SID format. Should start with 'AC' and be 34 characters.",
        errorCode: 'INVALID_SID_FORMAT',
      };
    }

    // Test authentication
    const auth = btoa(`${accountSid}:${authToken}`);
    const accountUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;

    const accountResponse = await fetch(accountUrl, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!accountResponse.ok) {
      if (accountResponse.status === 401) {
        return {
          success: false,
          error: 'Authentication failed. Please check your Auth Token.',
          errorCode: 'AUTH_FAILED',
        };
      }
      return {
        success: false,
        error: `Twilio API error: ${accountResponse.status}`,
        errorCode: 'TWILIO_ERROR',
      };
    }

    const accountData = await accountResponse.json();
    if (accountData.status === 'suspended') {
      return {
        success: false,
        error: 'This Twilio account is suspended.',
        errorCode: 'ACCOUNT_SUSPENDED',
      };
    }

    // Validate phone number if provided
    if (phoneNumber) {
      const normalizedPhone = phoneNumber.replace(/[^+\d]/g, '');
      const phoneUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(normalizedPhone)}`;

      const phoneResponse = await fetch(phoneUrl, {
        headers: { Authorization: `Basic ${auth}` },
      });

      if (!phoneResponse.ok) {
        return {
          success: false,
          error: 'Could not verify phone number.',
          errorCode: 'PHONE_LOOKUP_FAILED',
        };
      }

      const phoneData = await phoneResponse.json();
      if (!phoneData.incoming_phone_numbers || phoneData.incoming_phone_numbers.length === 0) {
        return {
          success: false,
          error: `Phone number ${phoneNumber} not found in this Twilio account.`,
          errorCode: 'PHONE_NOT_FOUND',
        };
      }

      const phoneInfo = phoneData.incoming_phone_numbers[0];
      if (!phoneInfo.capabilities?.sms) {
        return {
          success: false,
          error: `Phone number ${phoneNumber} cannot send SMS.`,
          errorCode: 'PHONE_NOT_SMS_CAPABLE',
        };
      }
    }

    return { success: true, accountName: accountData.friendly_name };
  } catch (_error) {
    return {
      success: false,
      error: 'Could not connect to Twilio. Please try again.',
      errorCode: 'NETWORK_ERROR',
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  checkTwilioAuthorization,
  checkTwilioViewAuthorization,
  isUserAdmin,
  validateTwilioLevelRequest,
  validateE164PhoneNumber,
  validateTwilioAccountSid,
  testTwilioCredentials,
};
