/**
 * Simulate Mail Tracking Function
 * 
 * Simulates USPS tracking events for testing and demo purposes:
 * 1. Generates realistic tracking data for campaign recipients
 * 2. Creates delivered/returned events
 * 3. Updates mail tracking status
 * 4. Used for testing campaign workflows without actual mail
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SimulateTrackingRequest {
  campaignId: string;
  deliveryRate?: number; // Percentage of mail delivered (default 85%)
  returnRate?: number; // Percentage of mail returned (default 5%)
}

interface SimulateTrackingResult {
  success: boolean;
  campaignId: string;
  deliveredCount: number;
  returnedCount: number;
  inTransitCount: number;
  totalRecipients: number;
  error?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const {
      campaignId,
      deliveryRate = 85,
      returnRate = 5,
    }: SimulateTrackingRequest = await req.json();

    console.log('[SIMULATE-TRACKING] Starting:', { campaignId, deliveryRate, returnRate });

    // Validate inputs
    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }

    // =====================================================
    // STEP 1: Get all recipients for this campaign
    // =====================================================
    
    const { data: recipients, error: recipientsError } = await supabaseClient
      .from('recipients')
      .select('id')
      .eq('campaign_id', campaignId);

    if (recipientsError) {
      throw new Error(`Failed to fetch recipients: ${recipientsError.message}`);
    }

    if (!recipients || recipients.length === 0) {
      throw new Error('No recipients found for this campaign');
    }

    console.log(`[SIMULATE-TRACKING] Found ${recipients.length} recipients`);

    // =====================================================
    // STEP 2: Generate tracking events based on rates
    // =====================================================
    
    let deliveredCount = 0;
    let returnedCount = 0;
    let inTransitCount = 0;

    const trackingEvents = [];

    for (const recipient of recipients) {
      const random = Math.random() * 100;
      
      let status: 'delivered' | 'returned' | 'in_transit';
      let trackingCode: string;

      if (random < deliveryRate) {
        // Delivered
        status = 'delivered';
        trackingCode = `9400${Math.floor(Math.random() * 1000000000000000000)}`;
        deliveredCount++;
        
        trackingEvents.push({
          recipient_id: recipient.id,
          campaign_id: campaignId,
          event_type: 'mail_delivered',
          event_data: {
            tracking_number: trackingCode,
            delivery_date: new Date().toISOString(),
            carrier: 'USPS',
            simulated: true,
          },
          created_at: new Date().toISOString(),
        });
      } else if (random < deliveryRate + returnRate) {
        // Returned
        status = 'returned';
        trackingCode = `9400${Math.floor(Math.random() * 1000000000000000000)}`;
        returnedCount++;
        
        trackingEvents.push({
          recipient_id: recipient.id,
          campaign_id: campaignId,
          event_type: 'mail_returned',
          event_data: {
            tracking_number: trackingCode,
            return_date: new Date().toISOString(),
            return_reason: 'Address Unknown',
            carrier: 'USPS',
            simulated: true,
          },
          created_at: new Date().toISOString(),
        });
      } else {
        // In transit
        status = 'in_transit';
        trackingCode = `9400${Math.floor(Math.random() * 1000000000000000000)}`;
        inTransitCount++;
        
        trackingEvents.push({
          recipient_id: recipient.id,
          campaign_id: campaignId,
          event_type: 'mail_in_transit',
          event_data: {
            tracking_number: trackingCode,
            scan_date: new Date().toISOString(),
            location: 'Distribution Center',
            carrier: 'USPS',
            simulated: true,
          },
          created_at: new Date().toISOString(),
        });
      }

      // Update recipient tracking status
      await supabaseClient
        .from('recipients')
        .update({
          mail_tracking_code: trackingCode,
          mail_status: status,
          mail_delivered_at: status === 'delivered' ? new Date().toISOString() : null,
        })
        .eq('id', recipient.id);
    }

    // =====================================================
    // STEP 3: Insert tracking events
    // =====================================================
    
    if (trackingEvents.length > 0) {
      const { error: eventsError } = await supabaseClient
        .from('campaign_events')
        .insert(trackingEvents);

      if (eventsError) {
        console.error('[SIMULATE-TRACKING] Failed to insert events:', eventsError);
      }
    }

    // =====================================================
    // STEP 4: Trigger condition evaluation for delivered mail
    // =====================================================
    
    console.log('[SIMULATE-TRACKING] Triggering condition evaluations...');

    for (const recipient of recipients) {
      // Only evaluate conditions for delivered mail
      const event = trackingEvents.find(e => 
        e.recipient_id === recipient.id && 
        e.event_type === 'mail_delivered'
      );

      if (event) {
        try {
          await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/evaluate-conditions`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({
                recipientId: recipient.id,
                campaignId: campaignId,
                eventType: 'mail_delivered',
                metadata: event.event_data,
              }),
            }
          );
        } catch (evalError) {
          console.error('[SIMULATE-TRACKING] Condition evaluation failed:', evalError);
        }
      }
    }

    // =====================================================
    // STEP 5: Return result
    // =====================================================
    
    const result: SimulateTrackingResult = {
      success: true,
      campaignId,
      deliveredCount,
      returnedCount,
      inTransitCount,
      totalRecipients: recipients.length,
    };

    console.log('[SIMULATE-TRACKING] Complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[SIMULATE-TRACKING] Error:', error);

    const result: SimulateTrackingResult = {
      success: false,
      campaignId: '',
      deliveredCount: 0,
      returnedCount: 0,
      inTransitCount: 0,
      totalRecipients: 0,
      error: error.message || 'Unknown error occurred',
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

