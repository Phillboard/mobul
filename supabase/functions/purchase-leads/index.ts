import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple mock data generators
const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'James', 'Mary', 'Robert', 'Linda', 'William', 'Patricia', 'Richard', 'Jennifer', 'Thomas', 'Elizabeth'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor'];
const cities = ['Dallas', 'Houston', 'Austin', 'San Antonio', 'Fort Worth', 'Phoenix', 'Tucson', 'Miami', 'Tampa', 'Orlando', 'Atlanta', 'Denver', 'Seattle', 'Portland', 'Las Vegas'];
const streets = ['Main St', 'Oak Ave', 'Pine Rd', 'Maple Dr', 'Cedar Ln', 'Elm St', 'Park Ave', 'Lake Dr', 'Hill Rd', 'Valley Ln'];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateZipCode(): string {
  return String(randomNumber(10000, 99999));
}

function generatePhone(): string {
  return `${randomNumber(200, 999)}-${randomNumber(200, 999)}-${randomNumber(1000, 9999)}`;
}

function generateEmail(firstName: string, lastName: string): string {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${randomElement(domains)}`;
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function generateMockRecipient(filters: any, vertical: string) {
  const firstName = randomElement(firstNames);
  const lastName = randomElement(lastNames);
  const city = randomElement(cities);
  const state = ['TX', 'AZ', 'FL', 'GA', 'CO', 'WA', 'OR', 'NV'][randomNumber(0, 7)];
  
  return {
    first_name: firstName,
    last_name: lastName,
    email: generateEmail(firstName, lastName),
    phone: generatePhone(),
    company: Math.random() > 0.5 ? `${lastName} ${vertical === 'roofing' ? 'Roofing' : vertical === 'rei' ? 'Properties' : 'Auto'}` : null,
    address1: `${randomNumber(100, 9999)} ${randomElement(streets)}`,
    address2: Math.random() > 0.8 ? `Apt ${randomNumber(1, 999)}` : null,
    city,
    state,
    zip: generateZipCode(),
    token: generateToken(),
    validation_status: 'valid',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { client_id, lead_source_id, filters, quantity, vertical } = await req.json();

    console.log('Purchase leads request:', { client_id, lead_source_id, filters, quantity, vertical });

    // Calculate cost (e.g., $0.15 per lead = 15 cents)
    const pricePerLead = 15; // cents
    const totalCost = quantity * pricePerLead;

    // Check client credits
    const { data: client, error: clientError } = await supabaseClient
      .from('clients')
      .select('credits')
      .eq('id', client_id)
      .single();

    if (clientError) {
      throw new Error(`Failed to fetch client: ${clientError.message}`);
    }

    if (!client || client.credits < totalCost) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient credits',
          required: totalCost,
          available: client?.credits || 0
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create audience
    const audienceName = `Lead Purchase ${new Date().toLocaleDateString()} - ${vertical}`;
    const { data: audience, error: audienceError } = await supabaseClient
      .from('audiences')
      .insert({
        client_id,
        name: audienceName,
        source: 'purchase',
        total_count: quantity,
        valid_count: quantity,
        invalid_count: 0,
        status: 'complete',
      })
      .select()
      .single();

    if (audienceError) {
      throw new Error(`Failed to create audience: ${audienceError.message}`);
    }

    console.log('Created audience:', audience.id);

    // Generate and insert recipients in batches
    const batchSize = 100;
    const batches = Math.ceil(quantity / batchSize);
    
    for (let i = 0; i < batches; i++) {
      const batchRecipients = [];
      const currentBatchSize = Math.min(batchSize, quantity - (i * batchSize));
      
      for (let j = 0; j < currentBatchSize; j++) {
        const recipient = generateMockRecipient(filters, vertical);
        batchRecipients.push({
          ...recipient,
          audience_id: audience.id,
        });
      }

      const { error: recipientsError } = await supabaseClient
        .from('recipients')
        .insert(batchRecipients);

      if (recipientsError) {
        console.error('Failed to insert recipients batch:', recipientsError);
        throw new Error(`Failed to insert recipients: ${recipientsError.message}`);
      }

      console.log(`Inserted batch ${i + 1}/${batches} (${batchRecipients.length} recipients)`);
    }

    // Create lead purchase record
    const { data: purchase, error: purchaseError } = await supabaseClient
      .from('lead_purchases')
      .insert({
        client_id,
        lead_source_id,
        filter_json: filters,
        quantity,
        price_cents: totalCost,
        audience_id: audience.id,
        payment_status: 'paid',
      })
      .select()
      .single();

    if (purchaseError) {
      throw new Error(`Failed to create purchase record: ${purchaseError.message}`);
    }

    // Deduct credits from client
    const { error: updateError } = await supabaseClient
      .from('clients')
      .update({ credits: client.credits - totalCost })
      .eq('id', client_id);

    if (updateError) {
      console.error('Failed to deduct credits:', updateError);
      // Don't fail the whole transaction, just log it
    }

    console.log('Purchase complete:', { audience_id: audience.id, quantity, cost: totalCost });

    return new Response(
      JSON.stringify({
        success: true,
        audience_id: audience.id,
        audience_name: audienceName,
        quantity,
        cost: totalCost,
        remaining_credits: client.credits - totalCost,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in purchase-leads:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});