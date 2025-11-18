import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const isAdmin = roles?.some((r: any) => r.role === 'admin');
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    const { pool_id, csv_content } = await req.json();

    if (!pool_id || !csv_content) {
      throw new Error('Missing required fields: pool_id, csv_content');
    }

    console.log(`Importing gift cards for pool: ${pool_id}`);

    // Parse CSV
    const lines = csv_content.trim().split('\n');
    const headers = lines[0].toLowerCase().split(',').map((h: string) => h.trim());
    
    const requiredHeaders = ['card_code'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    const cardCodeIndex = headers.indexOf('card_code');
    const cardNumberIndex = headers.indexOf('card_number');
    const expirationDateIndex = headers.indexOf('expiration_date');

    // Get existing card codes to check for duplicates
    const { data: existingCards } = await supabaseClient
      .from('gift_cards')
      .select('card_code')
      .eq('pool_id', pool_id);

    const existingCodes = new Set(existingCards?.map(c => c.card_code) || []);

    const cardsToInsert = [];
    const duplicates = [];
    const errors = [];

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map((v: string) => v.trim());
      
      const cardCode = values[cardCodeIndex];
      if (!cardCode) {
        errors.push(`Row ${i + 1}: Missing card_code`);
        continue;
      }

      // Check for duplicates
      if (existingCodes.has(cardCode)) {
        duplicates.push(cardCode);
        continue;
      }

      const card: any = {
        pool_id,
        card_code: cardCode,
        status: 'available',
      };

      // Optional fields
      if (cardNumberIndex >= 0 && values[cardNumberIndex]) {
        card.card_number = values[cardNumberIndex];
      }
      if (expirationDateIndex >= 0 && values[expirationDateIndex]) {
        card.expiration_date = values[expirationDateIndex];
      }

      cardsToInsert.push(card);
      existingCodes.add(cardCode); // Track to prevent duplicates within this import
    }

    console.log(`Inserting ${cardsToInsert.length} gift cards`);

    // Bulk insert cards
    let successCount = 0;
    if (cardsToInsert.length > 0) {
      const { data, error } = await supabaseClient
        .from('gift_cards')
        .insert(cardsToInsert)
        .select();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      successCount = data?.length || 0;

      // Update pool statistics - fetch current values first
      const { data: poolData } = await supabaseClient
        .from('gift_card_pools')
        .select('total_cards, available_cards')
        .eq('id', pool_id)
        .single();

      if (poolData) {
        await supabaseClient
          .from('gift_card_pools')
          .update({
            total_cards: poolData.total_cards + successCount,
            available_cards: poolData.available_cards + successCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', pool_id);
      }
    }

    console.log(`Import complete: ${successCount} success, ${duplicates.length} duplicates, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: successCount,
        duplicates: duplicates.length,
        errors: errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error importing gift cards:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
