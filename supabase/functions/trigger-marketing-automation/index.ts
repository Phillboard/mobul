/**
 * Trigger Marketing Automation Edge Function
 * 
 * Called when trigger events occur to enroll contacts in automations.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { logError } from '../_shared/error-logger.ts';

interface TriggerRequest {
  triggerType: 'mail_campaign_sent' | 'mail_campaign_delivered' | 'gift_card_redeemed' | 'form_submitted' | 'recipient_approved' | 'manual';
  entityId: string; // campaign_id, form_id, etc.
  contactId?: string;
  recipientId?: string;
  clientId: string;
  metadata?: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const { triggerType, entityId, contactId, recipientId, clientId, metadata }: TriggerRequest = await req.json();

    if (!triggerType || !clientId) {
      throw new Error('Missing required fields: triggerType, clientId');
    }

    console.log(`[AUTOMATION-TRIGGER] Processing ${triggerType} for entity ${entityId}`);

    // Find matching active automations
    const { data: automations, error: automationsError } = await supabase
      .from('marketing_automations')
      .select('*')
      .eq('client_id', clientId)
      .eq('trigger_type', triggerType)
      .eq('is_active', true);

    if (automationsError) {
      throw new Error(`Failed to fetch automations: ${automationsError.message}`);
    }

    if (!automations || automations.length === 0) {
      console.log(`[AUTOMATION-TRIGGER] No active automations found for ${triggerType}`);
      return new Response(
        JSON.stringify({ success: true, enrolled: 0, message: 'No matching automations' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let enrolledCount = 0;

    for (const automation of automations) {
      // Check trigger config matches
      const config = automation.trigger_config || {};
      
      // If specific entity is configured, check it matches
      if (config.campaignId && config.campaignId !== entityId) {
        continue;
      }
      if (config.formId && config.formId !== entityId) {
        continue;
      }

      // Check if contact is already enrolled
      const { data: existingEnrollment } = await supabase
        .from('marketing_automation_enrollments')
        .select('id')
        .eq('automation_id', automation.id)
        .eq('contact_id', contactId)
        .eq('status', 'active')
        .single();

      if (existingEnrollment) {
        console.log(`[AUTOMATION-TRIGGER] Contact ${contactId} already enrolled in automation ${automation.id}`);
        continue;
      }

      // Get first step to calculate next_step_at
      const { data: firstStep } = await supabase
        .from('marketing_automation_steps')
        .select('*')
        .eq('automation_id', automation.id)
        .eq('step_order', 1)
        .single();

      const delayMinutes = firstStep?.config?.delayMinutes || 0;
      const nextStepAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

      // Create enrollment
      const { error: enrollError } = await supabase
        .from('marketing_automation_enrollments')
        .insert({
          automation_id: automation.id,
          contact_id: contactId,
          recipient_id: recipientId,
          current_step: 0,
          status: 'active',
          enrolled_at: new Date().toISOString(),
          next_step_at: nextStepAt,
          metadata: {
            trigger_entity_id: entityId,
            trigger_type: triggerType,
            ...metadata,
          },
        });

      if (enrollError) {
        console.error(`[AUTOMATION-TRIGGER] Enrollment error:`, enrollError);
        continue;
      }

      enrolledCount++;
      console.log(`[AUTOMATION-TRIGGER] Enrolled contact ${contactId} in automation ${automation.name}`);

      // If first step has no delay, process it immediately
      if (delayMinutes === 0 && firstStep) {
        await supabase.functions.invoke('process-marketing-automation', {
          body: { automationId: automation.id, enrollmentId: null, processAll: false },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        enrolled: enrolledCount,
        automationsChecked: automations.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[AUTOMATION-TRIGGER] Error:', error);
    await logError(supabase, {
      function_name: 'trigger-marketing-automation',
      error_message: error.message,
      error_stack: error.stack,
      severity: 'error',
    });

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
