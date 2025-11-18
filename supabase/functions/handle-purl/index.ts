import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract from URL path if present (for direct URL access) or from body (for function invoke)
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(p => p);
    
    let campaignId = pathParts[1];
    let token = pathParts[2];

    // If not in path, try to get from body
    if (!campaignId || !token) {
      const body = await req.json();
      campaignId = body.campaignId;
      token = body.token;
    }

    if (!campaignId || !token) {
      return new Response(
        JSON.stringify({ error: 'Campaign ID and token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing PURL: campaign=${campaignId}, token=${token}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Look up recipient by token
    const { data: recipient, error: recipientError } = await supabase
      .from('recipients')
      .select('*, audience:audiences(client_id)')
      .eq('token', token)
      .single();

    if (recipientError || !recipient) {
      console.error('Recipient lookup error:', recipientError);
      return new Response(
        JSON.stringify({ error: 'Invalid tracking link' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('Campaign lookup error:', campaignError);
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gather tracking data
    const userAgent = req.headers.get('user-agent') || '';
    const referer = req.headers.get('referer') || '';
    const forwardedFor = req.headers.get('x-forwarded-for') || '';
    const ip = forwardedFor.split(',')[0].trim() || req.headers.get('x-real-ip') || '';
    
    // Detect if this is a QR code scan
    const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
    const isDirectVisit = !referer;
    
    // Check if this is the first visit (no previous purl_viewed events)
    const { data: previousEvents } = await supabase
      .from('events')
      .select('id')
      .eq('recipient_id', recipient.id)
      .eq('campaign_id', campaignId)
      .in('event_type', ['purl_viewed', 'qr_scanned'])
      .limit(1);

    const isFirstVisit = !previousEvents || previousEvents.length === 0;
    const isQRScan = isMobile && isDirectVisit && isFirstVisit;

    // Log the appropriate event
    const eventType = isQRScan ? 'qr_scanned' : 'purl_viewed';
    await supabase.from('events').insert({
      campaign_id: campaignId,
      recipient_id: recipient.id,
      event_type: eventType,
      event_data_json: {
        user_agent: userAgent,
        referer: referer,
        ip: ip,
        is_mobile: isMobile,
        is_qr_scan: isQRScan,
      },
      source: 'purl',
    });

    console.log(`Logged ${eventType} event for recipient ${recipient.id}`);

    // Evaluate campaign conditions based on this event
    const conditionEventType = isQRScan ? 'qr_scanned' : 'purl_visited';
    try {
      await supabase.functions.invoke('evaluate-conditions', {
        body: {
          recipientId: recipient.id,
          campaignId: campaignId,
          eventType: conditionEventType,
          metadata: {
            user_agent: userAgent,
            ip: ip,
            is_mobile: isMobile,
          }
        }
      });
      console.log(`Triggered condition evaluation for ${conditionEventType}`);
    } catch (evalError) {
      console.error('Failed to evaluate conditions:', evalError);
      // Don't fail the request if condition evaluation fails
    }

    // Track QR scan specifically in qr_tracking_events table
    if (isQRScan) {
      await supabase.from('qr_tracking_events').insert({
        campaign_id: campaignId,
        recipient_id: recipient.id,
        event_type: 'qr_scanned',
        user_agent: userAgent,
        ip_address: ip,
        device_type: isMobile ? 'mobile' : 'desktop',
        location_data: {},
      });
      console.log(`Logged QR scan tracking for recipient ${recipient.id}`);
    }

    // Build UTM parameters
    const utmParams = new URLSearchParams({
      utm_source: campaign.utm_source || 'directmail',
      utm_medium: campaign.utm_medium || 'postcard',
      utm_campaign: campaign.utm_campaign || campaign.name.toLowerCase().replace(/\s+/g, '-'),
      rid: recipient.id,
    });

    // Handle redirect mode
    if (campaign.lp_mode === 'redirect' && campaign.base_lp_url) {
      const redirectUrl = `${campaign.base_lp_url}?${utmParams.toString()}`;
      console.log(`Redirecting to: ${redirectUrl}`);
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': redirectUrl,
        },
      });
    }

    // Bridge mode - return data for React to render
    return new Response(
      JSON.stringify({
        campaign,
        recipient,
        eventLogged: eventType,
        utmParams: Object.fromEntries(utmParams),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in handle-purl:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
