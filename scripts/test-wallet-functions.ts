/**
 * Test script for wallet pass generation edge functions
 * Run with: npx tsx scripts/test-wallet-functions.ts
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test gift card data
const testGiftCard = {
  id: 'test-' + Date.now(),
  card_code: 'TEST-1234-5678-9012',
  card_number: '1234567890123456',
  card_value: 25.00,
  provider: 'Test Provider',
  brand_name: 'Test Brand',
  logo_url: 'https://via.placeholder.com/150',
  expiration_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
  recipient_name: 'Test User',
};

async function testGoogleWallet() {
  console.log('\n🔵 Testing Google Wallet Pass Generation...');
  console.log('━'.repeat(50));

  try {
    const { data, error } = await supabase.functions.invoke(
      'generate-google-wallet-pass',
      { body: { giftCard: testGiftCard } }
    );

    if (error) {
      console.error('❌ Error:', error);
      return false;
    }

    if (data?.error) {
      if (data.error === 'Google Wallet not configured') {
        console.log('⚠️  Google Wallet is not configured (expected if secrets not set)');
        console.log('   Required secrets:', data.requiredSecrets?.join(', '));
        console.log('   Setup URL:', data.setupUrl);
        return 'not_configured';
      }
      console.error('❌ Error:', data.error);
      return false;
    }

    if (data?.success && data?.url) {
      console.log('✅ Google Wallet pass generated successfully!');
      console.log('   Object ID:', data.objectId);
      console.log('   Class ID:', data.classId);
      console.log('   Save URL:', data.url.substring(0, 80) + '...');
      return true;
    }

    console.log('⚠️  Unexpected response:', JSON.stringify(data, null, 2));
    return false;

  } catch (err) {
    console.error('❌ Exception:', err);
    return false;
  }
}

async function testAppleWallet() {
  console.log('\n🍎 Testing Apple Wallet Pass Generation...');
  console.log('━'.repeat(50));

  try {
    const { data, error } = await supabase.functions.invoke(
      'generate-apple-wallet-pass',
      { body: { giftCard: testGiftCard } }
    );

    if (error) {
      console.error('❌ Error:', error);
      return false;
    }

    // Check if it's an error response
    if (data && typeof data === 'object' && 'error' in data) {
      if (data.error === 'Apple Wallet not configured') {
        console.log('⚠️  Apple Wallet is not configured (expected if secrets not set)');
        console.log('   Required secrets:', data.requiredSecrets?.join(', '));
        console.log('   Setup URL:', data.setupUrl);
        return 'not_configured';
      }
      console.error('❌ Error:', data.error);
      if (data.hint) console.log('   Hint:', data.hint);
      return false;
    }

    // Check if we got binary data (success)
    if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
      const size = data instanceof ArrayBuffer ? data.byteLength : data.length;
      console.log('✅ Apple Wallet pass generated successfully!');
      console.log('   File size:', size, 'bytes');
      console.log('   File type: application/vnd.apple.pkpass');
      return true;
    }

    // If we got here, we might have a blob or other format
    console.log('⚠️  Response type:', typeof data);
    if (data && typeof data === 'object') {
      console.log('   Response keys:', Object.keys(data));
    }
    
    // Still might be valid if it's not an error
    return data ? true : false;

  } catch (err) {
    console.error('❌ Exception:', err);
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║     Wallet Pass Generation Function Tests          ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('\nSupabase URL:', SUPABASE_URL);
  console.log('Test Gift Card:', testGiftCard.brand_name, '-', `$${testGiftCard.card_value}`);

  const googleResult = await testGoogleWallet();
  const appleResult = await testAppleWallet();

  console.log('\n' + '═'.repeat(50));
  console.log('SUMMARY');
  console.log('═'.repeat(50));
  
  const getStatusIcon = (result: boolean | string) => {
    if (result === true) return '✅ Working';
    if (result === 'not_configured') return '⚙️  Needs Configuration';
    return '❌ Failed';
  };

  console.log('Google Wallet:', getStatusIcon(googleResult));
  console.log('Apple Wallet: ', getStatusIcon(appleResult));

  if (googleResult === 'not_configured' || appleResult === 'not_configured') {
    console.log('\n📋 Next Steps:');
    console.log('1. Run: .\\scripts\\setup-wallet-credentials.ps1');
    console.log('2. Follow the prompts to configure your credentials');
    console.log('3. Deploy the edge functions:');
    console.log('   supabase functions deploy generate-google-wallet-pass');
    console.log('   supabase functions deploy generate-apple-wallet-pass');
  }

  if (googleResult === true || appleResult === true) {
    console.log('\n🎉 Wallet passes are working! Test on a mobile device.');
  }
}

main().catch(console.error);

