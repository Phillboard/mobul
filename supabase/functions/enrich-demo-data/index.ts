import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichmentParams {
  dataTypes?: string[];
  quantities?: Record<string, number>;
  scope?: 'total' | 'per_agency' | 'per_client';
  targetAgencyId?: string;
  targetClientIds?: string[];
  markAsSimulated?: boolean;
}

interface EnrichmentResult {
  batchId: string;
  brandsCreated: number;
  poolsCreated: number;
  giftCardsCreated: number;
  trackedNumbersCreated: number;
  conditionsCreated: number;
  rewardConfigsCreated: number;
  callSessionsCreated: number;
  conditionsMetCreated: number;
  deliveriesCreated: number;
  contactsCreated: number;
  recipientsCreated: number;
  totalRecords: number;
}

// ============= HELPER FUNCTIONS =============

const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen', 'Daniel', 'Nancy', 'Matthew', 'Lisa', 'Anthony', 'Betty'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'White', 'Harris'];
const cities = ['Phoenix', 'Scottsdale', 'Tempe', 'Mesa', 'Chandler', 'Gilbert', 'Glendale', 'Peoria', 'Surprise', 'Avondale'];

const jobTitles = {
  roofing: ['Property Manager', 'Homeowner', 'Building Manager', 'Facilities Director'],
  realty: ['Home Buyer', 'Seller', 'Real Estate Investor', 'Property Developer'],
  auto: ['Fleet Manager', 'Vehicle Owner', 'Operations Manager', 'Dealership Owner'],
};

const generatePhone = () => `${480 + Math.floor(Math.random() * 3)}${Math.floor(Math.random() * 9000000 + 1000000)}`;
const generateEmail = (first: string, last: string, domain: string) => 
  `${first.toLowerCase()}.${last.toLowerCase()}@${domain.toLowerCase().replace(/\s+/g, '')}.com`;

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

const generateMobulCode = (value: number) => {
  const num = Math.floor(Math.random() * 9000 + 1000);
  return `MOBUL-$${value}-${num}`;
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

// ============= MAIN FUNCTION =============

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    const { data: { user } } = await supabase.auth.getUser(authHeader?.replace('Bearer ', ''));

    // Parse request params
    const params: EnrichmentParams = req.method === 'POST' ? await req.json() : {};
    const {
      dataTypes = ['brands', 'pools', 'giftCards', 'trackedNumbers', 'conditions', 'callSessions', 'contacts'],
      quantities = {},
      scope = 'per_client',
      markAsSimulated = true,
    } = params;

    console.log('🚀 Starting data simulation with params:', { dataTypes, quantities, scope });

    // Create simulation batch record
    const batchId = crypto.randomUUID();
    const { error: batchError } = await supabase.from('simulation_batches').insert({
      id: batchId,
      created_by: user?.id,
      data_types: dataTypes,
      parameters: params,
      status: 'running',
    });

    if (batchError) {
      console.error('Failed to create batch:', batchError);
    }
    
    const result: EnrichmentResult = {
      batchId,
      brandsCreated: 0,
      poolsCreated: 0,
      giftCardsCreated: 0,
      trackedNumbersCreated: 0,
      conditionsCreated: 0,
      rewardConfigsCreated: 0,
      callSessionsCreated: 0,
      conditionsMetCreated: 0,
      deliveriesCreated: 0,
      contactsCreated: 0,
      recipientsCreated: 0,
      totalRecords: 0,
    };

    // Get MoPads clients
    const { data: mopadsClients } = await supabase
      .from('clients')
      .select('id, name, org_id')
      .in('name', ['Vertical Roofing Experts', 'Prime Realty Group', 'Premier Auto Warranty', 'AutoGuard Protection']);

    if (!mopadsClients || mopadsClients.length === 0) {
      throw new Error('No MoPads clients found');
    }

    // ===== PHASE 1: GIFT CARD BRANDS & POOLS =====
    if (dataTypes.includes('brands') || dataTypes.includes('pools')) {
      console.log('📦 Phase 1: Creating gift card brands and pools...');

      const brandConfigs = [
        { brand_name: 'Amazon', brand_code: 'AMZN', provider: 'Amazon', category: 'E-Commerce', logo_url: 'https://logo.clearbit.com/amazon.com', is_active: true },
        { brand_name: 'Visa', brand_code: 'VISA', provider: 'Visa', category: 'Prepaid Card', logo_url: 'https://logo.clearbit.com/visa.com', is_active: true },
        { brand_name: 'Target', brand_code: 'TGT', provider: 'Target', category: 'Retail', logo_url: 'https://logo.clearbit.com/target.com', is_active: true },
        { brand_name: 'Apple', brand_code: 'AAPL', provider: 'Apple', category: 'Entertainment', logo_url: 'https://logo.clearbit.com/apple.com', is_active: true },
        { brand_name: 'Best Buy', brand_code: 'BBY', provider: 'BestBuy', category: 'Electronics', logo_url: 'https://logo.clearbit.com/bestbuy.com', is_active: true },
        { brand_name: 'Home Depot', brand_code: 'HD', provider: 'HomeDepot', category: 'Home Improvement', logo_url: 'https://logo.clearbit.com/homedepot.com', is_active: true },
      ];

      const brandMap = new Map();

      for (const brandConfig of brandConfigs) {
        const { data: existingBrand } = await supabase
          .from('gift_card_brands')
          .select('id')
          .eq('brand_name', brandConfig.brand_name)
          .single();

        if (!existingBrand) {
          const { data: newBrand } = await supabase
            .from('gift_card_brands')
            .insert(brandConfig)
            .select()
            .single();

          if (newBrand) {
            brandMap.set(brandConfig.brand_name, newBrand.id);
            result.brandsCreated++;
          }
        } else {
          brandMap.set(brandConfig.brand_name, existingBrand.id);
        }
      }

      // Create pools
      if (dataTypes.includes('pools')) {
        const poolConfigs = [
          { client: 'Vertical Roofing Experts', pools: [
            { brand: 'Amazon', value: 25 },
            { brand: 'Visa', value: 50 },
            { brand: 'Home Depot', value: 25 },
          ]},
          { client: 'Prime Realty Group', pools: [
            { brand: 'Amazon', value: 50 },
            { brand: 'Visa', value: 100 },
            { brand: 'Target', value: 50 },
          ]},
          { client: 'Premier Auto Warranty', pools: [
            { brand: 'Amazon', value: 25 },
            { brand: 'Visa', value: 50 },
          ]},
          { client: 'AutoGuard Protection', pools: [
            { brand: 'Amazon', value: 25 },
            { brand: 'Visa', value: 50 },
            { brand: 'Best Buy', value: 25 },
          ]},
        ];

        const createdPools: any[] = [];

        for (const config of poolConfigs) {
          const client = mopadsClients.find(c => c.name === config.client);
          if (!client) continue;

          for (const poolDef of config.pools) {
            const brandId = brandMap.get(poolDef.brand);
            if (!brandId) continue;

            const poolName = `${client.name} - $${poolDef.value} ${poolDef.brand}`;
            
            const { data: existingPool } = await supabase
              .from('gift_card_pools')
              .select('id')
              .eq('pool_name', poolName)
              .maybeSingle();

            if (!existingPool) {
              const { data: newPool } = await supabase
                .from('gift_card_pools')
                .insert({
                  client_id: client.id,
                  brand_id: brandId,
                  pool_name: poolName,
                  provider: poolDef.brand,
                  card_value: poolDef.value,
                  available_cards: 0,
                  total_cards: 0,
                  low_stock_threshold: 10,
                  purchase_method: 'csv_only',
                  is_simulated: markAsSimulated,
                  simulation_batch_id: markAsSimulated ? batchId : null,
                })
                .select()
                .single();

              if (newPool) {
                createdPools.push({ ...newPool, brand: poolDef.brand });
                result.poolsCreated++;
              }
            }
          }
        }

        // ===== PHASE 2: GENERATE GIFT CARDS =====
        if (dataTypes.includes('giftCards')) {
          console.log('💳 Phase 2: Generating gift cards...');

          const cardsPerPool = quantities.giftCards ? Math.floor(quantities.giftCards / createdPools.length) : 50;
          const statusDistribution = ['available', 'available', 'available', 'available', 'claimed', 'claimed', 'delivered', 'delivered', 'redeemed'];
          
          // Get existing pools for gift card generation
          const { data: allPools } = await supabase
            .from('gift_card_pools')
            .select('*, gift_card_brands(brand_name)')
            .in('client_id', mopadsClients.map(c => c.id));

          for (const pool of (allPools || [])) {
            const cards = [];
            const brandName = pool.gift_card_brands?.brand_name || pool.provider;

            for (let i = 0; i < cardsPerPool; i++) {
              const status = randomElement(statusDistribution);
              const futureDate = new Date();
              futureDate.setFullYear(futureDate.getFullYear() + 1);

              let cardData: any = {
                pool_id: pool.id,
                status,
                expiration_date: futureDate.toISOString().split('T')[0],
                current_balance: pool.card_value,
                is_simulated: markAsSimulated,
                simulation_batch_id: markAsSimulated ? batchId : null,
              };

              // Generate realistic card codes
              switch (brandName) {
                case 'Amazon':
                  cardData.card_code = generateAmazonCode();
                  break;
                case 'Visa':
                  const visaData = generateVisaCard();
                  cardData.card_code = visaData.code;
                  cardData.card_number = visaData.cardNumber;
                  break;
                case 'Target':
                  cardData.card_code = generateTargetCode();
                  break;
                case 'Apple':
                  cardData.card_code = generateAppleCode();
                  break;
                default:
                  cardData.card_code = generateGenericCode(brandName.slice(0, 3).toUpperCase());
              }

              if (status !== 'available') {
                const daysAgo = Math.floor(Math.random() * 60) + 1;
                cardData.claimed_at = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
              }

              cards.push(cardData);
            }

            const { error } = await supabase.from('gift_cards').insert(cards);
            if (!error) {
              result.giftCardsCreated += cards.length;
              
              await supabase
                .from('gift_card_pools')
                .update({
                  total_cards: cards.length,
                  available_cards: cards.filter((c: any) => c.status === 'available').length,
                })
                .eq('id', pool.id);
            }
          }
        }
      }
    }

    // ===== PHASE 3: CONTACTS =====
    if (dataTypes.includes('contacts')) {
      console.log('👥 Phase 3: Creating contacts...');

      const contactsPerClient = quantities.contacts || 75;
      const lifecycleStages = ['lead', 'mql', 'sql', 'opportunity', 'customer', 'evangelist'];

      for (const client of mopadsClients) {
        const contacts = [];
        
        for (let i = 0; i < contactsPerClient; i++) {
          const firstName = randomElement(firstNames);
          const lastName = randomElement(lastNames);
          
          contacts.push({
            client_id: client.id,
            first_name: firstName,
            last_name: lastName,
            email: generateEmail(firstName, lastName, client.name),
            phone: generatePhone(),
            company: `${randomElement(lastNames)} ${randomElement(['Inc', 'LLC', 'Corp', 'Group'])}`,
            city: randomElement(cities),
            state: 'AZ',
            lifecycle_stage: randomElement(lifecycleStages),
            lead_score: Math.floor(Math.random() * 100),
            is_simulated: markAsSimulated,
            simulation_batch_id: markAsSimulated ? batchId : null,
          });
        }

        const { error } = await supabase.from('contacts').insert(contacts);
        if (!error) {
          result.contactsCreated += contacts.length;
        }
      }
    }

    // Calculate total records
    result.totalRecords = Object.values(result).reduce((sum: number, val) => 
      typeof val === 'number' && val !== result.totalRecords ? sum + val : sum, 0
    );

    // Update batch status
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
