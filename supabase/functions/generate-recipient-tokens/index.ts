import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import QRCode from "https://esm.sh/qrcode@1.5.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { campaign_id } = await req.json();

    if (!campaign_id) {
      throw new Error('campaign_id is required');
    }

    console.log(`Generating tokens for campaign: ${campaign_id}`);

    // Get campaign and verify access
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, client_id, audience_id, utm_source, utm_medium, utm_campaign, base_lp_url, lp_mode')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found');
    }

    // Verify user has access to this client
    const { data: hasAccess } = await supabase.rpc('user_can_access_client', {
      _user_id: user.id,
      _client_id: campaign.client_id
    });

    if (!hasAccess) {
      throw new Error('Access denied to this campaign');
    }

    if (!campaign.audience_id) {
      throw new Error('Campaign has no audience assigned. Please assign an audience to this campaign before generating tokens.');
    }

    console.log(`Checking audience ${campaign.audience_id} for recipients`);

    // Verify audience exists
    const { data: audience, error: audienceError } = await supabase
      .from('audiences')
      .select('id, name, total_count')
      .eq('id', campaign.audience_id)
      .single();

    if (audienceError || !audience) {
      throw new Error(`Audience not found: ${campaign.audience_id}`);
    }

    console.log(`Found audience "${audience.name}" with ${audience.total_count || 0} total recipients`);

    // Get all recipients for this audience
    const { data: recipients, error: recipientsError } = await supabase
      .from('recipients')
      .select('id, token')
      .eq('audience_id', campaign.audience_id);

    if (recipientsError) {
      throw new Error(`Failed to fetch recipients: ${recipientsError.message}`);
    }

    if (!recipients || recipients.length === 0) {
      if (audience.total_count && audience.total_count > 0) {
        throw new Error(`Audience "${audience.name}" shows ${audience.total_count} expected recipients, but no recipient records were found. The audience data may be out of sync. Please re-import recipients to this audience.`);
      }
      throw new Error(`No recipients found in audience "${audience.name}". Please upload recipients to this audience before generating tokens.`);
    }

    console.log(`Processing ${recipients.length} recipients`);

    let successCount = 0;
    const sampleQRs: Array<{ recipient_id: string; qr_url: string; purl: string }> = [];

    // Process each recipient
    for (const recipient of recipients) {
      try {
        let token = recipient.token;
        
        // Generate token if not exists
        if (!token) {
          const { data: newToken, error: tokenError } = await supabase
            .rpc('generate_recipient_token');
          
          if (tokenError || !newToken) {
            console.error(`Failed to generate token for recipient ${recipient.id}`);
            continue;
          }
          
          token = newToken;
          
          // Update recipient with new token
          const { error: updateError } = await supabase
            .from('recipients')
            .update({ token })
            .eq('id', recipient.id);
          
          if (updateError) {
            console.error(`Failed to update recipient token: ${updateError.message}`);
            continue;
          }
        }

        // Build PURL
        const baseUrl = campaign.lp_mode === 'redirect' && campaign.base_lp_url 
          ? campaign.base_lp_url 
          : 'https://engage.yourdomain.com/l';
        
        const params = new URLSearchParams({
          utm_source: campaign.utm_source || 'directmail',
          utm_medium: campaign.utm_medium || 'postcard',
          utm_campaign: campaign.utm_campaign || '',
          rid: `rec_${token}`,
        });
        
        const purl = `${baseUrl}/${token}?${params.toString()}`;

        // Generate QR code
        const qrCodeDataUrl = await QRCode.toDataURL(purl, {
          width: 300,
          margin: 2,
          errorCorrectionLevel: 'M'
        });

        // Convert data URL to binary
        const base64Data = qrCodeDataUrl.split(',')[1];
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        // Upload to storage
        const qrPath = `${campaign_id}/${recipient.id}.png`;
        const { error: uploadError } = await supabase.storage
          .from('qr-codes')
          .upload(qrPath, binaryData, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadError) {
          console.error(`Failed to upload QR code: ${uploadError.message}`);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('qr-codes')
          .getPublicUrl(qrPath);

        // Store first 5 for sample preview
        if (sampleQRs.length < 5) {
          sampleQRs.push({
            recipient_id: recipient.id,
            qr_url: publicUrl,
            purl
          });
        }

        successCount++;
      } catch (error) {
        console.error(`Error processing recipient ${recipient.id}:`, error);
      }
    }

    // Update campaign status to proofed
    await supabase
      .from('campaigns')
      .update({ status: 'proofed' })
      .eq('id', campaign_id);

    console.log(`Successfully generated ${successCount} QR codes`);

    return new Response(
      JSON.stringify({ 
        success: true,
        total: recipients.length,
        successCount,
        sampleQRs
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-recipient-tokens:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});