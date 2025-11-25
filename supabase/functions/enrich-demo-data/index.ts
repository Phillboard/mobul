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
  randomnessFactor?: number; // 0-50, percentage variance
  timeRangeDays?: number; // 30, 60, 90, 180
  trendPattern?: 'growing' | 'stable' | 'declining';
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
const aptSuffixes = ['', '', '', '', ' Apt 201', ' Unit B', ' Suite 5', ' #302'];

const jobTitles: Record<string, string[]> = {
  roofing: ['Property Manager', 'Homeowner', 'Building Manager', 'Facilities Director', 'HOA President', 'Maintenance Supervisor', 'Construction Manager'],
  realty: ['Home Buyer', 'Seller', 'Real Estate Investor', 'Property Developer', 'First-Time Buyer', 'Landlord', 'Commercial Investor'],
  auto: ['Fleet Manager', 'Vehicle Owner', 'Operations Manager', 'Dealership Owner', 'Auto Enthusiast', 'Lease Manager', 'Transport Director'],
  default: ['Business Owner', 'Director', 'Manager', 'VP Operations', 'Executive', 'President', 'CFO'],
};

const leadSources = ['website', 'referral', 'direct_mail', 'event', 'social_media', 'cold_call', 'partner'];
const tags = ['hot-lead', 'vip', 'decision-maker', 'budget-approved', 'needs-followup', 'high-value', 'urgent'];

const contactNoteTemplates = [
  'Initial inquiry about {service} - very interested in pricing',
  'Called back, scheduled consultation for next week',
  'Left voicemail, will follow up in 2 days',
  'Meeting with decision maker on {date}',
  'Sent detailed proposal via email',
  'Hot lead - ready to move forward, just needs final approval',
  'Follow-up needed - waiting on budget confirmation',
  'Positive conversation, interested in {season} timeframe',
  'Requested additional references and case studies',
  'High priority - competitor quote expires end of month',
];

const campaignNameTemplates = [
  'Spring {service} Special',
  'Summer Value Assessment',
  'End of Year {service} Push',
  'New Year Savings Event',
  '{season} Inspection Campaign',
  'Limited Time {service} Offer',
  'Annual {service} Promotion',
  'Q{quarter} Growth Initiative',
];

const applyRandomness = (value: number, factor: number): number => {
  if (factor === 0) return value;
  const variance = (factor / 100) * value;
  const min = Math.floor(value - variance);
  const max = Math.ceil(value + variance);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getBusinessHourDate = (daysAgo: number): Date => {
  const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const dayOfWeek = date.getDay();
  
  // 70% weekdays, 30% weekend
  if (Math.random() < 0.7) {
    if (dayOfWeek === 0) date.setDate(date.getDate() - 1); // Sunday -> Saturday
    if (dayOfWeek === 6 && Math.random() < 0.5) date.setDate(date.getDate() - 1); // Some Saturdays -> Friday
  }
  
  // Business hours 9am-5pm, with peaks at 10-11am and 2-4pm
  const hourWeights = [9, 10, 10, 10, 11, 11, 12, 13, 14, 14, 14, 15, 15, 16, 17];
  const hour = hourWeights[Math.floor(Math.random() * hourWeights.length)];
  const minute = Math.floor(Math.random() * 60);
  
  date.setHours(hour, minute, 0, 0);
  return date;
};

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
      randomnessFactor = 15,
      timeRangeDays = 90,
      trendPattern = 'stable',
    } = params;

    console.log('🚀 Starting bulletproof data simulation:', { dataTypes, quantities, scope, randomnessFactor, timeRangeDays, trendPattern });

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

      // Generate gift cards with randomness
      if (dataTypes.includes('giftCards')) {
        const statusDistribution = ['available', 'available', 'available', 'available', 'claimed', 'claimed', 'delivered', 'delivered', 'delivered', 'redeemed'];

        for (const [clientId, pools] of poolsByClient) {
          for (const pool of pools) {
            const baseCards = quantities.giftCards || 100;
            const cardsPerPool = applyRandomness(baseCards, randomnessFactor);
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
                const daysAgo = randomInt(1, timeRangeDays);
                cardData.claimed_at = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
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

      for (const client of clients) {
        const baseContacts = quantities.contacts || 150;
        const contactsPerClient = applyRandomness(baseContacts, randomnessFactor);
        const contacts: any[] = [];
        const industryKey = client.industry === 'roofing' ? 'roofing' : client.industry === 'realty' ? 'realty' : client.industry === 'auto' ? 'auto' : 'default';

        for (let i = 0; i < contactsPerClient; i++) {
          const firstName = randomElement(firstNames);
          const lastName = randomElement(lastNames);
          const stage = Math.random() < 0.25 ? 'lead' : Math.random() < 0.5 ? 'mql' : Math.random() < 0.7 ? 'sql' : Math.random() < 0.85 ? 'opportunity' : Math.random() < 0.95 ? 'customer' : 'evangelist';
          
          // Behavioral correlation: higher stages = higher scores
          const leadScore = stage === 'lead' ? randomInt(0, 40) : stage === 'mql' ? randomInt(40, 60) : stage === 'sql' ? randomInt(60, 75) : stage === 'opportunity' ? randomInt(75, 90) : randomInt(90, 100);
          
          // Higher lead score = more recent activity
          const maxDaysAgo = leadScore > 80 ? 7 : leadScore > 60 ? 30 : leadScore > 40 ? 60 : 90;
          const daysAgo = randomInt(0, maxDaysAgo);
          
          // Higher lead score = more interactions
          const interactions = Math.floor(leadScore / 10);

          // Generate realistic note
          const noteTemplate = randomElement(contactNoteTemplates);
          const note = noteTemplate
            .replace('{service}', industryKey === 'roofing' ? 'roof inspection' : industryKey === 'realty' ? 'property valuation' : 'warranty coverage')
            .replace('{season}', randomElement(['spring', 'summer', 'fall', 'winter']))
            .replace('{date}', 'Thursday');

          contacts.push({
            client_id: client.id,
            first_name: firstName,
            last_name: lastName,
            email: generateEmail(firstName, lastName, client.name),
            phone: generatePhone(),
            mobile_phone: generatePhone(),
            company: `${randomElement(lastNames)} ${randomElement(['Inc', 'LLC', 'Corp', 'Group', 'Industries'])}`,
            job_title: randomElement(jobTitles[industryKey]),
            address: `${randomInt(100, 9999)} ${randomElement(streets)}${randomElement(aptSuffixes)}`,
            city: randomElement(cities),
            state: 'AZ',
            zip: `85${randomInt(100, 999)}`,
            country: 'US',
            lifecycle_stage: stage,
            lead_source: randomElement(leadSources),
            lead_score: leadScore,
            engagement_score: Math.min(leadScore + randomInt(-10, 10), 100),
            last_activity_date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
            total_interactions: interactions,
            email_opens_count: Math.floor(interactions * 0.6),
            notes: note,
            is_simulated: markAsSimulated,
            simulation_batch_id: batchId,
          });
        }

        // Make emails unique by adding timestamp if duplicates exist
        const uniqueContacts = contacts.map(c => ({
          ...c,
          email: `${c.email?.split('@')[0]}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}@${c.email?.split('@')[1] || 'example.com'}`
        }));

        const { data: createdContacts, error: contactsError} = await supabase.from('contacts').insert(uniqueContacts).select();
        if (contactsError) {
          console.error('❌ ERROR creating contacts:', {
            message: contactsError.message,
            details: contactsError.details,
            hint: contactsError.hint,
            code: contactsError.code,
            clientId: client.id,
            contactCount: contacts.length,
          });
          continue;
        }
        if (createdContacts && createdContacts.length > 0) {
          contactsByClient.set(client.id, createdContacts);
          result.contactsCreated += createdContacts.length;

          // Create contact lists
          const listNames = ['Hot Leads', 'VIP Customers', 'New Prospects', 'Re-engagement List'];
          const lists: any[] = [];
          
          for (const listName of listNames) {
            const { data: list, error: listError } = await supabase.from('contact_lists').insert({
              client_id: client.id,
              name: listName,
              list_type: 'static',
              contact_count: 0,
              is_simulated: markAsSimulated,
              simulation_batch_id: batchId,
            }).select().single();

            if (listError) {
              console.error('❌ ERROR creating contact list:', {
                message: listError.message,
                details: listError.details,
                listName,
              });
              continue;
            }

            if (list) {
              lists.push(list);
              result.contactListsCreated++;

              // Add random contacts to lists
              const listSize = Math.floor(createdContacts.length * 0.25);
              const listContacts = createdContacts.slice(0, listSize);
              
              const members = listContacts.map(c => ({
                list_id: list.id,
                contact_id: c.id,
                is_simulated: markAsSimulated,
                simulation_batch_id: batchId,
              }));

              await supabase.from('contact_list_members').insert(members);
              await supabase.from('contact_lists').update({ contact_count: listSize }).eq('id', list.id);
            }
          }
          listsByClient.set(client.id, lists);

          // Create tags for contacts
          const tagRecords: any[] = [];
          for (const contact of createdContacts.slice(0, Math.floor(createdContacts.length * 0.3))) {
            tagRecords.push({
              contact_id: contact.id,
              tag: randomElement(tags),
              is_simulated: markAsSimulated,
              simulation_batch_id: batchId,
            });
          }
          if (tagRecords.length > 0) {
            await supabase.from('contact_tags').insert(tagRecords);
            result.contactTagsCreated += tagRecords.length;
          }
        }
      }
    }

    // ===== PHASE 3: MARKETING ASSETS =====
    if (dataTypes.includes('templates') || dataTypes.includes('landingPages')) {
      console.log('📄 Phase 3: Marketing Assets...');

      for (const client of clients) {
        if (dataTypes.includes('templates')) {
          const baseTemplates = quantities.templates || 3;
          const templatesCount = applyRandomness(baseTemplates, randomnessFactor);
          const templates: any[] = [];

          for (let i = 0; i < templatesCount; i++) {
            const season = randomElement(['Spring', 'Summer', 'Fall', 'Winter']);
            const service = client.industry === 'roofing' ? 'Roof Inspection' : client.industry === 'realty' ? 'Home Value' : 'Warranty';
            
            templates.push({
              client_id: client.id,
              name: `${season} ${service} Campaign ${i + 1}`,
              size: randomElement(['4x6', '6x9', '6x11']),
              grapesjs_project: { components: [], styles: {}, html: '<div>Mock template</div>', css: '' },
              is_simulated: markAsSimulated,
              simulation_batch_id: batchId,
            });
          }

          const { data: createdTemplates, error: templatesError } = await supabase.from('templates').insert(templates).select();
          if (templatesError) {
            console.error('❌ ERROR creating templates:', {
              message: templatesError.message,
              details: templatesError.details,
              hint: templatesError.hint,
              templateCount: templates.length,
            });
          } else if (createdTemplates && createdTemplates.length > 0) {
            templatesByClient.set(client.id, createdTemplates);
            result.templatesCreated += createdTemplates.length;
          }
        }

        if (dataTypes.includes('landingPages')) {
          const baseLPs = quantities.landingPages || 2;
          const lpCount = applyRandomness(baseLPs, randomnessFactor);
          const landingPages: any[] = [];

          for (let i = 0; i < lpCount; i++) {
            landingPages.push({
              client_id: client.id,
              name: `Campaign Landing Page ${i + 1}`,
              slug: `campaign-lp-${i + 1}-${Math.random().toString(36).slice(2, 8)}`,
              content_json: { html: '<div>Landing Page</div>', css: '', components: [] },
              published: Math.random() > 0.3,
              is_simulated: markAsSimulated,
              simulation_batch_id: batchId,
            });
          }

          const { data: createdLPs, error: lpsError } = await supabase.from('landing_pages').insert(landingPages).select();
          if (lpsError) {
            console.error('❌ ERROR creating landing pages:', {
              message: lpsError.message,
              details: lpsError.details,
              hint: lpsError.hint,
              lpCount: landingPages.length,
            });
          } else if (createdLPs && createdLPs.length > 0) {
            landingPagesByClient.set(client.id, createdLPs);
            result.landingPagesCreated += createdLPs.length;
          }
        }
      }
    }

    // ===== PHASE 4: CAMPAIGNS =====
    if (dataTypes.includes('campaigns')) {
      console.log('📢 Phase 4: Campaigns...');

      for (const client of clients) {
        const baseCampaigns = quantities.campaigns || 8;
        const campaignsCount = applyRandomness(baseCampaigns, randomnessFactor);
        const clientTemplates = templatesByClient.get(client.id) || [];
        const clientLPs = landingPagesByClient.get(client.id) || [];
        const clientLists = listsByClient.get(client.id) || [];

        for (let i = 0; i < campaignsCount; i++) {
          const daysAgo = Math.floor((timeRangeDays / campaignsCount) * i);
          const service = client.industry === 'roofing' ? 'Inspection' : client.industry === 'realty' ? 'Assessment' : 'Protection';
          const quarter = Math.floor(Math.random() * 4) + 1;
          
          const nameTemplate = randomElement(campaignNameTemplates);
          const campaignName = nameTemplate
            .replace('{service}', service)
            .replace('{season}', randomElement(['Spring', 'Summer', 'Fall', 'Winter']))
            .replace('{quarter}', quarter.toString());

          // Create audience first
          const { data: audience, error: audienceError } = await supabase.from('audiences').insert({
            client_id: client.id,
            name: `${campaignName} Audience`,
            source: 'import',
            status: 'ready',
            total_count: 0,
            valid_count: 0,
            is_simulated: markAsSimulated,
            simulation_batch_id: batchId,
          }).select().single();

          if (audienceError) {
            console.error('❌ ERROR creating audience:', {
              message: audienceError.message,
              details: audienceError.details,
              hint: audienceError.hint,
              campaignName,
            });
            continue;
          }
          if (!audience) continue;

          const statusWeights = ['draft', 'ready', 'scheduled', 'in_production', 'completed', 'completed', 'completed'];
          const { data: campaign, error: campaignError } = await supabase.from('campaigns').insert({
            client_id: client.id,
            name: campaignName,
            audience_id: audience.id,
            template_id: clientTemplates.length > 0 ? randomElement(clientTemplates).id : null,
            landing_page_id: clientLPs.length > 0 && Math.random() > 0.3 ? randomElement(clientLPs).id : null,
            size: randomElement(['4x6', '6x9', '6x11']),
            postage: randomElement(['standard', 'first_class']),
            status: randomElement(statusWeights),
            mail_date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            lp_mode: randomElement(['bridge', 'redirect']),
            is_simulated: markAsSimulated,
            simulation_batch_id: batchId,
          }).select().single();

          if (campaignError) {
            console.error('❌ ERROR creating campaign:', {
              message: campaignError.message,
              details: campaignError.details,
              hint: campaignError.hint,
              campaignName,
              audienceId: audience.id,
            });
            continue;
          }
          if (!campaign) continue;
          
          if (!campaignsByClient.has(client.id)) {
            campaignsByClient.set(client.id, []);
          }
          campaignsByClient.get(client.id)!.push(campaign);
          audiencesByClient.set(campaign.id, [audience]);
          result.campaignsCreated++;
          result.audiencesCreated++;

          // Create conditions
          const conditionsCount = randomInt(1, 3);
          for (let j = 0; j < conditionsCount; j++) {
            const { data: condition } = await supabase.from('campaign_conditions').insert({
              campaign_id: campaign.id,
              condition_number: j + 1,
              condition_name: `Condition ${j + 1}`,
              trigger_type: j === 0 ? 'call' : randomElement(['call', 'time_delay', 'crm_event']),
              time_delay_hours: j > 0 ? randomInt(24, 168) : null,
              is_active: true,
              is_simulated: markAsSimulated,
              simulation_batch_id: batchId,
            }).select().single();

            if (condition) {
              result.conditionsCreated++;

              // Create reward config for this condition
              const clientPools = poolsByClient.get(client.id) || [];
              if (clientPools.length > 0) {
                await supabase.from('campaign_reward_configs').insert({
                  campaign_id: campaign.id,
                  condition_number: j + 1,
                  gift_card_pool_id: randomElement(clientPools).id,
                  reward_description: `$${randomElement([25, 50, 100])} Gift Card`,
                  sms_template: 'Thank you! Here is your reward: {gift_card_code}',
                  is_simulated: markAsSimulated,
                  simulation_batch_id: batchId,
                });
                result.rewardConfigsCreated++;
              }
            }
          }
        }
      }
    }

    // ===== PHASE 5: RECIPIENTS =====
    if (dataTypes.includes('recipients')) {
      console.log('📮 Phase 5: Recipients...');

      for (const [clientId, campaigns] of campaignsByClient) {
        const clientContacts = contactsByClient.get(clientId) || [];

        for (const campaign of campaigns) {
          const audiences = audiencesByClient.get(campaign.id) || [];
          if (audiences.length === 0) continue;

          const audience = audiences[0];
          const baseRecipients = quantities.recipients || 100;
          const recipientsCount = applyRandomness(baseRecipients, randomnessFactor);
          const recipients: any[] = [];

          // Use existing contacts or create minimal recipient data
          const selectedContacts = clientContacts.slice(0, Math.min(recipientsCount, clientContacts.length));

          for (let i = 0; i < recipientsCount; i++) {
            const contact = selectedContacts[i % selectedContacts.length];
            
            recipients.push({
              audience_id: audience.id,
              contact_id: contact?.id,
              customer_code: contact?.customer_code || null,
              first_name: contact?.first_name || null,
              last_name: contact?.last_name || null,
              phone: contact?.phone || null,
              email: contact?.email || null,
              address: contact?.address || null,
              city: contact?.city || null,
              state: contact?.state || null,
              zip: contact?.zip || null,
              token: generateToken(),
              redemption_code: generateRedemptionCode(),
              approval_status: Math.random() > 0.1 ? 'approved' : 'pending',
              is_simulated: markAsSimulated,
              simulation_batch_id: batchId,
            });
          }

          const { data: createdRecipients, error: recipientsError } = await supabase.from('recipients').insert(recipients).select();
          if (recipientsError) {
            console.error('❌ Error creating recipients:', recipientsError);
            continue;
          }
          if (createdRecipients && createdRecipients.length > 0) {
            recipientsByCampaign.set(campaign.id, createdRecipients);
            result.recipientsCreated += createdRecipients.length;

            await supabase.from('audiences').update({
              total_count: createdRecipients.length,
              valid_count: createdRecipients.length,
            }).eq('id', audience.id);
          }
        }
      }
    }

    // ===== PHASE 6: TRACKED PHONE NUMBERS =====
    if (dataTypes.includes('trackedNumbers')) {
      console.log('📞 Phase 6: Tracked Phone Numbers...');

      for (const [clientId, campaigns] of campaignsByClient) {
        for (const campaign of campaigns) {
          const baseNumbers = quantities.trackedNumbers || 1;
          const numbersCount = applyRandomness(baseNumbers, randomnessFactor);

          for (let i = 0; i < numbersCount; i++) {
            const { data: trackedNumber, error: numberError } = await supabase.from('tracked_phone_numbers').insert({
              campaign_id: campaign.id,
              phone_number: `+1480${Math.floor(Math.random() * 9000000 + 1000000)}`,
              forward_to_number: `+1602${Math.floor(Math.random() * 9000000 + 1000000)}`,
              status: 'active',
              is_simulated: markAsSimulated,
              simulation_batch_id: batchId,
            }).select().single();

            if (numberError) {
              console.error('❌ Error creating tracked number:', numberError);
              continue;
            }

            if (trackedNumber) {
              if (!trackedNumbersByCampaign.has(campaign.id)) {
                trackedNumbersByCampaign.set(campaign.id, []);
              }
              trackedNumbersByCampaign.get(campaign.id)!.push(trackedNumber);
              result.trackedNumbersCreated++;
            }
          }
        }
      }
    }

    // ===== PHASE 7: CALL SESSIONS =====
    if (dataTypes.includes('callSessions')) {
      console.log('☎️ Phase 7: Call Sessions...');

      for (const [clientId, campaigns] of campaignsByClient) {
        for (const campaign of campaigns) {
          const trackedNumbers = trackedNumbersByCampaign.get(campaign.id) || [];
          if (trackedNumbers.length === 0) continue;

          const recipients = recipientsByCampaign.get(campaign.id) || [];
          const baseCalls = quantities.callSessions || 800;
          const callsPerCampaign = Math.floor(applyRandomness(baseCalls, randomnessFactor) / campaigns.length);

          const callSessions: any[] = [];
          const statusWeights = ['completed', 'completed', 'completed', 'no-answer', 'busy', 'failed'];

          for (let i = 0; i < callsPerCampaign; i++) {
            const recipient = recipients[i % recipients.length];
            const status = randomElement(statusWeights);
            const daysAgo = randomInt(0, timeRangeDays);
            const callStarted = getBusinessHourDate(daysAgo);

            let callData: any = {
              campaign_id: campaign.id,
              tracked_number_id: trackedNumbers[0].id,
              caller_phone: recipient?.phone || generatePhone(),
              recipient_id: recipient?.id || null,
              match_status: recipient ? 'matched' : 'unmatched',
              call_status: status,
              call_started_at: callStarted.toISOString(),
              is_simulated: markAsSimulated,
              simulation_batch_id: batchId,
            };

            if (status === 'completed') {
              const duration = randomInt(180, 600); // 3-10 minutes
              callData.call_answered_at = new Date(callStarted.getTime() + 5000).toISOString();
              callData.call_ended_at = new Date(callStarted.getTime() + duration * 1000).toISOString();
              callData.call_duration_seconds = duration;
              callData.recording_sid = `RE${Math.random().toString(36).slice(2, 34)}`;
            }

            callSessions.push(callData);
          }

          await supabase.from('call_sessions').insert(callSessions);
          result.callSessionsCreated += callSessions.length;
        }
      }
    }

    // ===== PHASE 8: CONDITIONS MET & DELIVERIES =====
    if (dataTypes.includes('callSessions')) {
      console.log('✅ Phase 8: Conditions Met & Gift Card Deliveries...');

      for (const [clientId, campaigns] of campaignsByClient) {
        const clientPools = poolsByClient.get(clientId) || [];
        if (clientPools.length === 0) continue;

        for (const campaign of campaigns) {
          // Get completed calls for this campaign
          const { data: completedCalls } = await supabase
            .from('call_sessions')
            .select('*')
            .eq('campaign_id', campaign.id)
            .eq('call_status', 'completed')
            .not('recipient_id', 'is', null);

          if (!completedCalls || completedCalls.length === 0) continue;

          // 40-60% of completed calls meet conditions
          const qualificationRate = 0.4 + Math.random() * 0.2;
          const qualifiedCalls = completedCalls.slice(0, Math.floor(completedCalls.length * qualificationRate));

          // Get available gift cards for this client
          const { data: availableCards } = await supabase
            .from('gift_cards')
            .select('*')
            .in('pool_id', clientPools.map(p => p.id))
            .eq('status', 'available')
            .limit(qualifiedCalls.length);

          for (let i = 0; i < qualifiedCalls.length; i++) {
            const call = qualifiedCalls[i];
            const card = availableCards?.[i];

            // Create condition met record
            const { data: conditionMet } = await supabase.from('call_conditions_met').insert({
              call_session_id: call.id,
              campaign_id: campaign.id,
              recipient_id: call.recipient_id,
              condition_number: 1,
              met_at: call.call_ended_at || call.call_started_at,
              gift_card_id: card?.id,
              delivery_status: card ? (Math.random() > 0.1 ? 'delivered' : 'pending') : null,
              is_simulated: markAsSimulated,
              simulation_batch_id: batchId,
            }).select().single();

            if (conditionMet) {
              result.conditionsMetCreated++;

              // If card assigned, create delivery record
              if (card) {
                await supabase.from('gift_cards')
                  .update({ status: 'delivered', claimed_at: new Date().toISOString() })
                  .eq('id', card.id);

                const deliveryMethod = Math.random() > 0.7 ? 'email' : 'sms';
                const { data: delivery } = await supabase.from('gift_card_deliveries').insert({
                  gift_card_id: card.id,
                  recipient_id: call.recipient_id,
                  campaign_id: campaign.id,
                  condition_met_id: conditionMet.id,
                  delivery_method: deliveryMethod,
                  delivery_status: Math.random() > 0.95 ? 'failed' : 'delivered',
                  delivered_at: new Date().toISOString(),
                  is_simulated: markAsSimulated,
                  simulation_batch_id: batchId,
                }).select().single();

                if (delivery) {
                  result.deliveriesCreated++;

                  // Create SMS log for SMS deliveries
                  if (deliveryMethod === 'sms') {
                    await supabase.from('sms_delivery_log').insert({
                      gift_card_id: card.id,
                      recipient_phone: call.caller_phone,
                      message_body: `Thank you! Your gift card code is: ${card.card_code}`,
                      twilio_message_sid: `SM${Math.random().toString(36).slice(2, 34)}`,
                      delivery_status: delivery.delivery_status === 'delivered' ? 'sent' : 'failed',
                      sent_at: new Date().toISOString(),
                      is_simulated: markAsSimulated,
                      simulation_batch_id: batchId,
                    });
                    result.smsLogsCreated++;
                  }
                }
              }
            }
          }
        }
      }
    }

    // Calculate total
    result.totalRecords = Object.values(result).reduce((sum, val) => 
      typeof val === 'number' && val !== result.totalRecords ? sum + val : sum, 0
    );

    await supabase.from('simulation_batches').update({
      status: 'completed',
      total_records: result.totalRecords,
    }).eq('id', batchId);

    console.log('✅ Simulation complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Simulation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
