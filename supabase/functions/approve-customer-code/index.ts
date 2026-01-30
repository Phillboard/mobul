import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createActivityLogger } from '../_shared/activity-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize activity logger
  const activityLogger = createActivityLogger('approve-customer-code', req);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { headers: corsHeaders, status: 401 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authenticated user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { headers: corsHeaders, status: 401 }
      );
    }

    const { 
      recipientId, 
      redemptionCode,
      action, 
      callSessionId, 
      notes,
      rejectionReason 
    } = await req.json();

    if (!recipientId && !redemptionCode) {
      return Response.json(
        { success: false, error: 'Either recipientId or redemptionCode is required' },
        { headers: corsHeaders, status: 400 }
      );
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return Response.json(
        { success: false, error: 'Invalid action. Must be "approve" or "reject"' },
        { headers: corsHeaders, status: 400 }
      );
    }

    // Look up recipient
    let query = supabase
      .from('recipients')
      .select(`
        *,
        audience:audiences(id, client_id, name),
        call_session:call_sessions(id, campaign_id)
      `);

    if (recipientId) {
      query = query.eq('id', recipientId);
    } else {
      query = query.eq('redemption_code', redemptionCode.toUpperCase());
    }

    const { data: recipient, error: recipientError } = await query.single();

    if (recipientError || !recipient) {
      return Response.json(
        { success: false, error: 'Recipient not found' },
        { headers: corsHeaders, status: 404 }
      );
    }

    // Verify user has access to this client
    const { data: hasAccess } = await supabase
      .rpc('user_can_access_client', {
        _user_id: user.id,
        _client_id: recipient.audience.client_id
      });

    if (!hasAccess) {
      return Response.json(
        { success: false, error: 'Unauthorized to approve codes for this client' },
        { headers: corsHeaders, status: 403 }
      );
    }

    // Check if already processed
    if (recipient.approval_status === 'redeemed') {
      return Response.json(
        { success: false, error: 'This code has already been redeemed and cannot be modified' },
        { headers: corsHeaders, status: 400 }
      );
    }

    const now = new Date().toISOString();
    const updateData: any = {
      approved_by_user_id: user.id,
      approved_at: now,
      approved_call_session_id: callSessionId
    };

    if (action === 'approve') {
      updateData.approval_status = 'approved';
      updateData.rejection_reason = null;
    } else {
      updateData.approval_status = 'rejected';
      updateData.rejection_reason = rejectionReason || 'No reason provided';
    }

    // Update recipient
    const { error: updateError } = await supabase
      .from('recipients')
      .update(updateData)
      .eq('id', recipient.id);

    if (updateError) {
      console.error('Error updating recipient:', updateError);
      return Response.json(
        { success: false, error: 'Failed to update approval status' },
        { headers: corsHeaders, status: 500 }
      );
    }

    // Log the action
    await supabase.from('recipient_audit_log').insert({
      recipient_id: recipient.id,
      action: action === 'approve' ? 'approved' : 'rejected',
      performed_by_user_id: user.id,
      call_session_id: callSessionId,
      ip_address: req.headers.get('x-forwarded-for'),
      user_agent: req.headers.get('user-agent'),
      metadata: {
        notes,
        rejectionReason: action === 'reject' ? rejectionReason : null,
        previousStatus: recipient.approval_status
      }
    });

    // If approved, optionally send SMS/email with redemption link
    if (action === 'approve' && recipient.phone) {
      const campaignId = recipient.call_session?.campaign_id || recipient.audience_id;
      
      // Get PUBLIC_APP_URL from environment, fallback to Supabase URL
      const appUrl = Deno.env.get('PUBLIC_APP_URL') || Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app') || 'https://app.mobilace.com';
      
      // Updated redemption URL to use new public redemption page
      const redemptionUrl = `${appUrl}/redeem-gift-card?code=${recipient.redemption_code}&campaign=${campaignId}`;
      
      // Queue SMS notification (async, don't block)
      supabase.functions.invoke('send-gift-card-sms', {
        body: {
          phone: recipient.phone,
          message: `Your gift card code has been activated! Redeem it here: ${redemptionUrl}`,
          recipientId: recipient.id,
          campaignId
        }
      }).catch(err => console.error('Failed to send SMS:', err));
    }

    console.log(`Code ${action}d:`, { recipientId: recipient.id, code: recipient.redemption_code, by: user.id });

    // Log approval/rejection activity
    await activityLogger.giftCard(action === 'approve' ? 'card_assigned' : 'card_cancelled', 
      action === 'approve' ? 'success' : 'cancelled',
      action === 'approve' 
        ? `Recipient code approved by agent`
        : `Recipient code rejected: ${rejectionReason || 'No reason'}`,
      {
        userId: user.id,
        recipientId: recipient.id,
        clientId: recipient.audience?.client_id,
        metadata: {
          redemption_code: recipient.redemption_code,
          action,
          call_session_id: callSessionId,
          notes,
          rejection_reason: action === 'reject' ? rejectionReason : undefined,
        },
      }
    );

    return Response.json({
      success: true,
      action,
      recipient: {
        id: recipient.id,
        redemption_code: recipient.redemption_code,
        first_name: recipient.first_name,
        last_name: recipient.last_name,
        phone: recipient.phone,
        email: recipient.email,
        approval_status: updateData.approval_status,
        approved_at: now
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in approve-customer-code:', error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
});
