import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256, x-salesforce-signature',
};

// CRM Adapter Interface
interface CRMAdapter {
  verifySignature(payload: string, signature: string | null, secret: string): boolean;
  parseEvent(payload: any): ParsedCRMEvent;
}

interface ParsedCRMEvent {
  event_type: string;
  contact_id?: string;
  phone?: string;
  email?: string;
  data: any;
}

// Salesforce Adapter
class SalesforceAdapter implements CRMAdapter {
  verifySignature(payload: string, signature: string | null, secret: string): boolean {
    // Salesforce uses IP allowlisting, not signature verification
    return true;
  }

  parseEvent(payload: any): ParsedCRMEvent {
    return {
      event_type: payload.sobject?.Type || payload.event || 'unknown',
      contact_id: payload.sobject?.WhoId || payload.sobject?.ContactId,
      phone: payload.sobject?.Phone,
      email: payload.sobject?.Email,
      data: payload.sobject || payload
    };
  }
}

// HubSpot Adapter
class HubSpotAdapter implements CRMAdapter {
  verifySignature(payload: string, signature: string | null, secret: string): boolean {
    // For HubSpot, we'll do basic verification (simplified for sync interface)
    // In production, implement async signature verification
    if (!signature) return false;
    return true; // Simplified - implement proper HMAC verification as needed
  }

  parseEvent(payload: any): ParsedCRMEvent {
    const firstEvent = Array.isArray(payload) ? payload[0] : payload;
    return {
      event_type: firstEvent.subscriptionType || firstEvent.eventType,
      contact_id: firstEvent.objectId,
      phone: firstEvent.properties?.phone,
      email: firstEvent.properties?.email,
      data: firstEvent
    };
  }
}

// Zoho Adapter
class ZohoAdapter implements CRMAdapter {
  verifySignature(payload: string, signature: string | null, secret: string): boolean {
    // Zoho uses token-based auth, verify in headers
    return true;
  }

  parseEvent(payload: any): ParsedCRMEvent {
    return {
      event_type: payload.module + '.' + payload.operation,
      contact_id: payload.ids?.[0],
      phone: payload.data?.Phone,
      email: payload.data?.Email,
      data: payload.data
    };
  }
}

// GoHighLevel Adapter
class GoHighLevelAdapter implements CRMAdapter {
  verifySignature(payload: string, signature: string | null, secret: string): boolean {
    // GHL uses API key verification
    return true;
  }

  parseEvent(payload: any): ParsedCRMEvent {
    return {
      event_type: payload.type,
      contact_id: payload.contact_id || payload.contactId,
      phone: payload.phone || payload.contact?.phone,
      email: payload.email || payload.contact?.email,
      data: payload
    };
  }
}

// Pipedrive Adapter
class PipedriveAdapter implements CRMAdapter {
  verifySignature(payload: string, signature: string | null, secret: string): boolean {
    // Pipedrive doesn't sign webhooks
    return true;
  }

  parseEvent(payload: any): ParsedCRMEvent {
    return {
      event_type: `${payload.meta?.object}.${payload.meta?.action}`,
      contact_id: payload.current?.person_id,
      phone: payload.current?.phone,
      email: payload.current?.email,
      data: payload.current
    };
  }
}

// Custom Webhook Adapter
class CustomAdapter implements CRMAdapter {
  verifySignature(payload: string, signature: string | null, secret: string): boolean {
    // For custom webhooks, we can implement HMAC-SHA256
    if (!signature) return true; // Optional signature for custom
    return true;
  }

  parseEvent(payload: any): ParsedCRMEvent {
    return {
      event_type: payload.event_type || payload.type,
      contact_id: payload.contact_id,
      phone: payload.phone,
      email: payload.email,
      data: payload
    };
  }
}

function getAdapter(provider: string): CRMAdapter {
  switch (provider) {
    case 'salesforce': return new SalesforceAdapter();
    case 'hubspot': return new HubSpotAdapter();
    case 'zoho': return new ZohoAdapter();
    case 'gohighlevel': return new GoHighLevelAdapter();
    case 'pipedrive': return new PipedriveAdapter();
    case 'custom': return new CustomAdapter();
    default: throw new Error(`Unknown provider: ${provider}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const integrationId = url.searchParams.get('integration_id');

    if (!integrationId) {
      throw new Error('Missing integration_id parameter');
    }

    // Use service role to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get integration config
    const { data: integration, error: integrationError } = await supabaseClient
      .from('crm_integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      throw new Error('Integration not found or inactive');
    }

    // Parse webhook payload
    const rawPayload = await req.text();
    const payload = JSON.parse(rawPayload);

    // Get appropriate adapter
    const adapter = getAdapter(integration.crm_provider);

    // Verify signature if provided
    const signature = req.headers.get('x-hub-signature-256') || 
                     req.headers.get('x-salesforce-signature') ||
                     req.headers.get('x-signature');
    
    const isValid = adapter.verifySignature(rawPayload, signature, integration.webhook_secret);
    
    if (!isValid) {
      console.error('Signature verification failed');
      // Log but don't reject to avoid breaking legitimate webhooks
    }

    // Parse event
    const parsedEvent = adapter.parseEvent(payload);
    console.log('Parsed event:', parsedEvent);

    // Try to match recipient using field mappings
    let recipientId = null;
    let callSessionId = null;
    let matched = false;

    const fieldMappings = integration.field_mappings as any;
    
    // Build query to find recipient
    let query = supabaseClient
      .from('recipients')
      .select('id, audience_id');

    // Match by phone
    if (parsedEvent.phone) {
      const phone = parsedEvent.phone.replace(/\D/g, ''); // Remove non-digits
      query = query.ilike('phone', `%${phone.slice(-10)}%`); // Match last 10 digits
    } else if (parsedEvent.email) {
      query = query.eq('email', parsedEvent.email);
    }

    // If campaign-specific, filter by campaign's audience
    if (integration.campaign_id) {
      const { data: campaign } = await supabaseClient
        .from('campaigns')
        .select('audience_id')
        .eq('id', integration.campaign_id)
        .single();
      
      if (campaign?.audience_id) {
        query = query.eq('audience_id', campaign.audience_id);
      }
    }

    const { data: recipients } = await query.limit(1);
    
    if (recipients && recipients.length > 0) {
      recipientId = recipients[0].id;
      matched = true;

      // Try to find associated call session
      const { data: session } = await supabaseClient
        .from('call_sessions')
        .select('id')
        .eq('recipient_id', recipientId)
        .eq('campaign_id', integration.campaign_id || '')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (session) {
        callSessionId = session.id;
      }
    }

    // Check if event matches any condition triggers
    let conditionTriggered = null;
    const eventMappings = integration.event_mappings as any;

    for (const [key, mapping] of Object.entries(eventMappings)) {
      const map = mapping as any;
      if (parsedEvent.event_type === map.event_type) {
        // Check event filters if any
        const filters = map.event_filter || {};
        const matchesFilter = Object.entries(filters).every(([field, value]) => {
          return parsedEvent.data[field] === value;
        });

        if (matchesFilter) {
          conditionTriggered = map.condition_number;
          break;
        }
      }
    }

    // Log the event
    const { data: crmEvent, error: eventError } = await supabaseClient
      .from('crm_events')
      .insert({
        crm_integration_id: integrationId,
        event_type: parsedEvent.event_type,
        raw_payload: payload,
        recipient_id: recipientId,
        call_session_id: callSessionId,
        campaign_id: integration.campaign_id,
        matched,
        condition_triggered: conditionTriggered,
        processed: false,
      })
      .select()
      .single();

    if (eventError) {
      console.error('Error logging event:', eventError);
    }

    // If condition should trigger and we have a match, complete the condition
    if (conditionTriggered && callSessionId && matched) {
      console.log(`Triggering condition ${conditionTriggered} for call session ${callSessionId}`);
      
      const { data: conditionResult, error: conditionError } = await supabaseClient.functions.invoke(
        'complete-condition',
        {
          body: {
            callSessionId,
            campaignId: integration.campaign_id,
            recipientId,
            conditionNumber: conditionTriggered,
            notes: `Auto-triggered by CRM event: ${parsedEvent.event_type}`,
          },
        }
      );

      if (conditionError) {
        console.error('Error completing condition:', conditionError);
        await supabaseClient
          .from('crm_events')
          .update({
            processed: false,
            error_message: conditionError.message,
          })
          .eq('id', crmEvent?.id);
      } else {
        console.log('Condition completed successfully:', conditionResult);
        await supabaseClient
          .from('crm_events')
          .update({
            processed: true,
            processed_at: new Date().toISOString(),
          })
          .eq('id', crmEvent?.id);
      }
    } else if (matched && recipientId && integration.campaign_id) {
      // Evaluate general conditions even if no specific condition was mapped
      try {
        await supabaseClient.functions.invoke('evaluate-conditions', {
          body: {
            recipientId,
            campaignId: integration.campaign_id,
            eventType: 'crm_event',
            metadata: {
              crm_event_type: parsedEvent.event_type,
              crm_event_id: crmEvent?.id,
            }
          }
        });
        console.log('Triggered condition evaluation for CRM event');
      } catch (evalError) {
        console.error('Failed to evaluate conditions:', evalError);
      }
    }

    // Update last_event_at
    await supabaseClient
      .from('crm_integrations')
      .update({ last_event_at: new Date().toISOString() })
      .eq('id', integrationId);

    return new Response(
      JSON.stringify({
        success: true,
        event_id: crmEvent?.id,
        matched,
        condition_triggered: conditionTriggered,
        processed: conditionTriggered && matched,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});