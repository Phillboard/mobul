/**
 * Preview Campaign Audience Edge Function
 * 
 * Calculates the recipient count for a marketing campaign
 * based on its audience configuration WITHOUT sending.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface PreviewRequest {
  campaignId?: string;
  clientId?: string;
  audienceType: 'all_contacts' | 'contact_list' | 'segment' | 'manual';
  audienceConfig: {
    listIds?: string[];
    contactIds?: string[];
    segmentRules?: any[];
  };
  campaignType: 'email' | 'sms' | 'both';
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
    const { campaignId, clientId, audienceType, audienceConfig, campaignType }: PreviewRequest = await req.json();

    let campaign;
    if (campaignId) {
      // Get existing campaign
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) throw error;
      campaign = data;
    } else {
      // Use provided params
      if (!clientId) throw new Error('clientId or campaignId required');
      campaign = { client_id: clientId, audience_type: audienceType, audience_config: audienceConfig, campaign_type: campaignType };
    }

    // Calculate recipients
    const recipients = await getRecipients(supabase, campaign);

    return new Response(
      JSON.stringify({
        success: true,
        count: recipients.length,
        recipients: recipients.slice(0, 10), // Return first 10 for preview
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[PREVIEW] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Get recipients based on campaign audience configuration
 */
async function getRecipients(supabase: any, campaign: any) {
  const { audience_type, audience_config, client_id, campaign_type } = campaign;
  let recipients: any[] = [];

  switch (audience_type) {
    case 'all_contacts':
      const { data: allContacts } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone, company, sms_opt_out, email_opt_out')
        .eq('client_id', client_id)
        .eq('do_not_contact', false);
      recipients = allContacts || [];
      break;

    case 'contact_list':
      if (audience_config?.listIds?.length > 0) {
        const { data: listMembers } = await supabase
          .from('contact_list_members')
          .select(`
            contacts:contact_id (
              id, first_name, last_name, email, phone, company, sms_opt_out, email_opt_out
            )
          `)
          .in('list_id', audience_config.listIds);
        recipients = listMembers?.map((m: any) => m.contacts).filter(Boolean) || [];
      }
      break;

    case 'manual':
      if (audience_config?.contactIds?.length > 0) {
        const { data: manualContacts } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, email, phone, company, sms_opt_out, email_opt_out')
          .in('id', audience_config.contactIds)
          .eq('do_not_contact', false);
        recipients = manualContacts || [];
      }
      break;

    case 'segment':
      // TODO: Implement segment evaluation
      console.log('[PREVIEW] Segment audience not yet implemented');
      break;
  }

  // Filter out opted-out contacts based on campaign type
  return recipients.filter(r => {
    if (campaign_type === 'email' && r.email_opt_out) return false;
    if (campaign_type === 'sms' && r.sms_opt_out) return false;
    if (campaign_type === 'both' && r.email_opt_out && r.sms_opt_out) return false;
    return true;
  });
}



