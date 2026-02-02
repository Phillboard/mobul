/**
 * Lead Form Submission Handler
 * 
 * Handles lead capture form submissions from campaign landing pages.
 * Creates lead records, logs events, evaluates conditions, and dispatches webhooks.
 */

import { withApiGateway, ApiError, type PublicContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';
import {
  validateLeadFormData,
  type LeadFormData,
} from '../_shared/business-rules/form-rules.ts';

// ============================================================================
// Types
// ============================================================================

interface SubmitLeadFormResponse {
  success: boolean;
  leadId: string;
  message: string;
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleSubmitLeadForm(
  request: LeadFormData,
  _context: PublicContext
): Promise<SubmitLeadFormResponse> {
  const { campaignId, recipientId, fullName, email, phone, message, appointmentRequested } = request;

  // Validate form data using shared rules
  const validation = validateLeadFormData(request);
  if (!validation.valid) {
    throw new ApiError(validation.error!, 'VALIDATION_ERROR', 400);
  }

  console.log(`[SUBMIT-LEAD-FORM] Processing: campaign=${campaignId}, recipient=${recipientId}`);

  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('submit-lead-form');

  // =====================================================
  // STEP 1: VERIFY RECIPIENT EXISTS
  // =====================================================
  const { data: recipient, error: recipientError } = await supabase
    .from('recipients')
    .select('id')
    .eq('id', recipientId)
    .single();

  if (recipientError || !recipient) {
    console.error('[SUBMIT-LEAD-FORM] Recipient verification error:', recipientError);
    throw new ApiError('Invalid recipient', 'NOT_FOUND', 404);
  }

  // =====================================================
  // STEP 2: INSERT LEAD RECORD
  // =====================================================
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      campaign_id: campaignId,
      recipient_id: recipientId,
      full_name: fullName,
      email: email,
      phone: phone || null,
      message: message || null,
      appointment_requested: appointmentRequested || false,
    })
    .select()
    .single();

  if (leadError) {
    console.error('[SUBMIT-LEAD-FORM] Lead insert error:', leadError);
    throw new ApiError('Failed to save lead', 'DATABASE_ERROR', 500);
  }

  console.log(`[SUBMIT-LEAD-FORM] Lead created: ${lead.id}`);

  // =====================================================
  // STEP 3: LOG FORM SUBMISSION EVENT
  // =====================================================
  const { error: eventError } = await supabase.from('events').insert({
    campaign_id: campaignId,
    recipient_id: recipientId,
    event_type: 'form_submitted',
    event_data_json: {
      full_name: fullName,
      email: email,
      phone: phone || null,
      appointment_requested: appointmentRequested || false,
      lead_id: lead.id,
    },
    source: 'form',
  });

  if (eventError) {
    console.error('[SUBMIT-LEAD-FORM] Event logging error:', eventError);
    // Don't fail the request
  }

  // =====================================================
  // STEP 4: EVALUATE CAMPAIGN CONDITIONS
  // =====================================================
  try {
    await supabase.functions.invoke('evaluate-conditions', {
      body: {
        recipientId,
        campaignId,
        eventType: 'form_submitted',
        metadata: {
          lead_id: lead.id,
          appointment_requested: appointmentRequested || false,
        },
      },
    });
    console.log('[SUBMIT-LEAD-FORM] Triggered condition evaluation');
  } catch (evalError) {
    console.error('[SUBMIT-LEAD-FORM] Failed to evaluate conditions:', evalError);
    // Don't fail the request
  }

  // =====================================================
  // STEP 5: LOG ACTIVITY
  // =====================================================
  await activityLogger.campaign('lead_submitted', 'success', {
    campaignId,
    recipientId,
    description: `Lead form submitted by ${fullName}`,
    metadata: {
      lead_id: lead.id,
      email,
      phone: phone || null,
      appointment_requested: appointmentRequested || false,
    },
  });

  // =====================================================
  // STEP 6: DISPATCH ZAPIER WEBHOOK
  // =====================================================
  try {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('client_id')
      .eq('id', campaignId)
      .single();

    if (campaign) {
      await supabase.functions.invoke('dispatch-zapier-event', {
        body: {
          event_type: 'lead.submitted',
          client_id: campaign.client_id,
          data: {
            lead_id: lead.id,
            campaign_id: campaignId,
            recipient_id: recipientId,
            full_name: fullName,
            email: email,
            phone: phone || null,
            appointment_requested: appointmentRequested || false,
            submitted_at: new Date().toISOString(),
          },
        },
      });
      console.log('[SUBMIT-LEAD-FORM] Zapier event dispatched');
    }
  } catch (zapierError) {
    console.error('[SUBMIT-LEAD-FORM] Failed to dispatch Zapier event:', zapierError);
    // Don't fail the request
  }

  console.log(`[SUBMIT-LEAD-FORM] Success: lead_id=${lead.id}`);

  return {
    success: true,
    leadId: lead.id,
    message: 'Thank you for your interest! We will contact you shortly.',
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleSubmitLeadForm, {
  requireAuth: false, // Public endpoint
  parseBody: true,
  auditAction: 'submit_lead_form',
}));
