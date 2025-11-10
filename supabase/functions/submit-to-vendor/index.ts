import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubmitToVendorRequest {
  campaignId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { campaignId } = await req.json() as SubmitToVendorRequest;

    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: 'Campaign ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing vendor submission for campaign: ${campaignId}`);

    // Get campaign details with authorization check
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*, client_id, audience_id')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('Campaign fetch error:', campaignError);
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate campaign status
    if (campaign.status !== 'approved') {
      return new Response(
        JSON.stringify({ error: 'Campaign must be approved before submitting to vendor' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recipient count
    const { count: recipientCount, error: countError } = await supabase
      .from('recipients')
      .select('*', { count: 'exact', head: true })
      .eq('audience_id', campaign.audience_id);

    if (countError) {
      console.error('Recipient count error:', countError);
      return new Response(
        JSON.stringify({ error: 'Failed to get recipient count' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalRecipients = recipientCount || 0;
    const batchSize = 10000;
    const batchCount = Math.ceil(totalRecipients / batchSize);
    
    console.log(`Creating ${batchCount} batches for ${totalRecipients} recipients`);

    // Create print batches
    const batches = [];
    for (let i = 0; i < batchCount; i++) {
      const batchRecipientCount = Math.min(batchSize, totalRecipients - (i * batchSize));
      
      const { data: batch, error: batchError } = await supabase
        .from('print_batches')
        .insert({
          campaign_id: campaignId,
          batch_number: i + 1,
          recipient_count: batchRecipientCount,
          vendor: 'Lob', // Default vendor for mock
          status: 'pending',
          pdf_url: `https://mock-vendor.example.com/pdf/${campaignId}/batch-${i + 1}.pdf`, // Mock PDF URL
        })
        .select()
        .single();

      if (batchError) {
        console.error('Batch creation error:', batchError);
        continue;
      }

      batches.push(batch);
      
      // Simulate vendor API call
      console.log(`Mock vendor API call for batch ${i + 1}:`, {
        batch_id: batch.id,
        campaign_id: campaignId,
        recipient_count: batchRecipientCount,
        vendor: 'Lob',
      });
    }

    // Update campaign status to in_production
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({ status: 'in_production' })
      .eq('id', campaignId);

    if (updateError) {
      console.error('Campaign update error:', updateError);
    }

    // Calculate estimated completion time (3-5 business days)
    const estimatedDays = Math.floor(Math.random() * 3) + 3;
    const estimatedCompletion = new Date();
    estimatedCompletion.setDate(estimatedCompletion.getDate() + estimatedDays);

    console.log(`Successfully submitted campaign ${campaignId} to vendor`);

    return new Response(
      JSON.stringify({
        success: true,
        batchCount: batches.length,
        totalRecipients,
        batches: batches.map(b => ({ id: b.id, batch_number: b.batch_number })),
        estimatedCompletion: estimatedCompletion.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in submit-to-vendor:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
