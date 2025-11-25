import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichmentParams {
  dataTypes?: string[];
  quantities?: Record<string, number>;
  selectedBrands?: string[];
  scope?: 'total' | 'per_agency' | 'per_client';
  markAsSimulated?: boolean;
}

interface EnrichmentResult {
  batchId: string;
  brandsCreated: number;
  poolsCreated: number;
  giftCardsCreated: number;
  contactsCreated: number;
  contactListsCreated: number;
  contactTagsCreated: number;
  templatesCreated: number;
  landingPagesCreated: number;
  audiencesCreated: number;
  campaignsCreated: number;
  conditionsCreated: number;
  rewardConfigsCreated: number;
  recipientsCreated: number;
  trackedNumbersCreated: number;
  callSessionsCreated: number;
  conditionsMetCreated: number;
  deliveriesCreated: number;
  smsLogsCreated: number;
  totalRecords: number;
}

// ============= HELPER FUNCTIONS =============

const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen', 'Daniel', 'Nancy', 'Matthew', 'Lisa', 'Anthony', 'Betty', 'Mark', 'Sandra', 'Donald', 'Ashley'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'White', 'Harris', 'Clark'];
const cities = ['Phoenix', 'Scottsdale', 'Tempe', 'Mesa', 'Chandler', 'Gilbert', 'Glendale', 'Peoria', 'Surprise', 'Avondale'];
const streets = ['Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Pine Rd', 'Elm Blvd', 'Washington St', 'Lincoln Ave'];

const jobTitles: Record<string, string[]> = {
  roofing: ['Property Manager', 'Homeowner', 'Building Manager', 'Facilities Director', 'HOA President'],
  realty: ['Home Buyer', 'Seller', 'Real Estate Investor', 'Property Developer', 'First-Time Buyer'],
  auto: ['Fleet Manager', 'Vehicle Owner', 'Operations Manager', 'Dealership Owner', 'Auto Enthusiast'],
  default: ['Business Owner', 'Director', 'Manager', 'VP Operations', 'Executive'],
};

const leadSources = ['website', 'referral', 'direct_mail', 'event', 'social_media', 'cold_call', 'partner'];
const tags = ['hot-lead', 'vip', 'decision-maker', 'budget-approved', 'needs-followup', 'high-value', 'urgent'];

const generatePhone = () => `${480 + Math.floor(Math.random() * 3)}${Math.floor(Math.random() * 9000000 + 1000000)}`;
const generateEmail = (first: string, last: string, domain: string) => 
  `${first.toLowerCase()}.${last.toLowerCase()}@${domain.toLowerCase().replace(/\s+/g, '')}.com`;

const generateRedemptionCode = () => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = '0123456789';
  return `${letters.charAt(Math.floor(Math.random() * letters.length))}${letters.charAt(Math.floor(Math.random() * letters.length))}${letters.charAt(Math.floor(Math.random() * letters.length))}-${nums.charAt(Math.floor(Math.random() * 10))}${nums.charAt(Math.floor(Math.random() * 10))}${nums.charAt(Math.floor(Math.random() * 10))}${nums.charAt(Math.floor(Math.random() * 10))}`;
};

const generateToken = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

// Gift card code generators
const generateAmazonCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'AMZN-';
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
    if ((i + 1) % 4 === 0 && i < 15) code += '-';
  }
  return code;
};

const generateVisaCard = () => {
  const cardNumber = `4${Math.floor(Math.random() * 900000000000000 + 100000000000000)}`;
  const cvv = Math.floor(Math.random() * 900 + 100).toString();
  const expMonth = Math.floor(Math.random() * 12 + 1).toString().padStart(2, '0');
  const expYear = (new Date().getFullYear() + 1 + Math.floor(Math.random() * 3)).toString().slice(-2);
  return {
    cardNumber,
    code: `VISA-${cardNumber.slice(-8)}`,
    expiration: `${expMonth}/${expYear}`,
    cvv
  };
};

const generateTargetCode = () => {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = 'TGT-';
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const generateAppleCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'APL-';
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
    if ((i + 1) % 4 === 0 && i < 15) code += '-';
  }
  return code;
};

const generateGenericCode = (prefix: string) => {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = `${prefix}-`;
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const randomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const randomElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// ============= MAIN FUNCTION =============

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    const { data: { user } } = await supabase.auth.getUser(authHeader?.replace('Bearer ', ''));

    const params: EnrichmentParams = req.method === 'POST' ? await req.json() : {};
    const {
      dataTypes = [],
      quantities = {},
      selectedBrands = ['AMZN', 'VISA', 'TARG', 'APPL', 'BEST', 'HOME'],
      scope = 'per_client',
      markAsSimulated = true,
    } = params;

    console.log('🚀 Starting bulletproof data simulation:', { dataTypes, quantities, scope });

    const batchId = crypto.randomUUID();
    await supabase.from('simulation_batches').insert({
      id: batchId,
      created_by: user?.id,
      data_types: dataTypes,
      parameters: params,
      status: 'running',
    });

    const result: EnrichmentResult = {
      batchId,
      brandsCreated: 0,
      poolsCreated: 0,
      giftCardsCreated: 0,
      contactsCreated: 0,
      contactListsCreated: 0,
      contactTagsCreated: 0,
      templatesCreated: 0,
      landingPagesCreated: 0,
      audiencesCreated: 0,
      campaignsCreated: 0,
      conditionsCreated: 0,
      rewardConfigsCreated: 0,
      recipientsCreated: 0,
      trackedNumbersCreated: 0,
      callSessionsCreated: 0,
      conditionsMetCreated: 0,
      deliveriesCreated: 0,
      smsLogsCreated: 0,
      totalRecords: 0,
    };

    // Get MoPads clients
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, industry')
      .in('name', ['Vertical Roofing Experts', 'Prime Realty Group', 'Premier Auto Warranty', 'AutoGuard Protection']);

    if (!clients || clients.length === 0) {
      throw new Error('No clients found');
    }

    // Track created IDs for linking
    const brandMap = new Map<string, string>();
    const poolsByClient = new Map<string, any[]>();
    const contactsByClient = new Map<string, any[]>();
    const listsByClient = new Map<string, any[]>();
    const templatesByClient = new Map<string, any[]>();
    const landingPagesByClient = new Map<string, any[]>();
    const campaignsByClient = new Map<string, any[]>();
    const audiencesByClient = new Map<string, any[]>();
    const trackedNumbersByCampaign = new Map<string, any[]>();
    const recipientsByCampaign = new Map<string, any[]>();

    // ===== PHASE 1: GIFT CARD INFRASTRUCTURE =====
    if (dataTypes.includes('brands') || dataTypes.includes('pools') || dataTypes.includes('giftCards')) {
      console.log('📦 Phase 1: Gift Card Infrastructure...');

      const allBrandConfigs: Record<string, { brand_name: string; brand_code: string; provider: string; category: string; logo_url: string }> = {
        'AMZN': { brand_name: 'Amazon', brand_code: 'AMZN', provider: 'Amazon', category: 'E-Commerce', logo_url: 'https://logo.clearbit.com/amazon.com' },
        'VISA': { brand_name: 'Visa', brand_code: 'VISA', provider: 'Visa', category: 'Prepaid Card', logo_url: 'https://logo.clearbit.com/visa.com' },
        'TARG': { brand_name: 'Target', brand_code: 'TGT', provider: 'Target', category: 'Retail', logo_url: 'https://logo.clearbit.com/target.com' },
        'APPL': { brand_name: 'Apple', brand_code: 'APPL', provider: 'Apple', category: 'Technology', logo_url: 'https://logo.clearbit.com/apple.com' },
        'BEST': { brand_name: 'Best Buy', brand_code: 'BEST', provider: 'Best Buy', category: 'Electronics', logo_url: 'https://logo.clearbit.com/bestbuy.com' },
        'HOME': { brand_name: 'Home Depot', brand_code: 'HOME', provider: 'Home Depot', category: 'Home Improvement', logo_url: 'https://logo.clearbit.com/homedepot.com' },
        'STAR': { brand_name: 'Starbucks', brand_code: 'STAR', provider: 'Starbucks', category: 'Food & Beverage', logo_url: 'https://logo.clearbit.com/starbucks.com' },
        'WALM': { brand_name: 'Walmart', brand_code: 'WALM', provider: 'Walmart', category: 'Retail', logo_url: 'https://logo.clearbit.com/walmart.com' },
      };

      const brandConfigs = selectedBrands
        .filter((code): code is keyof typeof allBrandConfigs => code in allBrandConfigs)
        .map(code => allBrandConfigs[code]);

      // Create brands
      for (const brandConfig of brandConfigs) {
        const { data: existing } = await supabase.from('gift_card_brands').select('id').eq('brand_name', brandConfig.brand_name).maybeSingle();
        if (!existing) {
          const { data: newBrand } = await supabase.from('gift_card_brands').insert({ ...brandConfig, is_active: true }).select().single();
          if (newBrand) {
            brandMap.set(brandConfig.brand_name, newBrand.id);
            result.brandsCreated++;
          }
        } else {
          brandMap.set(brandConfig.brand_name, existing.id);
        }
      }

      // Create pools per client
      const poolConfigs = [
        { client: 'Vertical Roofing Experts', pools: [{ brand: 'Amazon', value: 25 }, { brand: 'Visa', value: 50 }, { brand: 'Home Depot', value: 25 }] },
        { client: 'Prime Realty Group', pools: [{ brand: 'Amazon', value: 50 }, { brand: 'Visa', value: 100 }, { brand: 'Target', value: 50 }] },
        { client: 'Premier Auto Warranty', pools: [{ brand: 'Amazon', value: 25 }, { brand: 'Visa', value: 50 }, { brand: 'Best Buy', value: 25 }] },
        { client: 'AutoGuard Protection', pools: [{ brand: 'Amazon', value: 25 }, { brand: 'Visa', value: 50 }, { brand: 'Target', value: 25 }] },
      ];

      for (const config of poolConfigs) {
        const client = clients.find(c => c.name === config.client);
        if (!client) continue;

        const clientPools: any[] = [];
        for (const poolDef of config.pools) {
          const brandId = brandMap.get(poolDef.brand);
          if (!brandId) continue;

          const { data: pool } = await supabase.from('gift_card_pools').insert({
            client_id: client.id,
            brand_id: brandId,
            pool_name: `${client.name} - $${poolDef.value} ${poolDef.brand}`,
            provider: poolDef.brand,
            card_value: poolDef.value,
            available_cards: 0,
            total_cards: 0,
            low_stock_threshold: 10,
            purchase_method: 'csv_only',
            is_simulated: markAsSimulated,
            simulation_batch_id: batchId,
          }).select().single();

          if (pool) {
            clientPools.push({ ...pool, brand: poolDef.brand });
            result.poolsCreated++;
          }
        }
        poolsByClient.set(client.id, clientPools);
      }

      // Generate gift cards
      if (dataTypes.includes('giftCards')) {
        const cardsPerPool = quantities.giftCards || 100;
        const statusDistribution = ['available', 'available', 'available', 'available', 'claimed', 'claimed', 'delivered', 'delivered', 'delivered', 'redeemed'];

        for (const [clientId, pools] of poolsByClient) {
          for (const pool of pools) {
            const cards = [];
            for (let i = 0; i < cardsPerPool; i++) {
              const status = randomElement(statusDistribution);
              let cardData: any = {
                pool_id: pool.id,
                status,
                expiration_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                current_balance: pool.card_value,
                is_simulated: markAsSimulated,
                simulation_batch_id: batchId,
              };

              switch (pool.brand) {
                case 'Amazon': cardData.card_code = generateAmazonCode(); break;
                case 'Visa':
                  const visa = generateVisaCard();
                  cardData.card_code = visa.code;
                  cardData.card_number = visa.cardNumber;
                  break;
                case 'Target': cardData.card_code = generateTargetCode(); break;
                case 'Apple': cardData.card_code = generateAppleCode(); break;
                default: cardData.card_code = generateGenericCode(pool.brand.slice(0, 3).toUpperCase());
              }

              if (status !== 'available') {
                cardData.claimed_at = new Date(Date.now() - randomInt(1, 60) * 24 * 60 * 60 * 1000).toISOString();
              }
              cards.push(cardData);
            }

            await supabase.from('gift_cards').insert(cards);
            result.giftCardsCreated += cards.length;

            await supabase.from('gift_card_pools').update({
              total_cards: cards.length,
              available_cards: cards.filter(c => c.status === 'available').length,
              claimed_cards: cards.filter(c => c.status === 'claimed').length,
              delivered_cards: cards.filter(c => c.status === 'delivered').length,
              redeemed_cards: cards.filter(c => c.status === 'redeemed').length,
            }).eq('id', pool.id);
          }
        }
      }
    }

    // ===== PHASE 2: CRM FOUNDATION =====
    if (dataTypes.includes('contacts')) {
      console.log('👥 Phase 2: CRM Foundation...');

      const contactsPerClient = quantities.contacts || 150;
      const lifecycleDistribution = { lead: 0.25, mql: 0.25, sql: 0.20, opportunity: 0.15, customer: 0.10, evangelist: 0.05 };

      for (const client of clients) {
        const contacts: any[] = [];
        const industryKey = client.industry === 'roofing' ? 'roofing' : client.industry === 'realty' ? 'realty' : client.industry === 'auto' ? 'auto' : 'default';

        for (let i = 0; i < contactsPerClient; i++) {
          const firstName = randomElement(firstNames);
          const lastName = randomElement(lastNames);
          const stage = Math.random() < 0.25 ? 'lead' : Math.random() < 0.5 ? 'mql' : Math.random() < 0.7 ? 'sql' : Math.random() < 0.85 ? 'opportunity' : Math.random() < 0.95 ? 'customer' : 'evangelist';
          const leadScore = stage === 'lead' ? randomInt(0, 40) : stage === 'mql' ? randomInt(40, 60) : stage === 'sql' ? randomInt(60, 75) : stage === 'opportunity' ? randomInt(75, 90) : randomInt(90, 100);
          const daysAgo = randomInt(0, 90);

          contacts.push({
            client_id: client.id,
            first_name: firstName,
            last_name: lastName,
            email: generateEmail(firstName, lastName, client.name),
            phone: generatePhone(),
            mobile_phone: generatePhone(),
            company: `${randomElement(lastNames)} ${randomElement(['Inc', 'LLC', 'Corp', 'Group', 'Industries'])}`,
            job_title: randomElement(jobTitles[industryKey]),
            address: `${randomInt(100, 9999)} ${randomElement(streets)}`,
            city: randomElement(cities),
            state: 'AZ',
            zip: `85${randomInt(100, 999)}`,
            country: 'US',
            lifecycle_stage: stage,
            lead_source: randomElement(leadSources),
            lead_score: leadScore,
            engagement_score: randomInt(0, 100),
            last_activity_date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
            total_interactions: randomInt(0, 20),
            email_opens_count: randomInt(0, 10),
            is_simulated: markAsSimulated,
            simulation_batch_id: batchId,
          });
        }

        const { data: createdContacts } = await supabase.from('contacts').insert(contacts).select();
        if (createdContacts) {
          contactsByClient.set(client.id, createdContacts);
          result.contactsCreated += createdContacts.length;

          // Create contact lists
          const listNames = ['Hot Leads', 'VIP Customers', 'New Prospects', 'Re-engagement List'];
          const lists: any[] = [];
          
          for (const listName of listNames) {
            const { data: list } = await supabase.from('contact_lists').insert({
              client_id: client.id,
              name: listName,
              list_type: 'static',
              contact_count: 0,
              is_simulated: markAsSimulated,
              simulation_batch_id: batchId,
            }).select().single();

            if (list) {
              lists.push(list);
              result.contactListsCreated++;

              // Add random contacts to lists
              const listSize = randomInt(20, 40);
              const listMembers = createdContacts.slice(0, listSize).map(contact => ({
                list_id: list.id,
                contact_id: contact.id,
                is_simulated: markAsSimulated,
                simulation_batch_id: batchId,
              }));

              await supabase.from('contact_list_members').insert(listMembers);
              await supabase.from('contact_lists').update({ contact_count: listSize }).eq('id', list.id);
            }
          }
          listsByClient.set(client.id, lists);

          // Add tags to contacts
          const tagInserts: any[] = [];
          for (const contact of createdContacts.slice(0, Math.floor(createdContacts.length * 0.6))) {
            const numTags = randomInt(1, 3);
            for (let i = 0; i < numTags; i++) {
              tagInserts.push({
                contact_id: contact.id,
                tag: randomElement(tags),
                is_simulated: markAsSimulated,
                simulation_batch_id: batchId,
              });
            }
          }
          if (tagInserts.length > 0) {
            await supabase.from('contact_tags').insert(tagInserts);
            result.contactTagsCreated += tagInserts.length;
          }
        }
      }
    }

    // ===== PHASE 3: MARKETING ASSETS =====
    if (dataTypes.includes('templates') || dataTypes.includes('landingPages')) {
      console.log('🎨 Phase 3: Marketing Assets...');

      for (const client of clients) {
        // Create templates
        if (dataTypes.includes('templates')) {
          const sizes = ['4x6', '6x9', '6x11'];
          for (const size of sizes) {
            const { data: template } = await supabase.from('templates').insert({
              client_id: client.id,
              name: `${client.name} - ${size} Postcard`,
              size: size as any,
              project_data: { pages: [], styles: [], components: [] },
              thumbnail_url: '',
              is_simulated: markAsSimulated,
              simulation_batch_id: batchId,
            }).select().single();

            if (template) {
              templatesByClient.set(client.id, [...(templatesByClient.get(client.id) || []), template]);
              result.templatesCreated++;
            }
          }
        }

        // Create landing pages
        if (dataTypes.includes('landingPages')) {
          const lpNames = ['Main Campaign Page', 'Thank You Page'];
          for (const lpName of lpNames) {
            const { data: lp } = await supabase.from('landing_pages').insert({
              client_id: client.id,
              name: lpName,
              slug: lpName.toLowerCase().replace(/\s+/g, '-'),
              editor_type: 'grapesjs',
              project_data: {},
              status: Math.random() > 0.5 ? 'published' : 'draft',
              is_simulated: markAsSimulated,
              simulation_batch_id: batchId,
            }).select().single();

            if (lp) {
              landingPagesByClient.set(client.id, [...(landingPagesByClient.get(client.id) || []), lp]);
              result.landingPagesCreated++;
            }
          }
        }
      }
    }

    // ===== PHASE 4: CAMPAIGNS =====
    if (dataTypes.includes('campaigns')) {
      console.log('📢 Phase 4: Campaigns...');

      const campaignsPerClient = quantities.campaigns || 8;
      const statuses = ['draft', 'scheduled', 'scheduled', 'in_progress', 'in_progress', 'in_progress', 'in_progress', 'completed'];

      for (const client of clients) {
        const clientContacts = contactsByClient.get(client.id) || [];
        const clientLists = listsByClient.get(client.id) || [];
        const clientTemplates = templatesByClient.get(client.id) || [];
        const clientLPs = landingPagesByClient.get(client.id) || [];
        const clientPools = poolsByClient.get(client.id) || [];

        for (let i = 0; i < campaignsPerClient; i++) {
          // Create audience first
          const audienceSize = randomInt(50, 150);
          const { data: audience } = await supabase.from('audiences').insert({
            client_id: client.id,
            name: `Campaign ${i + 1} Audience`,
            source: 'list',
            status: 'completed',
            total_count: audienceSize,
            valid_count: audienceSize,
            invalid_count: 0,
            is_simulated: markAsSimulated,
            simulation_batch_id: batchId,
          }).select().single();

          if (!audience) continue;
          result.audiencesCreated++;

          // Create campaign
          const status = randomElement(statuses);
          const mailDate = status === 'completed' ? new Date(Date.now() - randomInt(30, 60) * 24 * 60 * 60 * 1000) :
                          status === 'in_progress' ? new Date(Date.now() - randomInt(1, 15) * 24 * 60 * 60 * 1000) :
                          new Date(Date.now() + randomInt(1, 30) * 24 * 60 * 60 * 1000);

          const { data: campaign } = await supabase.from('campaigns').insert({
            client_id: client.id,
            audience_id: audience.id,
            template_id: clientTemplates[0]?.id,
            landing_page_id: clientLPs[0]?.id,
            name: `${client.name} - Campaign ${i + 1}`,
            size: randomElement(['4x6', '6x9', '6x11']),
            status: status as any,
            mail_date: mailDate.toISOString().split('T')[0],
            lp_mode: 'bridge',
            utm_source: 'directmail',
            utm_medium: 'postcard',
            is_simulated: markAsSimulated,
            simulation_batch_id: batchId,
          }).select().single();

          if (!campaign) continue;
          campaignsByClient.set(client.id, [...(campaignsByClient.get(client.id) || []), campaign]);
          result.campaignsCreated++;

          // Create conditions
          const conditionNames = ['Confirmed Appointment', 'Requested Callback', 'Information Requested'];
          for (let c = 0; c < conditionNames.length; c++) {
            const { data: condition } = await supabase.from('campaign_conditions').insert({
              campaign_id: campaign.id,
              condition_number: c + 1,
              condition_name: conditionNames[c],
              trigger_type: c === 0 ? 'manual_agent' : c === 1 ? 'form_submission' : 'time_delayed',
              time_delay_hours: c === 2 ? 48 : null,
              is_active: true,
              is_simulated: markAsSimulated,
              simulation_batch_id: batchId,
            }).select().single();

            if (condition) result.conditionsCreated++;

            // Create reward config
            if (clientPools.length > 0) {
              await supabase.from('campaign_reward_configs').insert({
                campaign_id: campaign.id,
                condition_number: c + 1,
                gift_card_pool_id: randomElement(clientPools).id,
                reward_description: `$${clientPools[0].card_value} Gift Card`,
                sms_template: 'Thank you! Your gift card: {code}',
                is_simulated: markAsSimulated,
                simulation_batch_id: batchId,
              });
              result.rewardConfigsCreated++;
            }
          }

          // Create recipients
          if (dataTypes.includes('recipients')) {
            const recipients: any[] = [];
            const audienceContacts = clientContacts.slice(0, audienceSize);
            
            for (const contact of audienceContacts) {
              recipients.push({
                audience_id: audience.id,
                contact_id: contact.id,
                first_name: contact.first_name,
                last_name: contact.last_name,
                email: contact.email,
                phone: contact.phone,
                address: contact.address,
                city: contact.city,
                state: contact.state,
                zip: contact.zip,
                redemption_code: generateRedemptionCode(),
                token: generateToken(),
                approval_status: randomElement(['pending', 'pending', 'approved', 'approved', 'approved', 'redeemed']),
                is_simulated: markAsSimulated,
                simulation_batch_id: batchId,
              });
            }

            const { data: createdRecipients } = await supabase.from('recipients').insert(recipients).select();
            if (createdRecipients) {
              recipientsByCampaign.set(campaign.id, createdRecipients);
              result.recipientsCreated += createdRecipients.length;
            }
          }

          // Create tracked numbers
          if (dataTypes.includes('trackedNumbers')) {
            const { data: trackedNum } = await supabase.from('tracked_phone_numbers').insert({
              campaign_id: campaign.id,
              phone_number: generatePhone(),
              forward_to_number: generatePhone(),
              provider: 'twilio',
              status: 'active',
              is_simulated: markAsSimulated,
              simulation_batch_id: batchId,
            }).select().single();

            if (trackedNum) {
              trackedNumbersByCampaign.set(campaign.id, [trackedNum]);
              result.trackedNumbersCreated++;
            }
          }
        }
      }
    }

    // ===== PHASE 7: CALL SESSIONS =====
    if (dataTypes.includes('callSessions')) {
      console.log('📞 Phase 7: Call Sessions...');

      const totalCallSessions = quantities.callSessions || 800;
      const allCampaigns = Array.from(campaignsByClient.values()).flat();
      const statusDistribution = ['completed', 'completed', 'completed', 'completed', 'completed', 'missed', 'voicemail', 'in-progress'];

      for (let i = 0; i < totalCallSessions; i++) {
        const campaign = randomElement(allCampaigns);
        const trackedNumbers = trackedNumbersByCampaign.get(campaign.id) || [];
        const recipients = recipientsByCampaign.get(campaign.id) || [];
        
        if (trackedNumbers.length === 0) continue;

        const status = randomElement(statusDistribution);
        const recipient = Math.random() > 0.3 && recipients.length > 0 ? randomElement(recipients) : null;
        const daysAgo = randomInt(0, 90);
        const startTime = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        const duration = status === 'completed' ? randomInt(60, 480) : 0;

        await supabase.from('call_sessions').insert({
          campaign_id: campaign.id,
          tracked_number_id: trackedNumbers[0].id,
          recipient_id: recipient?.id,
          caller_phone: generatePhone(),
          call_status: status,
          match_status: recipient ? 'matched' : 'unmatched',
          call_started_at: startTime.toISOString(),
          call_answered_at: status === 'completed' ? new Date(startTime.getTime() + 3000).toISOString() : null,
          call_ended_at: status === 'completed' ? new Date(startTime.getTime() + duration * 1000).toISOString() : null,
          call_duration_seconds: duration,
          recording_url: status === 'completed' ? `https://api.twilio.com/recordings/RE${crypto.randomUUID().replace(/-/g, '')}` : null,
          is_simulated: markAsSimulated,
          simulation_batch_id: batchId,
        });
        result.callSessionsCreated++;
      }
    }

    // Calculate total
    result.totalRecords = result.brandsCreated + result.poolsCreated + result.giftCardsCreated + 
                          result.contactsCreated + result.contactListsCreated + result.contactTagsCreated +
                          result.templatesCreated + result.landingPagesCreated + result.audiencesCreated +
                          result.campaignsCreated + result.conditionsCreated + result.rewardConfigsCreated +
                          result.recipientsCreated + result.trackedNumbersCreated + result.callSessionsCreated +
                          result.conditionsMetCreated + result.deliveriesCreated + result.smsLogsCreated;

    await supabase.from('simulation_batches').update({
      status: 'completed',
      total_records: result.totalRecords,
    }).eq('id', batchId);

    console.log('✅ Simulation complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Simulation failed:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
