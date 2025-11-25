import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichmentResult {
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

const generateStarbucksCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SBUX-';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
    if ((i + 1) % 4 === 0 && i < 11) code += '-';
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

    console.log('🚀 Starting comprehensive data simulation...');
    
    const result: EnrichmentResult = {
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
    };

    // ===== PHASE 1: GIFT CARD BRANDS & POOLS =====
    console.log('📦 Phase 1: Creating gift card brands and pools...');

    const brandConfigs = [
      { name: 'Amazon', category: 'E-Commerce', logo_url: 'https://logo.clearbit.com/amazon.com', is_active: true },
      { name: 'Visa', category: 'Prepaid Card', logo_url: 'https://logo.clearbit.com/visa.com', is_active: true },
      { name: 'Mastercard', category: 'Prepaid Card', logo_url: 'https://logo.clearbit.com/mastercard.com', is_active: true },
      { name: 'Target', category: 'Retail', logo_url: 'https://logo.clearbit.com/target.com', is_active: true },
      { name: 'Apple', category: 'Entertainment', logo_url: 'https://logo.clearbit.com/apple.com', is_active: true },
      { name: 'Walmart', category: 'Retail', logo_url: 'https://logo.clearbit.com/walmart.com', is_active: true },
      { name: 'Best Buy', category: 'Electronics', logo_url: 'https://logo.clearbit.com/bestbuy.com', is_active: true },
      { name: 'Home Depot', category: 'Home Improvement', logo_url: 'https://logo.clearbit.com/homedepot.com', is_active: true },
      { name: 'Chipotle', category: 'Food & Beverage', logo_url: 'https://logo.clearbit.com/chipotle.com', is_active: true },
      { name: 'Chick-fil-A', category: 'Food & Beverage', logo_url: 'https://logo.clearbit.com/chick-fil-a.com', is_active: true },
    ];

    const createdBrands: any = {};

    for (const brandConfig of brandConfigs) {
      const { data: existingBrand } = await supabase
        .from('gift_card_brands')
        .select('id')
        .eq('brand_name', brandConfig.name)
        .single();

      if (!existingBrand) {
        const { data: newBrand } = await supabase
          .from('gift_card_brands')
          .insert(brandConfig)
          .select()
          .single();

        if (newBrand) {
          createdBrands[brandConfig.name] = newBrand.id;
          result.brandsCreated++;
          console.log(`  ✓ Created brand: ${brandConfig.name}`);
        }
      } else {
        createdBrands[brandConfig.name] = existingBrand.id;
      }
    }

    // Get all brands for pool creation
    const { data: allBrands } = await supabase
      .from('gift_card_brands')
      .select('id, brand_name');

    const brandMap = new Map(allBrands?.map(b => [b.brand_name, b.id]) || []);

    // Get MoPads clients
    const { data: mopadsClients } = await supabase
      .from('clients')
      .select('id, name, org_id')
      .in('name', ['Vertical Roofing Experts', 'Prime Realty Group', 'Premier Auto Warranty', 'AutoGuard Protection']);

    if (!mopadsClients || mopadsClients.length === 0) {
      throw new Error('No MoPads clients found');
    }

    // Create pools for each client
    const poolConfigs = [
      { client: 'Vertical Roofing Experts', pools: [
        { brand: 'Amazon', value: 25 },
        { brand: 'Visa', value: 50 },
        { brand: 'Home Depot', value: 25 },
        { brand: 'Mobul', value: 10 },
      ]},
      { client: 'Prime Realty Group', pools: [
        { brand: 'Amazon', value: 50 },
        { brand: 'Visa', value: 100 },
        { brand: 'Target', value: 50 },
        { brand: 'Mobul', value: 25 },
      ]},
      { client: 'Premier Auto Warranty', pools: [
        { brand: 'Amazon', value: 25 },
        { brand: 'Visa', value: 50 },
        { brand: 'Mobul', value: 10 },
      ]},
      { client: 'AutoGuard Protection', pools: [
        { brand: 'Amazon', value: 25 },
        { brand: 'Visa', value: 50 },
        { brand: 'Best Buy', value: 25 },
        { brand: 'Mobul', value: 10 },
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
          .single();

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
            })
            .select()
            .single();

          if (newPool) {
            createdPools.push({ ...newPool, brand: poolDef.brand });
            result.poolsCreated++;
            console.log(`  ✓ Created pool: ${poolName}`);
          }
        } else {
          const { data: pool } = await supabase
            .from('gift_card_pools')
            .select('*, gift_card_brands(brand_name)')
            .eq('id', existingPool.id)
            .single();
          
          if (pool) {
            createdPools.push({ ...pool, brand: pool.gift_card_brands?.brand_name });
          }
        }
      }
    }

    // ===== PHASE 2: GENERATE GIFT CARDS =====
    console.log('💳 Phase 2: Generating 500+ gift cards with realistic formats...');

    const statusDistribution = ['available', 'available', 'available', 'available', 'claimed', 'claimed', 'delivered', 'delivered', 'redeemed'];
    
    for (const pool of createdPools) {
      const cardsToCreate = Math.floor(Math.random() * 30) + 40; // 40-70 cards per pool
      const cards = [];

      for (let i = 0; i < cardsToCreate; i++) {
        const status = randomElement(statusDistribution);
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1 + Math.floor(Math.random() * 2));

        let cardData: any = {
          pool_id: pool.id,
          status,
          expiration_date: futureDate.toISOString().split('T')[0],
          current_balance: pool.card_value,
        };

        // Generate realistic card data based on brand
        switch (pool.brand) {
          case 'Amazon':
            cardData.card_code = generateAmazonCode();
            cardData.card_number = `AMZN${Math.floor(Math.random() * 900000000000 + 100000000000)}`;
            break;
          
          case 'Visa':
          case 'Mastercard':
            const visaData = generateVisaCard();
            cardData.card_code = visaData.code;
            cardData.card_number = visaData.cardNumber;
            cardData.security_code = visaData.cvv;
            break;
          
          case 'Target':
            cardData.card_code = generateTargetCode();
            cardData.card_number = `TGT${Math.floor(Math.random() * 9000000000000000 + 1000000000000000)}`;
            break;
          
          case 'Apple':
            cardData.card_code = generateAppleCode();
            cardData.card_number = `APL${Math.floor(Math.random() * 900000000000 + 100000000000)}`;
            break;
          
          case 'Starbucks':
            cardData.card_code = generateStarbucksCode();
            cardData.card_number = `6011${Math.floor(Math.random() * 900000000000 + 100000000000)}`;
            break;
          
          case 'Mobul':
            cardData.card_code = generateMobulCode(pool.card_value);
            cardData.card_number = `MOBUL${Math.floor(Math.random() * 900000000000 + 100000000000)}`;
            break;
          
          default:
            cardData.card_code = generateGenericCode(pool.brand.slice(0, 3).toUpperCase());
            cardData.card_number = `${pool.brand.slice(0, 4).toUpperCase()}${Math.floor(Math.random() * 900000000000 + 100000000000)}`;
        }

        // Add timestamps for claimed/delivered/redeemed cards
        if (status === 'claimed' || status === 'delivered' || status === 'redeemed') {
          const daysAgo = Math.floor(Math.random() * 60) + 1;
          cardData.claimed_at = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
        }
        
        if (status === 'delivered' || status === 'redeemed') {
          const deliveryDate = cardData.claimed_at ? new Date(cardData.claimed_at) : new Date();
          deliveryDate.setHours(deliveryDate.getHours() + Math.floor(Math.random() * 4) + 1);
          cardData.delivered_at = deliveryDate.toISOString();
        }

        if (status === 'redeemed') {
          cardData.current_balance = 0;
          const redeemDate = cardData.delivered_at ? new Date(cardData.delivered_at) : new Date();
          redeemDate.setDate(redeemDate.getDate() + Math.floor(Math.random() * 14) + 1);
          cardData.redeemed_at = redeemDate.toISOString();
        }

        cards.push(cardData);
      }

      const { error } = await supabase.from('gift_cards').insert(cards);
      if (!error) {
        result.giftCardsCreated += cards.length;
        console.log(`  ✓ Created ${cards.length} ${pool.brand} cards for ${pool.pool_name}`);

        // Update pool counts
        await supabase
          .from('gift_card_pools')
          .update({
            total_cards: cards.length,
            available_cards: cards.filter((c: any) => c.status === 'available').length,
          })
          .eq('id', pool.id);
      }
    }

    // ===== PHASE 3: CALL CENTER INFRASTRUCTURE =====
    console.log('📞 Phase 3: Setting up call center infrastructure...');

    // Get campaigns for MoPads clients
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, name, client_id, clients(name)')
      .in('client_id', mopadsClients.map(c => c.id));

    if (campaigns && campaigns.length > 0) {
      // Create tracked phone numbers
      const phoneAreaCodes = [480, 602, 623];
      const trackedNumbers = [];

      for (const campaign of campaigns) {
        const areaCode = randomElement(phoneAreaCodes);
        const phoneNumber = `${areaCode}${Math.floor(Math.random() * 9000000 + 1000000)}`;
        
        trackedNumbers.push({
          campaign_id: campaign.id,
          client_id: campaign.client_id,
          phone_number: phoneNumber,
          friendly_name: `${campaign.name} - ${phoneNumber}`,
          is_active: true,
          twilio_sid: `PN${Math.random().toString(36).substring(2, 15)}`,
        });
      }

      const { data: createdNumbers, error: numbersError } = await supabase
        .from('tracked_phone_numbers')
        .insert(trackedNumbers)
        .select();

      if (!numbersError && createdNumbers) {
        result.trackedNumbersCreated = createdNumbers.length;
        console.log(`  ✓ Created ${createdNumbers.length} tracked phone numbers`);
      }

      // Create campaign conditions and reward configs
      for (const campaign of campaigns) {
        const conditions = [
          {
            campaign_id: campaign.id,
            condition_number: 1,
            condition_name: 'Verified Contact Information',
            trigger_type: 'manual_agent',
            is_active: true,
          },
          {
            campaign_id: campaign.id,
            condition_number: 2,
            condition_name: 'Scheduled Appointment',
            trigger_type: 'manual_agent',
            is_active: true,
          },
          {
            campaign_id: campaign.id,
            condition_number: 3,
            condition_name: 'Completed Purchase',
            trigger_type: 'crm_event',
            crm_event_name: 'purchase_completed',
            is_active: true,
          },
        ];

        const { data: createdConditions, error: condError } = await supabase
          .from('campaign_conditions')
          .insert(conditions)
          .select();

        if (!condError && createdConditions) {
          result.conditionsCreated += createdConditions.length;
          console.log(`  ✓ Created ${createdConditions.length} conditions for ${campaign.name}`);

          // Create reward configs for each condition
          const clientPools = createdPools.filter(p => p.client_id === campaign.client_id);
          
          if (clientPools.length >= 3) {
            const rewardConfigs = [
              {
                campaign_id: campaign.id,
                condition_number: 1,
                gift_card_pool_id: clientPools.find(p => p.provider === 'Mobul')?.id || clientPools[0].id,
                reward_description: 'Thank you for verifying your information',
                sms_template: 'Thank you for calling! Here\'s a {value} {brand} gift card: {code}',
              },
              {
                campaign_id: campaign.id,
                condition_number: 2,
                gift_card_pool_id: clientPools.find(p => p.provider === 'Amazon')?.id || clientPools[1].id,
                reward_description: 'Thank you for scheduling an appointment',
                sms_template: 'Thanks for scheduling! Enjoy this {value} {brand} gift card: {code}',
              },
              {
                campaign_id: campaign.id,
                condition_number: 3,
                gift_card_pool_id: clientPools.find(p => p.provider === 'Visa')?.id || clientPools[2].id,
                reward_description: 'Thank you for your purchase',
                sms_template: 'Thank you for your business! Here\'s a {value} {brand} gift card: {code}',
              },
            ];

            const { error: rewardError } = await supabase
              .from('campaign_reward_configs')
              .insert(rewardConfigs);

            if (!rewardError) {
              result.rewardConfigsCreated += rewardConfigs.length;
            }
          }
        }
      }
    }

    // ===== PHASE 4: CALL SESSION HISTORY =====
    console.log('📊 Phase 4: Generating call session history over 90 days...');

    const { data: trackedNumbers } = await supabase
      .from('tracked_phone_numbers')
      .select('*');

    const { data: recipients } = await supabase
      .from('recipients')
      .select('id, phone, audience_id, audiences(client_id)')
      .limit(200);

    if (trackedNumbers && trackedNumbers.length > 0 && recipients && recipients.length > 0) {
      const callSessions = [];
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      const callStatuses = ['completed', 'completed', 'completed', 'completed', 'missed', 'missed', 'voicemail', 'no-answer', 'busy'];
      const matchStatuses = ['matched', 'matched', 'matched', 'unmatched', 'pending'];

      for (let i = 0; i < 300; i++) {
        const trackedNumber = randomElement(trackedNumbers);
        const callStarted = randomDate(ninetyDaysAgo, now);
        const callStatus = randomElement(callStatuses);
        const matchStatus = randomElement(matchStatuses);
        
        const session: any = {
          tracked_number_id: trackedNumber.id,
          campaign_id: trackedNumber.campaign_id,
          caller_phone: generatePhone(),
          call_started_at: callStarted.toISOString(),
          call_status: callStatus,
          match_status: matchStatus,
          twilio_call_sid: `CA${Math.random().toString(36).substring(2, 15)}`,
        };

        if (matchStatus === 'matched') {
          const recipient = randomElement(recipients);
          session.recipient_id = recipient.id;
          session.caller_phone = recipient.phone || generatePhone();
        }

        if (callStatus === 'completed') {
          const duration = Math.floor(Math.random() * 720) + 30; // 30s to 12min
          const answered = new Date(callStarted.getTime() + Math.random() * 30000);
          const ended = new Date(answered.getTime() + duration * 1000);
          
          session.call_answered_at = answered.toISOString();
          session.call_ended_at = ended.toISOString();
          session.call_duration_seconds = duration;
          session.recording_url = `https://api.twilio.com/recordings/${session.twilio_call_sid}`;
          session.recording_duration = duration;
        }

        callSessions.push(session);
      }

      const { data: createdSessions, error: sessionsError } = await supabase
        .from('call_sessions')
        .insert(callSessions)
        .select();

      if (!sessionsError && createdSessions) {
        result.callSessionsCreated = createdSessions.length;
        console.log(`  ✓ Created ${createdSessions.length} call sessions`);

        // ===== PHASE 5: CONDITION COMPLETIONS & DELIVERIES =====
        console.log('✅ Phase 5: Recording condition completions and gift card deliveries...');

        // Get completed matched calls
        const completedCalls = createdSessions.filter(s => 
          s.call_status === 'completed' && s.match_status === 'matched'
        );

        // Get available gift cards by pool
        const { data: availableCards } = await supabase
          .from('gift_cards')
          .select('*, gift_card_pools(card_value, provider, client_id)')
          .eq('status', 'available')
          .limit(150);

        if (availableCards && availableCards.length > 0) {
          const conditionsMet = [];
          const deliveries = [];

          // 60% of completed matched calls get conditions met
          const callsWithConditions = completedCalls.slice(0, Math.floor(completedCalls.length * 0.6));

          for (const call of callsWithConditions) {
            const conditionNumber = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
            
            // Find appropriate gift card for this campaign and condition
            const { data: rewardConfig } = await supabase
              .from('campaign_reward_configs')
              .select('gift_card_pool_id')
              .eq('campaign_id', call.campaign_id)
              .eq('condition_number', conditionNumber)
              .single();

            if (rewardConfig) {
              const giftCard = availableCards.find(c => 
                c.pool_id === rewardConfig.gift_card_pool_id && 
                c.status === 'available'
              );

              if (giftCard) {
                const metAt = new Date(new Date(call.call_ended_at).getTime() + Math.random() * 3600000);
                
                conditionsMet.push({
                  call_session_id: call.id,
                  campaign_id: call.campaign_id,
                  recipient_id: call.recipient_id,
                  condition_number: conditionNumber,
                  met_at: metAt.toISOString(),
                  gift_card_id: giftCard.id,
                  delivery_status: 'delivered',
                });

                // Update gift card status
                await supabase
                  .from('gift_cards')
                  .update({
                    status: 'delivered',
                    claimed_at: call.call_ended_at,
                    delivered_at: metAt.toISOString(),
                  })
                  .eq('id', giftCard.id);

                // Create delivery record
                const deliveryMethod = Math.random() > 0.3 ? 'sms' : 'email';
                deliveries.push({
                  gift_card_id: giftCard.id,
                  recipient_id: call.recipient_id,
                  campaign_id: call.campaign_id,
                  delivery_method: deliveryMethod,
                  delivered_at: metAt.toISOString(),
                  delivery_status: Math.random() > 0.1 ? 'sent' : 'pending',
                  twilio_message_sid: deliveryMethod === 'sms' ? `SM${Math.random().toString(36).substring(2, 15)}` : null,
                });

                // Mark card as used in available cards array
                giftCard.status = 'delivered';
              }
            }
          }

          if (conditionsMet.length > 0) {
            const { error: condMetError } = await supabase
              .from('call_conditions_met')
              .insert(conditionsMet);

            if (!condMetError) {
              result.conditionsMetCreated = conditionsMet.length;
              console.log(`  ✓ Recorded ${conditionsMet.length} condition completions`);
            }
          }

          if (deliveries.length > 0) {
            const { error: deliveryError } = await supabase
              .from('gift_card_deliveries')
              .insert(deliveries);

            if (!deliveryError) {
              result.deliveriesCreated = deliveries.length;
              console.log(`  ✓ Created ${deliveries.length} gift card deliveries`);
            }
          }
        }
      }
    }

    // ===== PHASE 6: CONTACTS & RECIPIENTS ENRICHMENT =====
    console.log('👥 Phase 6: Enriching contacts and recipients...');

    for (const client of mopadsClients) {
      const theme = client.name.includes('Roofing') ? 'roofing' :
                    client.name.includes('Realty') ? 'realty' : 'auto';
      
      const contacts = [];
      const targetCount = 75;

      for (let i = 0; i < targetCount; i++) {
        const firstName = randomElement(firstNames);
        const lastName = randomElement(lastNames);
        const city = randomElement(cities);
        const lifecycleStages = ['lead', 'lead', 'mql', 'opportunity', 'opportunity', 'customer', 'customer'];
        const stage = randomElement(lifecycleStages);
        const leadSources = ['website', 'referral', 'direct_mail', 'social_media', 'event'];
        
        contacts.push({
          client_id: client.id,
          first_name: firstName,
          last_name: lastName,
          email: generateEmail(firstName, lastName, theme),
          phone: generatePhone(),
          mobile_phone: generatePhone(),
          company: theme === 'roofing' ? `${lastName} Properties` : 
                   theme === 'realty' ? `${firstName} ${lastName}` :
                   `${lastName} Auto Group`,
          job_title: randomElement(jobTitles[theme]),
          address: `${Math.floor(Math.random() * 9999) + 1} ${lastName} ${['St', 'Ave', 'Dr', 'Ln'][Math.floor(Math.random() * 4)]}`,
          city,
          state: 'AZ',
          zip: `85${Math.floor(Math.random() * 900 + 100)}`,
          lifecycle_stage: stage,
          lead_score: Math.floor(Math.random() * 100),
          lead_source: randomElement(leadSources),
          engagement_score: Math.floor(Math.random() * 100),
          total_interactions: Math.floor(Math.random() * 20),
          notes: `${stage} prospect for ${client.name}. ${['Hot lead', 'Follow up needed', 'Qualified buyer', 'Ready to close'][Math.floor(Math.random() * 4)]}`,
          last_activity_date: randomDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), new Date()).toISOString(),
        });
      }

      const { error: contactsError } = await supabase
        .from('contacts')
        .insert(contacts);

      if (!contactsError) {
        result.contactsCreated += targetCount;
        console.log(`  ✓ Created ${targetCount} contacts for ${client.name}`);
      }
    }

    console.log('🎉 Data simulation complete!');
    console.log('Summary:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Simulation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
