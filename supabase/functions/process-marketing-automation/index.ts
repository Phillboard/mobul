/**
 * Process Marketing Automation Edge Function
 * 
 * Processes automation steps for enrolled contacts.
 * Should be called periodically (cron) or when enrollments are due.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { logError } from '../_shared/error-logger.ts';

interface ProcessRequest {
  automationId?: string;
  enrollmentId?: string;
  processAll?: boolean;
  batchSize?: number;
}

const DEFAULT_BATCH_SIZE = 100;

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
    const { 
      automationId, 
      enrollmentId, 
      processAll = true, 
      batchSize = DEFAULT_BATCH_SIZE 
    }: ProcessRequest = await req.json();

    console.log(`[AUTOMATION-PROCESS] Starting automation processing`);

    // Get enrollments that are due
    let query = supabase
      .from('marketing_automation_enrollments')
      .select(`
        *,
        marketing_automations (
          id, name, client_id,
          marketing_automation_steps (*)
        ),
        contacts (id, first_name, last_name, email, phone, company)
      `)
      .eq('status', 'active')
      .lte('next_step_at', new Date().toISOString())
      .limit(batchSize);

    if (automationId) {
      query = query.eq('automation_id', automationId);
    }
    if (enrollmentId) {
      query = query.eq('id', enrollmentId);
    }

    const { data: enrollments, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch enrollments: ${fetchError.message}`);
    }

    if (!enrollments || enrollments.length === 0) {
      console.log(`[AUTOMATION-PROCESS] No enrollments due for processing`);
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No enrollments due' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[AUTOMATION-PROCESS] Processing ${enrollments.length} enrollments`);

    let processedCount = 0;
    let completedCount = 0;
    let failedCount = 0;

    for (const enrollment of enrollments) {
      try {
        const automation = enrollment.marketing_automations;
        const steps = automation?.marketing_automation_steps || [];
        const contact = enrollment.contacts;

        if (!automation || steps.length === 0) {
          console.log(`[AUTOMATION-PROCESS] No steps for automation, marking complete`);
          await markEnrollmentComplete(supabase, enrollment.id);
          completedCount++;
          continue;
        }

        // Sort steps by order
        const sortedSteps = steps.sort((a: any, b: any) => a.step_order - b.step_order);
        
        // Get current step
        const currentStepIndex = enrollment.current_step;
        const currentStep = sortedSteps[currentStepIndex];

        if (!currentStep) {
          // No more steps, mark as complete
          await markEnrollmentComplete(supabase, enrollment.id);
          completedCount++;
          continue;
        }

        console.log(`[AUTOMATION-PROCESS] Executing step ${currentStep.step_order}: ${currentStep.step_type}`);

        // Execute step based on type
        let stepSuccess = false;

        switch (currentStep.step_type) {
          case 'send_email':
            if (contact?.email) {
              // Get template or use step config
              let subject = 'Marketing Message';
              let bodyHtml = '';
              
              if (currentStep.template_id) {
                const { data: template } = await supabase
                  .from('message_templates')
                  .select('*')
                  .eq('id', currentStep.template_id)
                  .single();
                
                if (template) {
                  subject = template.subject || subject;
                  bodyHtml = template.body_template;
                }
              } else if (currentStep.config?.body) {
                bodyHtml = currentStep.config.body;
                subject = currentStep.config.subject || subject;
              }

              const { error: emailError } = await supabase.functions.invoke('send-marketing-email', {
                body: {
                  campaignId: `automation-${automation.id}`,
                  messageId: currentStep.id,
                  contactId: contact.id,
                  email: contact.email,
                  subject,
                  bodyHtml,
                  mergeData: {
                    first_name: contact.first_name,
                    last_name: contact.last_name,
                    email: contact.email,
                    company: contact.company,
                  },
                },
              });

              stepSuccess = !emailError;
            } else {
              console.log(`[AUTOMATION-PROCESS] Skipping email - no email address`);
              stepSuccess = true; // Skip but continue
            }
            break;

          case 'send_sms':
            if (contact?.phone) {
              let body = '';
              
              if (currentStep.template_id) {
                const { data: template } = await supabase
                  .from('message_templates')
                  .select('*')
                  .eq('id', currentStep.template_id)
                  .single();
                
                if (template) {
                  body = template.body_template;
                }
              } else if (currentStep.config?.body) {
                body = currentStep.config.body;
              }

              const { error: smsError } = await supabase.functions.invoke('send-marketing-sms', {
                body: {
                  campaignId: `automation-${automation.id}`,
                  messageId: currentStep.id,
                  contactId: contact.id,
                  phone: contact.phone,
                  body,
                  mergeData: {
                    first_name: contact.first_name,
                    last_name: contact.last_name,
                    phone: contact.phone,
                    company: contact.company,
                  },
                },
              });

              stepSuccess = !smsError;
            } else {
              console.log(`[AUTOMATION-PROCESS] Skipping SMS - no phone number`);
              stepSuccess = true;
            }
            break;

          case 'wait':
            // Wait steps just need to advance
            stepSuccess = true;
            break;

          case 'condition':
            // TODO: Implement condition evaluation
            console.log(`[AUTOMATION-PROCESS] Condition steps not yet implemented`);
            stepSuccess = true;
            break;

          default:
            console.log(`[AUTOMATION-PROCESS] Unknown step type: ${currentStep.step_type}`);
            stepSuccess = true;
        }

        if (stepSuccess) {
          // Advance to next step
          const nextStepIndex = currentStepIndex + 1;
          const nextStep = sortedSteps[nextStepIndex];

          if (nextStep) {
            // Calculate when next step should execute
            const delayMinutes = nextStep.step_type === 'wait' 
              ? (nextStep.config?.delayMinutes || 0)
              : 0;
            
            const nextStepAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

            await supabase
              .from('marketing_automation_enrollments')
              .update({
                current_step: nextStepIndex,
                next_step_at: nextStepAt,
              })
              .eq('id', enrollment.id);
          } else {
            // No more steps, complete
            await markEnrollmentComplete(supabase, enrollment.id);
            completedCount++;
          }

          processedCount++;
        } else {
          // Step failed
          await supabase
            .from('marketing_automation_enrollments')
            .update({ status: 'failed' })
            .eq('id', enrollment.id);

          failedCount++;
        }

      } catch (stepError: any) {
        console.error(`[AUTOMATION-PROCESS] Error processing enrollment ${enrollment.id}:`, stepError);
        failedCount++;
      }
    }

    console.log(`[AUTOMATION-PROCESS] Completed: ${processedCount} processed, ${completedCount} completed, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        completed: completedCount,
        failed: failedCount,
        total: enrollments.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[AUTOMATION-PROCESS] Error:', error);
    await logError(supabase, {
      function_name: 'process-marketing-automation',
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

async function markEnrollmentComplete(supabase: any, enrollmentId: string) {
  await supabase
    .from('marketing_automation_enrollments')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', enrollmentId);
}
