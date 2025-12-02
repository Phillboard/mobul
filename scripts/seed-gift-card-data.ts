/**
 * Seed Gift Card Data Script
 * 
 * Seeds the database with:
 * - Popular gift card brands
 * - Standard denominations ($5, $10, $25, $50, $100)
 * - Sample inventory cards for testing
 */

import { createClient } from '@supabase/supabase-js';

// Try to get from environment or use default local values
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY environment variable is required');
  console.log('\nSet environment variables:');
  console.log('  $env:SUPABASE_URL="your_url"');
  console.log('  $env:SUPABASE_SERVICE_ROLE_KEY="your_key"');
  console.log('\nOr create a .env file with:');
  console.log('  VITE_SUPABASE_URL=your_url');
  console.log('  VITE_SUPABASE_ANON_KEY=your_anon_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Popular gift card brands
const BRANDS = [
  {
    brand_name: 'Amazon',
    brand_code: 'amazon',
    tillo_brand_code: 'amazon',
    category: 'retail',
    logo_url: 'https://logo.clearbit.com/amazon.com',
    is_enabled_by_admin: true,
  },
  {
    brand_name: 'Starbucks',
    brand_code: 'starbucks',
    tillo_brand_code: 'starbucks',
    category: 'food_beverage',
    logo_url: 'https://logo.clearbit.com/starbucks.com',
    is_enabled_by_admin: true,
  },
  {
    brand_name: 'Target',
    brand_code: 'target',
    tillo_brand_code: 'target',
    category: 'retail',
    logo_url: 'https://logo.clearbit.com/target.com',
    is_enabled_by_admin: true,
  },
  {
    brand_name: 'Walmart',
    brand_code: 'walmart',
    tillo_brand_code: 'walmart',
    category: 'retail',
    logo_url: 'https://logo.clearbit.com/walmart.com',
    is_enabled_by_admin: true,
  },
  {
    brand_name: 'Visa',
    brand_code: 'visa',
    tillo_brand_code: 'visa',
    category: 'prepaid',
    logo_url: 'https://logo.clearbit.com/visa.com',
    is_enabled_by_admin: true,
  },
];

// Standard denominations
const DENOMINATIONS = [5, 10, 25, 50, 100];

// Generate sample card code
function generateCardCode(brandCode: string, index: number): string {
  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${brandCode.substring(0, 3).toUpperCase()}-${randomPart}-${index.toString().padStart(4, '0')}`;
}

async function main() {
  console.log('🎁 Starting gift card data seed...\n');

  // Step 1: Insert brands
  console.log('1️⃣ Inserting gift card brands...');
  const { data: insertedBrands, error: brandsError } = await supabase
    .from('gift_card_brands')
    .upsert(BRANDS, { onConflict: 'brand_code' })
    .select();

  if (brandsError) {
    console.error('❌ Error inserting brands:', brandsError);
    process.exit(1);
  }

  console.log(`✅ Inserted ${insertedBrands.length} brands\n`);

  // Step 2: Insert denominations for each brand
  console.log('2️⃣ Creating denominations...');
  const denominations: any[] = [];

  for (const brand of insertedBrands) {
    for (const denom of DENOMINATIONS) {
      denominations.push({
        brand_id: brand.id,
        denomination: denom,
        is_enabled_by_admin: true,
        admin_cost_per_card: denom * 0.95, // 5% discount
        tillo_cost_per_card: denom * 0.97, // 3% discount from Tillo
      });
    }
  }

  const { data: insertedDenoms, error: denomsError } = await supabase
    .from('gift_card_denominations')
    .upsert(denominations, { onConflict: 'brand_id,denomination' })
    .select();

  if (denomsError) {
    console.error('❌ Error inserting denominations:', denomsError);
    process.exit(1);
  }

  console.log(`✅ Created ${insertedDenoms.length} denominations\n`);

  // Step 3: Generate sample inventory cards
  console.log('3️⃣ Generating sample inventory cards...');
  const inventoryCards: any[] = [];
  const CARDS_PER_BRAND_DENOM = 50;

  for (const brand of insertedBrands) {
    for (const denom of DENOMINATIONS) {
      for (let i = 0; i < CARDS_PER_BRAND_DENOM; i++) {
        inventoryCards.push({
          brand_id: brand.id,
          denomination: denom,
          card_code: generateCardCode(brand.brand_code, i),
          card_number: Math.random().toString().substring(2, 18),
          expiration_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'available',
          notes: 'Seed data for testing',
        });
      }
    }
  }

  // Insert in batches to avoid timeout
  const BATCH_SIZE = 500;
  let totalInserted = 0;

  for (let i = 0; i < inventoryCards.length; i += BATCH_SIZE) {
    const batch = inventoryCards.slice(i, i + BATCH_SIZE);
    const { error: invError } = await supabase
      .from('gift_card_inventory')
      .insert(batch);

    if (invError) {
      console.error(`❌ Error inserting inventory batch ${i / BATCH_SIZE + 1}:`, invError);
      process.exit(1);
    }

    totalInserted += batch.length;
    console.log(`   Inserted batch ${Math.ceil(totalInserted / BATCH_SIZE)}/${Math.ceil(inventoryCards.length / BATCH_SIZE)} (${totalInserted} cards)`);
  }

  console.log(`✅ Generated ${totalInserted} inventory cards\n`);

  // Summary
  console.log('📊 Seed Summary:');
  console.log(`   Brands: ${insertedBrands.length}`);
  console.log(`   Denominations: ${insertedDenoms.length}`);
  console.log(`   Inventory Cards: ${totalInserted}`);
  console.log('\n🎉 Gift card seed data complete!');
}

main().catch((error) => {
  console.error('❌ Seed script failed:', error);
  process.exit(1);
});

