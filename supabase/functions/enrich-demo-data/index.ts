import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichmentResult {
  contactsEnriched: number;
  recipientsCreated: number;
  giftCardsCreated: number;
  audiencesEnriched: string[];
}

// Helper functions for realistic data generation
const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

const autoCompanies = ['Premier Auto Warranty', 'AutoGuard Protection', 'Vehicle Shield', 'DriveSecure', 'AutoCare Plus'];
const jobTitles = ['Owner', 'Fleet Manager', 'Operations Manager', 'Director', 'VP Operations'];
const cities = ['Phoenix', 'Scottsdale', 'Tempe', 'Mesa', 'Chandler', 'Gilbert', 'Glendale', 'Peoria'];

const generatePhone = () => `602${Math.floor(Math.random() * 9000000 + 1000000)}`;
const generateEmail = (first: string, last: string, domain: string) => 
  `${first.toLowerCase()}.${last.toLowerCase()}@${domain.toLowerCase().replace(/\s+/g, '')}.com`;

const generateStarbucksCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
    if ((i + 1) % 4 === 0 && i < 15) code += '-';
  }
  return code;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting comprehensive data enrichment...');
    
    const result: EnrichmentResult = {
      contactsEnriched: 0,
      recipientsCreated: 0,
      giftCardsCreated: 0,
      audiencesEnriched: [],
    };

    // ===== 3.1: Enrich existing contacts (Premier Auto Warranty) =====
    const { data: existingContacts } = await supabase
      .from('contacts')
      .select('id, client_id, lifecycle_stage')
      .is('company', null)
      .limit(118);

    if (existingContacts && existingContacts.length > 0) {
      console.log(`Enriching ${existingContacts.length} existing contacts...`);
      
      for (const contact of existingContacts) {
        const company = autoCompanies[Math.floor(Math.random() * autoCompanies.length)];
        const jobTitle = jobTitles[Math.floor(Math.random() * jobTitles.length)];
        const tags = contact.lifecycle_stage === 'customer' ? ['vip', 'high-value'] : 
                     contact.lifecycle_stage === 'opportunity' ? ['hot-lead', 'decision-maker'] : 
                     ['prospect'];
        
        await supabase
          .from('contacts')
          .update({
            company,
            job_title: jobTitle,
            notes: `${contact.lifecycle_stage === 'customer' ? 'Active customer' : 'Prospect'} for auto warranty services. ${company} contact.`,
          })
          .eq('id', contact.id);
        
        result.contactsEnriched++;
      }
    }

    // ===== 3.2: Create realistic recipients for active audiences =====
    const audienceConfigs = [
      { name: 'High Mileage Vehicles', count: 80, theme: 'auto' },
      { name: 'New Vehicle Owners 2024', count: 80, theme: 'auto' },
      { name: 'Dental Checkup Reminders', count: 50, theme: 'dental' },
      { name: 'Personal Training Leads', count: 50, theme: 'fitness' },
      { name: 'Luxury Home Buyers', count: 50, theme: 'realty-luxury' },
      { name: 'First Time Home Buyers', count: 50, theme: 'realty' },
      { name: 'Gym Membership Drive', count: 50, theme: 'fitness' },
      { name: 'New Patient Prospects', count: 50, theme: 'dental' },
    ];

    for (const config of audienceConfigs) {
      const { data: audience } = await supabase
        .from('audiences')
        .select('id, client_id')
        .eq('name', config.name)
        .single();

      if (audience) {
        console.log(`Creating ${config.count} recipients for ${config.name}...`);
        const recipients = [];

        for (let i = 0; i < config.count; i++) {
          const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
          const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
          const city = cities[Math.floor(Math.random() * cities.length)];
          
          recipients.push({
            audience_id: audience.id,
            first_name: firstName,
            last_name: lastName,
            email: generateEmail(firstName, lastName, config.theme),
            phone: generatePhone(),
            address: `${Math.floor(Math.random() * 9999) + 1} ${lastName} St`,
            city,
            state: 'AZ',
            zip: `85${Math.floor(Math.random() * 900 + 100)}`,
            approval_status: 'pending',
          });
        }

        const { error } = await supabase.from('recipients').insert(recipients);
        if (!error) {
          result.recipientsCreated += config.count;
          result.audiencesEnriched.push(config.name);
        }
      }
    }

    // ===== 3.3: Add realistic Starbucks gift cards =====
    const { data: starbucksPools } = await supabase
      .from('gift_card_pools')
      .select('id')
      .ilike('pool_name', '%starbucks%')
      .eq('total_cards', 0);

    if (starbucksPools && starbucksPools.length > 0) {
      console.log(`Adding gift cards to ${starbucksPools.length} Starbucks pools...`);
      
      for (const pool of starbucksPools) {
        const cards = [];
        for (let i = 0; i < 25; i++) {
          cards.push({
            pool_id: pool.id,
            card_code: generateStarbucksCode(),
            card_number: `6011${Math.floor(Math.random() * 900000000000 + 100000000000)}`,
            status: 'available',
          });
        }
        
        const { error } = await supabase.from('gift_cards').insert(cards);
        if (!error) {
          result.giftCardsCreated += 25;
        }
      }
    }

    // ===== 3.4: Create contacts for other active clients =====
    const clientConfigs = [
      { name: 'Demo Roofing Company', count: 40, theme: 'roofing' },
      { name: 'Elite Fitness Center', count: 40, theme: 'fitness' },
      { name: 'Smile Dental Care', count: 40, theme: 'dental' },
      { name: 'Prime Realty Group', count: 40, theme: 'realty' },
    ];

    for (const config of clientConfigs) {
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('name', config.name)
        .single();

      if (client) {
        console.log(`Creating ${config.count} contacts for ${config.name}...`);
        const contacts = [];

        for (let i = 0; i < config.count; i++) {
          const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
          const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
          const city = cities[Math.floor(Math.random() * cities.length)];
          const lifecycleStages = ['lead', 'mql', 'opportunity', 'customer'];
          const stage = lifecycleStages[Math.floor(Math.random() * lifecycleStages.length)];
          
          contacts.push({
            client_id: client.id,
            first_name: firstName,
            last_name: lastName,
            email: generateEmail(firstName, lastName, config.theme),
            phone: generatePhone(),
            mobile_phone: generatePhone(),
            address: `${Math.floor(Math.random() * 9999) + 1} ${lastName} Dr`,
            city,
            state: 'AZ',
            zip: `85${Math.floor(Math.random() * 900 + 100)}`,
            lifecycle_stage: stage,
            lead_score: Math.floor(Math.random() * 100),
            lead_source: ['website', 'referral', 'direct_mail', 'social_media'][Math.floor(Math.random() * 4)],
            notes: `${config.theme} prospect - ${stage}`,
          });
        }

        const { error } = await supabase.from('contacts').insert(contacts);
        if (!error) {
          result.contactsEnriched += config.count;
        }
      }
    }

    console.log('Enrichment complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Enrichment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
