/**
 * Diagnostic script to check Spring 27 campaign data
 * Run with: npx tsx scripts/run-diagnostics.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://uibvxwhwkatjcwghnzpu.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Missing SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDiagnostics() {
  console.log('='.repeat(60));
  console.log('SPRING 27 CAMPAIGN DIAGNOSTIC');
  console.log('='.repeat(60));

  // Query 1: Find Spring 27 Campaign
  console.log('\n📋 QUERY 1: CAMPAIGNS');
  const { data: campaigns, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, name, status, mailing_method, client_id, audience_id, created_at')
    .or('name.ilike.%spring%27%,name.ilike.%spring 27%')
    .order('created_at', { ascending: false });

  if (campaignError) {
    console.error('Error:', campaignError.message);
  } else {
    console.log('Found campaigns:', campaigns?.length || 0);
    campaigns?.forEach(c => {
      console.log(`  - ${c.name} (${c.id})`);
      console.log(`    Status: ${c.status}, Method: ${c.mailing_method}`);
      console.log(`    Audience ID: ${c.audience_id}`);
    });
  }

  if (!campaigns || campaigns.length === 0) {
    console.log('\n❌ No Spring 27 campaign found. Checking most recent campaigns...');
    
    const { data: recentCampaigns } = await supabase
      .from('campaigns')
      .select('id, name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log('Recent campaigns:');
    recentCampaigns?.forEach(c => {
      console.log(`  - ${c.name} (status: ${c.status}, created: ${c.created_at})`);
    });
    
    // Use most recent campaign for further diagnostics
    if (recentCampaigns && recentCampaigns.length > 0) {
      const latestCampaign = recentCampaigns[0];
      console.log(`\nUsing most recent campaign: ${latestCampaign.name}`);
      await checkCampaignConditions(latestCampaign.id, latestCampaign.name);
    }
    return;
  }

  const campaignId = campaigns[0].id;
  const campaignName = campaigns[0].name;
  
  await checkCampaignConditions(campaignId, campaignName);
}

async function checkCampaignConditions(campaignId: string, campaignName: string) {
  // Query 2: Campaign Conditions
  console.log(`\n📋 QUERY 2: CAMPAIGN CONDITIONS for "${campaignName}"`);
  const { data: conditions, error: condError } = await supabase
    .from('campaign_conditions')
    .select(`
      id,
      campaign_id,
      condition_number,
      condition_name,
      trigger_type,
      brand_id,
      card_value,
      sms_template,
      is_active,
      created_at
    `)
    .eq('campaign_id', campaignId)
    .order('condition_number');

  if (condError) {
    console.error('Error:', condError.message);
  } else {
    console.log('Found conditions:', conditions?.length || 0);
    conditions?.forEach(c => {
      console.log(`  - Condition ${c.condition_number}: ${c.condition_name}`);
      console.log(`    ID: ${c.id}`);
      console.log(`    brand_id: ${c.brand_id || '❌ NULL'}`);
      console.log(`    card_value: ${c.card_value || '❌ NULL'}`);
      console.log(`    is_active: ${c.is_active}`);
      console.log(`    sms_template: ${c.sms_template ? '✅ Set' : '⚠️ Not set'}`);
    });

    // Check if brand_id is NULL
    const nullBrandConditions = conditions?.filter(c => !c.brand_id) || [];
    if (nullBrandConditions.length > 0) {
      console.log('\n🚨 FOUND CONDITIONS WITH NULL brand_id!');
      console.log('This is the root cause of the 400 error.');
      nullBrandConditions.forEach(c => {
        console.log(`  - Condition ${c.condition_number} (${c.id}): brand_id = ${c.brand_id}`);
      });
    }
  }

  // Query 3: Gift Card Config
  console.log('\n📋 QUERY 3: GIFT CARD CONFIG TABLE');
  const { data: configs, error: configError } = await supabase
    .from('campaign_gift_card_config')
    .select('id, campaign_id, condition_number, brand_id, denomination, created_at')
    .eq('campaign_id', campaignId);

  if (configError) {
    console.error('Error:', configError.message);
  } else {
    console.log('Found configs:', configs?.length || 0);
    configs?.forEach(c => {
      console.log(`  - Condition ${c.condition_number}:`);
      console.log(`    brand_id: ${c.brand_id || '❌ NULL'}`);
      console.log(`    denomination: ${c.denomination || '❌ NULL'}`);
    });
  }

  // Query 4: Gift Card Brands
  console.log('\n📋 QUERY 4: AVAILABLE GIFT CARD BRANDS');
  const { data: brands, error: brandError } = await supabase
    .from('gift_card_brands')
    .select('id, brand_name, is_enabled_by_admin')
    .eq('is_enabled_by_admin', true)
    .order('brand_name')
    .limit(10);

  if (brandError) {
    console.error('Error:', brandError.message);
  } else {
    console.log('Enabled brands:');
    brands?.forEach(b => {
      console.log(`  - ${b.brand_name} (${b.id})`);
    });
  }

  // Look for Starbucks specifically
  const { data: starbucks } = await supabase
    .from('gift_card_brands')
    .select('id, brand_name')
    .ilike('brand_name', '%starbucks%')
    .single();
  
  if (starbucks) {
    console.log(`\n✅ Starbucks brand found: ${starbucks.id}`);
  }

  // Query 5: Recipients
  console.log('\n📋 QUERY 5: RECIPIENTS');
  const { data: recipients, error: recipError } = await supabase
    .from('recipients')
    .select(`
      id,
      redemption_code,
      first_name,
      last_name,
      audience_id,
      audiences!inner(
        campaign_id
      )
    `)
    .eq('audiences.campaign_id', campaignId)
    .limit(5);

  if (recipError) {
    console.error('Error:', recipError.message);
  } else {
    console.log('Found recipients:', recipients?.length || 0);
    recipients?.forEach(r => {
      console.log(`  - ${r.redemption_code}: ${r.first_name} ${r.last_name}`);
    });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  
  const hasNullBrand = conditions?.some(c => !c.brand_id);
  const hasNullValue = conditions?.some(c => !c.card_value);
  
  if (hasNullBrand || hasNullValue) {
    console.log('\n🚨 ROOT CAUSE IDENTIFIED:');
    if (hasNullBrand) console.log('   - brand_id is NULL in campaign_conditions');
    if (hasNullValue) console.log('   - card_value is NULL in campaign_conditions');
    console.log('\n💡 FIX: Run the emergency SQL fix to update the conditions');
    
    // Generate fix SQL
    if (starbucks && conditions && conditions.length > 0) {
      console.log('\n📝 GENERATED FIX SQL:');
      console.log(`
UPDATE campaign_conditions
SET 
  brand_id = '${starbucks.id}',
  card_value = 25.00,
  sms_template = COALESCE(sms_template, 'Hi {first_name}! Your \${value} {provider} gift card: {link}')
WHERE campaign_id = '${campaignId}'
  AND is_active = true
  AND (brand_id IS NULL OR card_value IS NULL);
`);
    }
  } else if (conditions && conditions.length > 0) {
    console.log('\n✅ Campaign conditions look correct!');
    console.log('   brand_id and card_value are populated.');
    console.log('\n🔍 If provisioning still fails, check:');
    console.log('   1. Edge function deployment status');
    console.log('   2. Campaign status (must be "mailed" or "in_production")');
    console.log('   3. RLS policies on campaign_conditions table');
  } else {
    console.log('\n❌ No conditions found for this campaign!');
  }
}

runDiagnostics().catch(console.error);

