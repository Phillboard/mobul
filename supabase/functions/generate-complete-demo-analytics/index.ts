import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';
import { corsHeaders } from '../_shared/cors.ts';

const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const CITIES = [
  { name: 'Austin', state: 'TX', zip: '78701' },
  { name: 'Dallas', state: 'TX', zip: '75201' },
  { name: 'Houston', state: 'TX', zip: '77001' },
  { name: 'Phoenix', state: 'AZ', zip: '85001' },
  { name: 'Denver', state: 'CO', zip: '80201' },
];

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateToken(length: number = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[randomInt(0, chars.length - 1)]).join('');
}

function generateDemoCode(): string {
  return `DEMO-${generateToken(6).toUpperCase()}`;
}

function pastDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, daysAgo));
  return date.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const results = {
      audiences: 0,
      recipients: 0,
      events: 0,
      conditions: 0,
      redemptions: 0,
      calls: 0,
    };

    // Get all campaigns without audiences
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, client_id, name, status')
      .is('audience_id', null)
      .neq('status', 'cancelled');

    if (!campaigns || campaigns.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'All campaigns already have audiences',
          results 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each campaign
    for (const campaign of campaigns) {
      const recipientCount = campaign.status === 'completed' || campaign.status === 'in_progress'
        ? randomInt(50, 100)
        : randomInt(10, 50);

      // Create audience
      const { data: audience } = await supabase
        .from('audiences')
        .insert({
          client_id: campaign.client_id,
          name: `${campaign.name} - Recipients`,
          source: 'import',
          status: 'ready',
          total_count: recipientCount,
          valid_count: recipientCount,
        })
        .select()
        .single();

      if (!audience) continue;
      results.audiences++;

      // Link campaign to audience
      await supabase
        .from('campaigns')
        .update({ audience_id: audience.id })
        .eq('id', campaign.id);

      // Create recipients
      const recipients = [];
      for (let i = 0; i < recipientCount; i++) {
        const firstName = randomElement(FIRST_NAMES);
        const lastName = randomElement(LAST_NAMES);
        const city = randomElement(CITIES);
        
        recipients.push({
          audience_id: audience.id,
          first_name: firstName,
          last_name: lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@testmail.com`,
          phone: `+1555${String(randomInt(1000000, 9999999))}`,
          address: `${randomInt(100, 9999)} Test St`,
          city: city.name,
          state: city.state,
          zip: city.zip,
          token: generateToken(16),
          redemption_code: generateDemoCode(),
        });
      }

      const { data: createdRecipients } = await supabase
        .from('recipients')
        .insert(recipients)
        .select('id');

      if (!createdRecipients) continue;
      results.recipients += createdRecipients.length;

      // Generate events for active campaigns
      if (campaign.status === 'completed' || campaign.status === 'in_progress') {
        const events = [];
        const visitCount = Math.floor(recipientCount * (0.3 + Math.random() * 0.3));
        
        // PURL visits
        for (let i = 0; i < visitCount; i++) {
          events.push({
            recipient_id: createdRecipients[i % createdRecipients.length].id,
            campaign_id: campaign.id,
            event_type: 'purl_visit',
            event_data: { browser: randomElement(['Chrome', 'Safari', 'Firefox']), device: randomElement(['desktop', 'mobile']) },
            created_at: pastDate(30),
          });
        }
        
        // QR scans (50% of visits)
        for (let i = 0; i < Math.floor(visitCount * 0.5); i++) {
          events.push({
            recipient_id: createdRecipients[i % createdRecipients.length].id,
            campaign_id: campaign.id,
            event_type: 'qr_scan',
            event_data: { device: 'mobile' },
            created_at: pastDate(25),
          });
        }
        
        // Form submissions (30% of visits)
        for (let i = 0; i < Math.floor(visitCount * 0.3); i++) {
          events.push({
            recipient_id: createdRecipients[i % createdRecipients.length].id,
            campaign_id: campaign.id,
            event_type: 'form_submission',
            event_data: { form_name: 'Lead Capture' },
            created_at: pastDate(20),
          });
        }

        if (events.length > 0) {
          await supabase.from('events').insert(events);
          results.events += events.length;
        }

        // Add condition if not exists
        const { data: existingCondition } = await supabase
          .from('campaign_conditions')
          .select('id')
          .eq('campaign_id', campaign.id)
          .single();

        if (!existingCondition) {
          // Get a pool for this client
          const { data: pool } = await supabase
            .from('gift_card_pools')
            .select('id')
            .eq('client_id', campaign.client_id)
            .gt('available_cards', 0)
            .limit(1)
            .single();

          if (pool) {
            await supabase
              .from('campaign_conditions')
              .insert({
                campaign_id: campaign.id,
                condition_number: 1,
                condition_name: 'Complete Form',
                condition_type: 'form_submission',
                trigger_action: 'send_gift_card',
                gift_card_pool_id: pool.id,
                sms_template: 'Your reward: {{card_code}}',
                is_required: true,
              });
            results.conditions++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Complete analytics data generated',
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

