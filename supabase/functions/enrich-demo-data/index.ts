import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple helper functions
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

function generateToken(length: number = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[randomInt(0, chars.length - 1)]).join('');
}

function generateDemoCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return `DEMO-${Array.from({ length: 6 }, () => chars[randomInt(0, chars.length - 1)]).join('')}`;
}

function pastDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, daysAgo));
  date.setHours(randomInt(9, 17), randomInt(0, 59), 0, 0);
  return date.toISOString();
}

const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Barbara'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const params = await req.json();
    const { dataTypes = [], quantities = {} } = params;

    console.log('Starting simplified data generation:', { dataTypes, quantities });

    const result = {
      batchId: crypto.randomUUID(),
      campaignsCreated: 0,
      recipientsCreated: 0,
      eventsCreated: 0,
      totalRecords: 0,
    };

    // Get ANY clients (not hardcoded)
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name')
      .limit(20);

    if (clientsError || !clients || clients.length === 0) {
      throw new Error('No clients found in database');
    }

    console.log(`Found ${clients.length} clients`);

    // SIMPLE: Just link campaigns to audiences if requested
    if (dataTypes.includes('campaigns') || dataTypes.includes('recipients')) {
      // Get campaigns without audiences
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, client_id, name, status')
        .limit(50);

      const campaignsNeedingAudiences = (campaigns || []).filter(c => !c.audience_id);

      console.log(`Found ${campaignsNeedingAudiences.length} campaigns needing audiences`);

      for (const campaign of campaignsNeedingAudiences) {
        try {
          // Create audience
          const { data: audience } = await supabase
            .from('audiences')
            .insert({
              client_id: campaign.client_id,
              name: `${campaign.name} - Recipients`,
              source: 'import',
              status: 'ready',
              total_count: 50,
              valid_count: 50,
            })
            .select()
            .single();

          if (!audience) continue;

          // Link campaign to audience
          await supabase
            .from('campaigns')
            .update({ audience_id: audience.id })
            .eq('id', campaign.id);

          result.campaignsCreated++;

          // Create recipients
          const recipients = [];
          for (let i = 0; i < 50; i++) {
            const firstName = randomElement(FIRST_NAMES);
            const lastName = randomElement(LAST_NAMES);
            
            recipients.push({
              audience_id: audience.id,
              first_name: firstName,
              last_name: lastName,
              email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@testmail.com`,
              phone: `+1555${String(randomInt(1000000, 9999999))}`,
              address1: `${randomInt(100, 9999)} Test St`,
              city: 'Phoenix',
              state: 'AZ',
              zip: '85001',
              token: generateToken(16),
              redemption_code: generateDemoCode(),
            });
          }

          // Insert recipients in batches of 50
          const { error: recipientsError } = await supabase
            .from('recipients')
            .insert(recipients);

          if (!recipientsError) {
            result.recipientsCreated += recipients.length;

            // Update audience counts
            await supabase
              .from('audiences')
              .update({
                total_count: recipients.length,
                valid_count: recipients.length,
              })
              .eq('id', audience.id);

            // Create some events if campaign is active
            if (campaign.status === 'completed' || campaign.status === 'in_production' || campaign.status === 'mailed') {
              // Get recipient IDs
              const { data: createdRecipients } = await supabase
                .from('recipients')
                .select('id')
                .eq('audience_id', audience.id);

              if (createdRecipients && createdRecipients.length > 0) {
                const events = [];
                const eventCount = Math.floor(recipients.length * 0.3); // 30% engagement

                for (let i = 0; i < eventCount; i++) {
                  events.push({
                    recipient_id: createdRecipients[i % createdRecipients.length].id,
                    campaign_id: campaign.id,
                    event_type: randomElement(['purl_visit', 'qr_scan', 'form_submission']),
                    event_data: { device: randomElement(['desktop', 'mobile', 'tablet']) },
                    created_at: pastDate(30),
                  });
                }

                if (events.length > 0) {
                  await supabase.from('events').insert(events);
                  result.eventsCreated += events.length;
                }
              }
            }
          }

          console.log(`✅ Linked campaign: ${campaign.name}`);

        } catch (error) {
          console.error(`Failed to process campaign ${campaign.name}:`, error);
          // Continue with next campaign
        }
      }
    }

    result.totalRecords = result.campaignsCreated + result.recipientsCreated + result.eventsCreated;

    console.log('✅ Generation complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Generation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
