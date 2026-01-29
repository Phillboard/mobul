/**
 * Update Twilio Configuration Edge Function
 * 
 * Saves Twilio configuration for client, agency, or admin level.
 * Requires successful connection test before saving (unless admin bypasses).
 * 
 * Authorization:
 * - Admin: Can modify any level
 * - Agency Owner: Can modify own agency and their clients
 * - Client Owner: Can only modify own client
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { encryptAuthToken } from '../_shared/twilio-encryption.ts';

type TwilioLevel = 'client' | 'agency' | 'admin';

interface UpdateTwilioRequest {
  level: TwilioLevel;
  entityId?: string; // Required for client/agency, null for admin
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  enabled: boolean;
  friendlyName?: string;
  monthlyLimit?: number;
  skipValidation?: boolean; // Admin only, for emergency bypass
  expectedVersion?: number; // For optimistic locking
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', errorCode: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', errorCode: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: UpdateTwilioRequest = await req.json();
    const { 
      level, 
      entityId, 
      accountSid, 
      authToken, 
      phoneNumber, 
      enabled, 
      friendlyName,
      monthlyLimit,
      skipValidation,
      expectedVersion 
    } = body;

    console.log(`[UPDATE-TWILIO] User ${user.id} updating ${level} config${entityId ? ` for ${entityId}` : ''}`);

    // Validate required fields
    if (!level || !['client', 'agency', 'admin'].includes(level)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid level specified', errorCode: 'INVALID_LEVEL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if ((level === 'client' || level === 'agency') && !entityId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Entity ID required for client/agency level', errorCode: 'MISSING_ENTITY_ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!accountSid || !authToken || !phoneNumber) {
      return new Response(
        JSON.stringify({ success: false, error: 'Account SID, Auth Token, and Phone Number are required', errorCode: 'MISSING_FIELDS' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone number format (E.164)
    if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone number must be in E.164 format (e.g., +12025551234)', errorCode: 'INVALID_PHONE_FORMAT' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check authorization
    const authResult = await checkAuthorization(supabase, user.id, level, entityId);
    if (!authResult.authorized) {
      return new Response(
        JSON.stringify({ success: false, error: authResult.reason, errorCode: 'UNAUTHORIZED' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check optimistic locking if version provided
    if (expectedVersion !== undefined) {
      const versionCheck = await checkVersion(supabase, level, entityId, expectedVersion);
      if (!versionCheck.valid) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Configuration was modified by another user. Please refresh and try again.',
            errorCode: 'VERSION_CONFLICT'
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate credentials with Twilio (unless admin bypasses)
    if (!skipValidation || !authResult.isAdmin) {
      const testResult = await testTwilioCredentials(accountSid, authToken, phoneNumber);
      if (!testResult.success) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: testResult.error,
            errorCode: testResult.errorCode
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Configure webhooks on the Twilio phone number (non-blocking)
    // This ensures inbound SMS/calls are routed to our edge functions
    const webhookResult = await configureTwilioWebhooks(accountSid, authToken, phoneNumber);
    if (!webhookResult.success) {
      console.warn(`[UPDATE-TWILIO] Webhook config warning: ${webhookResult.error}`);
      // Non-fatal - credentials are valid, webhooks can be configured later
      // We continue saving the config even if webhook setup fails
    }

    // Encrypt auth token
    const encryptedToken = await encryptAuthToken(authToken);

    // Prepare timestamps
    const now = new Date().toISOString();
    const revalidateAfter = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    // Update the appropriate table
    let updateResult;
    
    if (level === 'client') {
      // Get current version for increment
      const { data: current } = await supabase
        .from('clients')
        .select('twilio_config_version')
        .eq('id', entityId)
        .single();
      
      updateResult = await supabase
        .from('clients')
        .update({
          twilio_account_sid: accountSid,
          twilio_auth_token_encrypted: encryptedToken,
          twilio_phone_number: phoneNumber,
          twilio_enabled: enabled,
          twilio_validated_at: now,
          twilio_configured_by: user.id,
          twilio_configured_at: now,
          twilio_friendly_name: friendlyName || null,
          twilio_monthly_limit: monthlyLimit || null,
          twilio_revalidate_after: revalidateAfter,
          twilio_failure_count: 0,
          twilio_circuit_open_until: null,
          twilio_last_error: null,
          twilio_last_error_at: null,
          twilio_validation_error: null,
          twilio_config_version: (current?.twilio_config_version || 0) + 1,
        })
        .eq('id', entityId)
        .select('id, name')
        .single();
        
    } else if (level === 'agency') {
      const { data: current } = await supabase
        .from('agencies')
        .select('twilio_config_version')
        .eq('id', entityId)
        .single();
      
      updateResult = await supabase
        .from('agencies')
        .update({
          twilio_account_sid: accountSid,
          twilio_auth_token_encrypted: encryptedToken,
          twilio_phone_number: phoneNumber,
          twilio_enabled: enabled,
          twilio_validated_at: now,
          twilio_configured_by: user.id,
          twilio_configured_at: now,
          twilio_friendly_name: friendlyName || null,
          twilio_monthly_limit: monthlyLimit || null,
          twilio_revalidate_after: revalidateAfter,
          twilio_failure_count: 0,
          twilio_circuit_open_until: null,
          twilio_last_error: null,
          twilio_last_error_at: null,
          twilio_validation_error: null,
          twilio_config_version: (current?.twilio_config_version || 0) + 1,
        })
        .eq('id', entityId)
        .select('id, name')
        .single();
        
    } else { // admin
      updateResult = await supabase
        .from('sms_provider_settings')
        .update({
          admin_twilio_account_sid: accountSid,
          admin_twilio_auth_token_encrypted: encryptedToken,
          admin_twilio_phone_number: phoneNumber,
          admin_twilio_enabled: enabled,
          admin_twilio_validated_at: now,
          admin_twilio_friendly_name: friendlyName || 'Platform Master',
          admin_twilio_last_error: null,
          admin_twilio_last_error_at: null,
        })
        .select('id')
        .single();
    }

    if (updateResult.error) {
      console.error('[UPDATE-TWILIO] Update failed:', updateResult.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to save configuration',
          errorCode: 'UPDATE_FAILED'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log to audit table
    await supabase
      .from('twilio_config_audit_log')
      .insert({
        entity_type: level,
        entity_id: entityId || null,
        action: 'updated',
        changed_by: user.id,
        new_values: {
          account_sid_last4: accountSid.slice(-4),
          phone_number: phoneNumber,
          enabled,
          friendly_name: friendlyName,
          monthly_limit: monthlyLimit,
        },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      });

    console.log(`[UPDATE-TWILIO] Successfully updated ${level} Twilio config`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Twilio configuration saved successfully for ${level}`,
        validated: true,
        entityId: entityId || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[UPDATE-TWILIO] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        errorCode: 'INTERNAL_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Check if user is authorized to modify Twilio config at the specified level
 */
async function checkAuthorization(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  level: TwilioLevel,
  entityId?: string
): Promise<{ authorized: boolean; isAdmin: boolean; reason?: string }> {
  
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
      reason: 'Only platform admins can modify admin-level Twilio configuration' 
    };
  }

  // Agency level
  if (level === 'agency') {
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
      reason: 'Only agency owners can modify agency Twilio configuration' 
    };
  }

  // Client level
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
      reason: 'Not authorized to modify this client\'s Twilio configuration' 
    };
  }

  return { authorized: false, isAdmin: false, reason: 'Invalid level' };
}

/**
 * Check if the expected version matches current version (optimistic locking)
 */
async function checkVersion(
  supabase: ReturnType<typeof createClient>,
  level: TwilioLevel,
  entityId: string | undefined,
  expectedVersion: number
): Promise<{ valid: boolean }> {
  
  if (level === 'client' && entityId) {
    const { data } = await supabase
      .from('clients')
      .select('twilio_config_version')
      .eq('id', entityId)
      .single();
    
    return { valid: (data?.twilio_config_version || 0) === expectedVersion };
  }
  
  if (level === 'agency' && entityId) {
    const { data } = await supabase
      .from('agencies')
      .select('twilio_config_version')
      .eq('id', entityId)
      .single();
    
    return { valid: (data?.twilio_config_version || 0) === expectedVersion };
  }
  
  // Admin level doesn't use versioning
  return { valid: true };
}

/**
 * Test Twilio credentials
 */
async function testTwilioCredentials(
  accountSid: string,
  authToken: string,
  phoneNumber: string
): Promise<{ success: boolean; error?: string; errorCode?: string }> {
  
  try {
    // Validate Account SID format
    if (!accountSid.startsWith('AC') || accountSid.length !== 34) {
      return { 
        success: false, 
        error: "Invalid Twilio Account SID format",
        errorCode: 'INVALID_SID_FORMAT'
      };
    }

    // Test authentication
    const auth = btoa(`${accountSid}:${authToken}`);
    const accountUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;
    
    const accountResponse = await fetch(accountUrl, {
      headers: { 'Authorization': `Basic ${auth}` },
    });

    if (!accountResponse.ok) {
      if (accountResponse.status === 401) {
        return { 
          success: false, 
          error: 'Authentication failed. Please check your Auth Token.',
          errorCode: 'AUTH_FAILED'
        };
      }
      return { 
        success: false, 
        error: `Twilio API error: ${accountResponse.status}`,
        errorCode: 'TWILIO_ERROR'
      };
    }

    const accountData = await accountResponse.json();
    if (accountData.status === 'suspended') {
      return { 
        success: false, 
        error: 'This Twilio account is suspended.',
        errorCode: 'ACCOUNT_SUSPENDED'
      };
    }

    // Validate phone number exists in account
    const normalizedPhone = phoneNumber.replace(/[^+\d]/g, '');
    const phoneUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(normalizedPhone)}`;
    
    const phoneResponse = await fetch(phoneUrl, {
      headers: { 'Authorization': `Basic ${auth}` },
    });

    if (!phoneResponse.ok) {
      return { 
        success: false, 
        error: 'Could not verify phone number.',
        errorCode: 'PHONE_LOOKUP_FAILED'
      };
    }

    const phoneData = await phoneResponse.json();
    if (!phoneData.incoming_phone_numbers || phoneData.incoming_phone_numbers.length === 0) {
      return { 
        success: false, 
        error: `Phone number ${phoneNumber} not found in this Twilio account.`,
        errorCode: 'PHONE_NOT_FOUND'
      };
    }

    const phoneInfo = phoneData.incoming_phone_numbers[0];
    if (!phoneInfo.capabilities.sms) {
      return { 
        success: false, 
        error: `Phone number ${phoneNumber} cannot send SMS.`,
        errorCode: 'PHONE_NOT_SMS_CAPABLE'
      };
    }

    return { success: true };
    
  } catch (error) {
    console.error('[UPDATE-TWILIO] Validation error:', error);
    return { 
      success: false, 
      error: 'Could not connect to Twilio. Please try again.',
      errorCode: 'NETWORK_ERROR'
    };
  }
}

/**
 * Configure Twilio phone number webhooks for SMS and Voice
 * This ensures inbound SMS/calls are routed to our edge functions
 */
async function configureTwilioWebhooks(
  accountSid: string,
  authToken: string,
  phoneNumber: string
): Promise<{ success: boolean; error?: string; phoneSid?: string }> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) {
      console.warn('[UPDATE-TWILIO] SUPABASE_URL not set, skipping webhook config');
      return { success: true }; // Non-fatal - can be configured later
    }

    console.log(`[UPDATE-TWILIO] Configuring webhooks for ${phoneNumber}`);

    // First, get the phone number's SID
    const auth = btoa(`${accountSid}:${authToken}`);
    const normalizedPhone = phoneNumber.replace(/[^+\d]/g, '');
    const lookupUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(normalizedPhone)}`;
    
    const lookupResponse = await fetch(lookupUrl, {
      headers: { 'Authorization': `Basic ${auth}` },
    });
    
    if (!lookupResponse.ok) {
      console.error('[UPDATE-TWILIO] Phone lookup failed:', lookupResponse.status);
      return { success: false, error: 'Could not look up phone number for webhook config' };
    }
    
    const lookupData = await lookupResponse.json();
    if (!lookupData.incoming_phone_numbers?.length) {
      console.error('[UPDATE-TWILIO] Phone number not found in account');
      return { success: false, error: 'Phone number not found for webhook config' };
    }
    
    const phoneSid = lookupData.incoming_phone_numbers[0].sid;
    console.log(`[UPDATE-TWILIO] Found phone SID: ${phoneSid}`);
    
    // Update the phone number's webhook URLs
    const updateUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneSid}.json`;
    
    const webhookParams = new URLSearchParams({
      // SMS webhooks - routes replies to handle-sms-response
      SmsUrl: `${supabaseUrl}/functions/v1/handle-sms-response`,
      SmsMethod: 'POST',
      // Voice webhooks - routes incoming calls to handle-incoming-call
      VoiceUrl: `${supabaseUrl}/functions/v1/handle-incoming-call`,
      VoiceMethod: 'POST',
      StatusCallback: `${supabaseUrl}/functions/v1/update-call-status`,
      StatusCallbackMethod: 'POST',
    });

    console.log(`[UPDATE-TWILIO] Setting webhooks: SmsUrl=${supabaseUrl}/functions/v1/handle-sms-response`);
    
    const updateResponse = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: webhookParams.toString(),
    });
    
    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error('[UPDATE-TWILIO] Webhook config failed:', errorData);
      return { success: false, error: `Could not configure webhooks: ${errorData.message || 'Unknown error'}` };
    }
    
    console.log(`[UPDATE-TWILIO] Webhooks configured successfully for ${phoneNumber}`);
    return { success: true, phoneSid };
    
  } catch (error) {
    console.error('[UPDATE-TWILIO] Webhook config error:', error);
    return { success: false, error: 'Webhook configuration failed' };
  }
}
