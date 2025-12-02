/**
 * Seed Client Gift Cards
 * 
 * Enables default gift card brands for a specific client
 * Run this script to allow clients to use gift cards in campaigns
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedClientGiftCards(clientId: string) {
  console.log(`\n🎁 Seeding gift cards for client: ${clientId}`);

  // 1. Get all available brands
  const { data: brands, error: brandsError } = await supabase
    .from('gift_card_brands')
    .select('id, brand_name, brand_code')
    .eq('is_enabled_by_admin', true);

  if (brandsError) {
    console.error('Error fetching brands:', brandsError);
    return;
  }

  if (!brands || brands.length === 0) {
    console.log('❌ No brands found. Please run brand seeding first.');
    return;
  }

  console.log(`✓ Found ${brands.length} enabled brands`);

  // 2. Get denominations for each brand
  for (const brand of brands) {
    const { data: denominations, error: denomError } = await supabase
      .from('gift_card_denominations')
      .select('denomination')
      .eq('brand_id', brand.id)
      .eq('is_enabled_by_admin', true);

    if (denomError) {
      console.error(`Error fetching denominations for ${brand.brand_name}:`, denomError);
      continue;
    }

    if (!denominations || denominations.length === 0) {
      console.log(`  ⚠ No denominations found for ${brand.brand_name}`);
      continue;
    }

    // 3. Add each brand-denomination combo to client_available_gift_cards
    for (const denom of denominations) {
      const { error: insertError } = await supabase
        .from('client_available_gift_cards')
        .upsert({
          client_id: clientId,
          brand_id: brand.id,
          denomination: denom.denomination,
          is_enabled: true,
        }, {
          onConflict: 'client_id,brand_id,denomination',
          ignoreDuplicates: false,
        });

      if (insertError) {
        console.error(`  ❌ Error adding ${brand.brand_name} $${denom.denomination}:`, insertError.message);
      } else {
        console.log(`  ✓ Added ${brand.brand_name} - $${denom.denomination}`);
      }
    }
  }

  console.log('\n✅ Client gift cards seeded successfully!');
}

// Get client ID from command line or use default
const clientId = process.argv[2];

if (!clientId) {
  console.error('\n❌ Please provide a client ID');
  console.log('Usage: npm run seed-client-gift-cards <client-id>');
  console.log('\nTo get client IDs, run:');
  console.log('  SELECT id, name FROM clients;');
  process.exit(1);
}

seedClientGiftCards(clientId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

