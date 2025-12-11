/**
 * Demo Data Generator Functions
 * Reusable functions for creating demo data incrementally
 */

import { faker } from '@faker-js/faker';
import { supabase } from '@core/services/supabase';

export interface DemoOrganization {
  id: string;
  name: string;
  type: string;
}

export interface DemoClient {
  id: string;
  name: string;
  industry: string;
  org_id: string;
}

export interface DemoContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface DemoCampaign {
  id: string;
  name: string;
  client_id: string;
  template_id: string;
  landing_page_id: string;
  audience_id: string;
  pool_id: string;
}

const AGENCY_NAMES = ['Summit Marketing Group', 'AutoReach Agency', 'Peak Digital Marketing', 'DriveForward Agency'];
const ROOFING_CLIENTS = ['Apex Roofing Solutions', 'StormGuard Roofing Co.', 'Premier Home Exteriors', 'SkyHigh Roofing'];
const AUTO_WARRANTY_CLIENTS = ['ShieldDrive Protection', 'AutoCare Plus Warranty', 'DriveSecure Extended Coverage', 'GuardianAuto Warranty'];

/**
 * Create a demo organization/agency
 */
export async function createDemoOrganization(): Promise<DemoOrganization> {
  const name = faker.helpers.arrayElement(AGENCY_NAMES) + ' ' + faker.number.int({ min: 100, max: 999 });
  
  const { data, error } = await supabase
    .from('organizations')
    .insert({
      name,
      type: 'agency',
      settings_json: {
        default_timezone: 'America/New_York',
        demo: true,
      },
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a demo client under an organization
 */
export async function createDemoClient(
  orgId: string,
  industry: 'roofing' | 'auto_warranty'
): Promise<DemoClient> {
  const names = industry === 'roofing' ? ROOFING_CLIENTS : AUTO_WARRANTY_CLIENTS;
  const name = faker.helpers.arrayElement(names) + ' ' + faker.number.int({ min: 10, max: 99 });
  
  const colors = {
    primary: faker.helpers.arrayElement(['#1E40AF', '#DC2626', '#059669', '#7C3AED']),
    secondary: faker.helpers.arrayElement(['#64748B', '#475569', '#334155']),
    accent: faker.helpers.arrayElement(['#F59E0B', '#EAB308', '#10B981']),
  };

  const { data, error } = await supabase
    .from('clients')
    .insert({
      org_id: orgId,
      name,
      industry,
      brand_colors_json: colors,
      tagline: `Professional ${industry === 'roofing' ? 'roofing' : 'auto warranty'} services`,
    })
    .select()
    .single();

  if (error) throw error;

  // Create brand kit
  await supabase.from('brand_kits').insert({
    client_id: data.id,
    name: 'Primary Brand Kit',
    primary_color: colors.primary,
    secondary_color: colors.secondary,
    accent_color: colors.accent,
  });

  return data;
}

/**
 * Generate demo contacts for a client
 */
export async function createDemoContacts(
  clientId: string,
  count: number,
  industry: 'roofing' | 'auto_warranty'
): Promise<DemoContact[]> {
  const contacts = [];

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${faker.internet.domainName()}`;
    
    const customFields = industry === 'roofing' ? {
      home_age: faker.number.int({ min: 5, max: 50 }),
      roof_type: faker.helpers.arrayElement(['Asphalt Shingle', 'Metal', 'Tile', 'Flat']),
    } : {
      vehicle_year: faker.number.int({ min: 2015, max: 2022 }),
      vehicle_make: faker.vehicle.manufacturer(),
      vehicle_model: faker.vehicle.model(),
      vehicle_mileage: faker.number.int({ min: 20000, max: 150000 }),
    };

    contacts.push({
      client_id: clientId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone: faker.phone.number('###-###-####'),
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zip: faker.location.zipCode('#####'),
      custom_fields: customFields,
    });
  }

  const { data, error } = await supabase
    .from('contacts')
    .insert(contacts)
    .select('id, first_name, last_name, email');

  if (error) throw error;
  return data;
}

/**
 * Create a contact list
 */
export async function createDemoContactList(
  clientId: string,
  name: string
): Promise<{ id: string; name: string }> {
  const { data, error } = await supabase
    .from('contact_lists')
    .insert({
      client_id: clientId,
      name,
      list_type: 'static',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a gift card pool with cards
 */
export async function createDemoGiftCardPool(
  clientId: string,
  brandId: string,
  cardValue: number,
  cardCount: number
): Promise<{ id: string; pool_name: string }> {
  // Create pool
  const poolName = `$${cardValue} Demo Pool ${faker.number.int({ min: 100, max: 999 })}`;
  
  const { data: pool, error: poolError } = await supabase
    .from('gift_card_pools')
    .insert({
      client_id: clientId,
      brand_id: brandId,
      pool_name: poolName,
      pool_type: 'csv_upload',
      card_value: cardValue,
      provider: 'TangoCard',
      total_cards: cardCount,
      available_cards: cardCount,
      claimed_cards: 0,
    })
    .select()
    .single();

  if (poolError) throw poolError;

  // Create cards
  const cards = [];
  for (let i = 0; i < cardCount; i++) {
    const code = faker.string.alphanumeric(16, { casing: 'upper' });
    cards.push({
      pool_id: pool.id,
      card_code: `DEMO-${code.substring(0, 4)}-${code.substring(4, 8)}-${code.substring(8, 12)}-${code.substring(12, 16)}`,
      card_number: faker.finance.creditCardNumber(),
      pin: faker.string.numeric(4),
      status: 'available',
    });
  }

  const { error: cardsError } = await supabase
    .from('gift_cards')
    .insert(cards);

  if (cardsError) throw cardsError;

  return { id: pool.id, pool_name: poolName };
}

/**
 * Create a complete demo campaign with all dependencies
 */
export async function createDemoCampaign(
  clientId: string,
  options?: {
    campaignType?: 'storm_damage' | 'warranty' | 'maintenance';
    industry?: 'roofing' | 'auto_warranty';
  }
): Promise<DemoCampaign> {
  const industry = options?.industry || 'roofing';
  const campaignType = options?.campaignType || (industry === 'roofing' ? 'storm_damage' : 'warranty');

  // Campaign templates
  const templates = {
    storm_damage: { name: 'Spring Storm Damage Mailer', offer: '$50 Home Depot Card' },
    warranty: { name: 'Extended Coverage Direct Mail', offer: '$25 Amazon Card' },
    maintenance: { name: 'Seasonal Maintenance Campaign', offer: '$25 Visa Card' },
  };

  const template = templates[campaignType];

  // 1. Create mailer template
  const { data: mailerTemplate, error: templateError } = await supabase
    .from('templates')
    .insert({
      client_id: clientId,
      name: template.name,
      size: '6x9',
      json_layers: {
        front: { headline: template.name },
        back: { cta: `Claim Your ${template.offer}` },
      },
    })
    .select()
    .single();

  if (templateError) throw templateError;

  // 2. Create landing page
  const { data: landingPage, error: lpError } = await supabase
    .from('landing_pages')
    .insert({
      client_id: clientId,
      name: `${template.name} Landing Page`,
      html_content: `<html><body><h1>${template.name}</h1><p>Claim your ${template.offer}</p></body></html>`,
      published: true,
    })
    .select()
    .single();

  if (lpError) throw lpError;

  // 3. Create audience
  const { data: audience, error: audienceError } = await supabase
    .from('audiences')
    .insert({
      client_id: clientId,
      name: `${template.name} Audience`,
      source: 'manual',
      total_count: 0,
    })
    .select()
    .single();

  if (audienceError) throw audienceError;

  // 4. Get or create gift card pool
  const { data: existingPools } = await supabase
    .from('gift_card_pools')
    .select('id')
    .eq('client_id', clientId)
    .gt('available_cards', 10)
    .limit(1);

  let poolId = existingPools?.[0]?.id;
  
  if (!poolId) {
    // Create a new pool
    const { data: brands } = await supabase
      .from('gift_card_brands')
      .select('id')
      .limit(1);
    
    if (brands && brands.length > 0) {
      const pool = await createDemoGiftCardPool(clientId, brands[0].id, 25, 25);
      poolId = pool.id;
    }
  }

  // 5. Create campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({
      client_id: clientId,
      name: template.name,
      status: 'draft',
      template_id: mailerTemplate.id,
      landing_page_id: landingPage.id,
      audience_id: audience.id,
      reward_pool_id: poolId,
      rewards_enabled: !!poolId,
      mail_date: faker.date.future({ years: 0.1 }),
    })
    .select()
    .single();

  if (campaignError) throw campaignError;

  // 6. Create campaign conditions
  await supabase.from('campaign_conditions').insert([
    {
      campaign_id: campaign.id,
      condition_type: 'sms_opt_in',
      is_required: true,
      trigger_reward: false,
    },
    {
      campaign_id: campaign.id,
      condition_type: 'call_verification',
      is_required: true,
      trigger_reward: true,
    },
  ]);

  // 7. Create reward config
  if (poolId) {
    await supabase.from('campaign_reward_configs').insert({
      campaign_id: campaign.id,
      reward_type: 'gift_card',
      reward_value: 25.00,
      delivery_method: 'sms',
    });
  }

  return {
    id: campaign.id,
    name: campaign.name,
    client_id: clientId,
    template_id: mailerTemplate.id,
    landing_page_id: landingPage.id,
    audience_id: audience.id,
    pool_id: poolId || '',
  };
}

/**
 * Create a complete demo setup (org, client, contacts, pool, campaign)
 */
export async function createCompleteDemoSetup(
  industry: 'roofing' | 'auto_warranty'
): Promise<{
  org: DemoOrganization;
  client: DemoClient;
  contacts: DemoContact[];
  campaign: DemoCampaign;
}> {
  // 1. Create organization
  const org = await createDemoOrganization();

  // 2. Create client
  const client = await createDemoClient(org.id, industry);

  // 3. Create contacts
  const contacts = await createDemoContacts(client.id, 50, industry);

  // 4. Create campaign (which creates template, landing page, pool, etc.)
  const campaign = await createDemoCampaign(client.id, { industry });

  return { org, client, contacts, campaign };
}

/**
 * Get existing organizations for selection
 */
export async function getExistingOrganizations(): Promise<DemoOrganization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, type')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data;
}

/**
 * Get existing clients for selection
 */
export async function getExistingClients(orgId?: string): Promise<DemoClient[]> {
  let query = supabase
    .from('clients')
    .select('id, name, industry, org_id')
    .order('created_at', { ascending: false });

  if (orgId) {
    query = query.eq('org_id', orgId);
  }

  const { data, error } = await query.limit(50);

  if (error) throw error;
  return data;
}

/**
 * Get gift card brands
 */
export async function getGiftCardBrands(): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await supabase
    .from('gift_card_brands')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

