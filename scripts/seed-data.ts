/**
 * Seed Data Script for ACE Engage Platform
 * Generates realistic test data for 2 agencies with 3 clients each
 */

import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import * as generators from './seed-data/generators';
import * as constants from './seed-data/constants';

// Supabase configuration
const SUPABASE_URL = 'https://uibvxhwhkatjcwghnzpu.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpYnZ4aHdoa2F0amN3Z2huenB1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU5OTczMSwiZXhwIjoyMDgwMTc1NzMxfQ.4O-waCA6WwxgtALsADUmdUTXlSPo82hHJ7qZB4BzYuo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// Storage for generated IDs
const ids = {
  orgs: [] as string[],
  clients: [] as string[],
  users: [] as string[],
  brands: [] as string[],
  pools: [] as string[],
  contacts: [] as string[],
  lists: [] as string[],
  campaigns: [] as string[],
  templates: [] as string[],
  landingPages: [] as string[],
  audiences: [] as string[],
};

async function clearDemoData() {
  console.log('🧹 Clearing existing demo data...');
  
  // Delete in reverse dependency order
  const tables = [
    'events', 'recipient_audit_log', 'contact_campaign_participation',
    'recipients', 'campaign_comments', 'campaign_drafts', 'campaign_reward_configs',
    'campaign_conditions', 'campaigns', 'gift_cards', 'gift_card_pools',
    'contact_tags', 'contact_list_members', 'audiences', 'contacts',
    'contact_lists', 'landing_pages', 'templates', 'brand_kits',
    'client_users', 'clients', 'org_members', 'user_roles', 'organizations'
  ];

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .like('id', 'seed-%');
    
    if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
      console.log(`   ⚠️ ${table}:`, error.message.substring(0, 60));
    }
  }
  
  console.log('   ✅ Demo data cleared\n');
}

async function seedOrganizations() {
  console.log('📊 Creating organizations...');
  
  for (const agency of constants.AGENCIES) {
    const orgId = faker.string.uuid();
    
    const { error } = await supabase.from('organizations').insert({
      id: orgId,
      name: agency.name,
      type: 'agency',
      settings_json: {
        default_timezone: 'America/New_York',
        allow_client_api_access: true,
        description: agency.description,
      },
    });

    if (error) {
      console.error(`   ❌ Error creating ${agency.name}:`, error.message);
    } else {
      ids.orgs.push(orgId);
      console.log(`   ✅ ${agency.name}`);
    }
  }
  
  console.log('');
}

async function seedClients() {
  console.log('🏢 Creating clients...');
  
  const roofingOrg = ids.orgs[0];
  const autoOrg = ids.orgs[1];
  
  // Roofing clients
  for (const client of constants.CLIENTS.roofing) {
    const clientId = faker.string.uuid();
    const colors = generators.generateBrandColors('roofing');
    
    const { error } = await supabase.from('clients').insert({
      id: clientId,
      org_id: roofingOrg,
      name: client.name,
      industry: 'roofing',
      brand_colors_json: colors,
      tagline: client.description,
    });

    if (error) {
      console.error(`   ❌ ${client.name}:`, error.message);
    } else {
      ids.clients.push(clientId);
      console.log(`   ✅ ${client.name}`);
      
      // Create brand kit
      await supabase.from('brand_kits').insert({
        id: faker.string.uuid(),
        client_id: clientId,
        name: 'Primary Brand Kit',
        primary_color: colors.primary,
        secondary_color: colors.secondary,
        accent_color: colors.accent,
        logo_url: `https://placehold.co/400x200/${colors.primary.replace('#', '')}/FFFFFF?text=${encodeURIComponent(client.name)}`,
      });
    }
  }
  
  // Automotive clients
  for (const client of constants.CLIENTS.automotive) {
    const clientId = faker.string.uuid();
    const colors = generators.generateBrandColors('automotive');
    
    const { error } = await supabase.from('clients').insert({
      id: clientId,
      org_id: autoOrg,
      name: client.name,
      industry: 'auto_warranty',
      brand_colors_json: colors,
      tagline: client.description,
    });

    if (error) {
      console.error(`   ❌ ${client.name}:`, error.message);
    } else {
      ids.clients.push(clientId);
      console.log(`   ✅ ${client.name}`);
      
      // Create brand kit
      await supabase.from('brand_kits').insert({
        id: faker.string.uuid(),
        client_id: clientId,
        name: 'Primary Brand Kit',
        primary_color: colors.primary,
        secondary_color: colors.secondary,
        accent_color: colors.accent,
        logo_url: `https://placehold.co/400x200/${colors.primary.replace('#', '')}/FFFFFF?text=${encodeURIComponent(client.name)}`,
      });
    }
  }
  
  console.log('');
}

async function seedUsers() {
  console.log('👥 Creating users and roles...');
  
  // Create 2 agency owners
  for (let i = 0; i < 2; i++) {
    const userId = faker.string.uuid();
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const orgId = ids.orgs[i];
    
    // Create profile
    await supabase.from('profiles').insert({
      id: userId,
      email: generators.generateEmail(firstName, lastName),
      first_name: firstName,
      last_name: lastName,
      phone: generators.generatePhoneNumber(),
    });
    
    // Create user role
    await supabase.from('user_roles').insert({
      id: faker.string.uuid(),
      user_id: userId,
      role: 'agency_owner',
    });
    
    // Create org membership
    await supabase.from('org_members').insert({
      id: faker.string.uuid(),
      org_id: orgId,
      user_id: userId,
    });
    
    ids.users.push(userId);
    console.log(`   ✅ Agency Owner: ${firstName} ${lastName}`);
  }
  
  // Create 6 client users (1 per client)
  for (let i = 0; i < ids.clients.length; i++) {
    const userId = faker.string.uuid();
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const clientId = ids.clients[i];
    
    // Create profile
    await supabase.from('profiles').insert({
      id: userId,
      email: generators.generateEmail(firstName, lastName),
      first_name: firstName,
      last_name: lastName,
      phone: generators.generatePhoneNumber(),
    });
    
    // Create user role
    await supabase.from('user_roles').insert({
      id: faker.string.uuid(),
      user_id: userId,
      role: 'company_owner',
    });
    
    // Create client membership
    await supabase.from('client_users').insert({
      id: faker.string.uuid(),
      client_id: clientId,
      user_id: userId,
    });
    
    ids.users.push(userId);
    console.log(`   ✅ Client User: ${firstName} ${lastName}`);
  }
  
  console.log('');
}

async function seedGiftCards() {
  console.log('🎁 Creating gift card system...');
  
  // Create brands
  console.log('   Creating brands...');
  for (const brand of constants.GIFT_CARD_BRANDS) {
    const brandId = faker.string.uuid();
    
    await supabase.from('gift_card_brands').insert({
      id: brandId,
      name: brand.name,
      category: brand.category,
      logo_url: brand.logo_url,
      is_active: true,
    });
    
    ids.brands.push(brandId);
  }
  console.log(`   ✅ Created ${ids.brands.length} brands`);
  
  // Create 2 pools per client
  console.log('   Creating gift card pools...');
  for (const clientId of ids.clients) {
    const clientIndex = ids.clients.indexOf(clientId);
    const isRoofing = clientIndex < 3;
    
    // Pool 1: Smaller value, more cards
    const pool1Id = faker.string.uuid();
    const brandIndex1 = isRoofing ? 3 : 5; // Home Depot or AutoZone
    
    await supabase.from('gift_card_pools').insert({
      id: pool1Id,
      client_id: clientId,
      brand_id: ids.brands[brandIndex1],
      pool_name: `${isRoofing ? '$25' : '$25'} Standard Pool`,
      pool_type: 'csv_upload',
      card_value: 25.00,
      provider: 'TangoCard',
      total_cards: 25,
      available_cards: 20,
      claimed_cards: 5,
    });
    ids.pools.push(pool1Id);
    
    // Create 25 cards for pool 1
    for (let i = 0; i < 25; i++) {
      await supabase.from('gift_cards').insert({
        id: faker.string.uuid(),
        pool_id: pool1Id,
        card_code: generators.generateGiftCardCode(constants.GIFT_CARD_BRANDS[brandIndex1].name),
        card_number: faker.finance.creditCardNumber(),
        pin: generators.generateGiftCardPin(),
        status: i < 5 ? 'claimed' : 'available',
        claimed_at: i < 5 ? generators.randomPastDate(30) : null,
      });
    }
    
    // Pool 2: Larger value, fewer cards
    const pool2Id = faker.string.uuid();
    const brandIndex2 = isRoofing ? 0 : 0; // Amazon for both
    
    await supabase.from('gift_card_pools').insert({
      id: pool2Id,
      client_id: clientId,
      brand_id: ids.brands[brandIndex2],
      pool_name: `${isRoofing ? '$50' : '$50'} Premium Pool`,
      pool_type: 'csv_upload',
      card_value: 50.00,
      provider: 'TangoCard',
      total_cards: 25,
      available_cards: 18,
      claimed_cards: 7,
    });
    ids.pools.push(pool2Id);
    
    // Create 25 cards for pool 2
    for (let i = 0; i < 25; i++) {
      await supabase.from('gift_cards').insert({
        id: faker.string.uuid(),
        pool_id: pool2Id,
        card_code: generators.generateGiftCardCode(constants.GIFT_CARD_BRANDS[brandIndex2].name),
        card_number: faker.finance.creditCardNumber(),
        pin: generators.generateGiftCardPin(),
        status: i < 7 ? 'claimed' : 'available',
        claimed_at: i < 7 ? generators.randomPastDate(30) : null,
      });
    }
  }
  console.log(`   ✅ Created ${ids.pools.length} pools with 50 cards each`);
  console.log('');
}

async function seedContacts() {
  console.log('📇 Creating contacts and lists...');
  
  for (const clientId of ids.clients) {
    const clientIndex = ids.clients.indexOf(clientId);
    const isRoofing = clientIndex < 3;
    const industry = isRoofing ? 'roofing' : 'automotive';
    
    // Create 2 contact lists
    const list1Id = faker.string.uuid();
    const list2Id = faker.string.uuid();
    
    await supabase.from('contact_lists').insert([
      {
        id: list1Id,
        client_id: clientId,
        name: 'Hot Leads',
        list_type: 'static',
      },
      {
        id: list2Id,
        client_id: clientId,
        name: 'Past Customers',
        list_type: 'static',
      },
    ]);
    
    ids.lists.push(list1Id, list2Id);
    
    // Create ~50 contacts per client
    const contactCount = faker.number.int({ min: 45, max: 55 });
    for (let i = 0; i < contactCount; i++) {
      const contactData = generators.generateContact(industry);
      const contactId = faker.string.uuid();
      
      await supabase.from('contacts').insert({
        id: contactId,
        client_id: clientId,
        ...contactData,
      });
      
      ids.contacts.push(contactId);
      
      // Add to lists (70% to Hot Leads, 30% to Past Customers)
      const listId = Math.random() < 0.7 ? list1Id : list2Id;
      await supabase.from('contact_list_members').insert({
        id: faker.string.uuid(),
        list_id: listId,
        contact_id: contactId,
      });
      
      // Add tags (50% chance to have tags)
      if (Math.random() < 0.5) {
        const tags = constants.CONTACT_TAGS[industry];
        const numTags = faker.number.int({ min: 1, max: 3 });
        const selectedTags = faker.helpers.shuffle(tags).slice(0, numTags);
        
        for (const tag of selectedTags) {
          await supabase.from('contact_tags').insert({
            id: faker.string.uuid(),
            contact_id: contactId,
            tag: tag,
          });
        }
      }
    }
    
    console.log(`   ✅ Client ${clientIndex + 1}: ${contactCount} contacts`);
  }
  
  console.log('');
}

async function seedTemplatesAndLandingPages() {
  console.log('📄 Creating templates and landing pages...');
  
  for (const clientId of ids.clients) {
    const clientIndex = ids.clients.indexOf(clientId);
    const isRoofing = clientIndex < 3;
    const industry = isRoofing ? 'roofing' : 'automotive';
    const content = constants.MAILER_CONTENT[industry];
    const lpContent = constants.LANDING_PAGE_CONTENT[industry];
    
    // Create template
    const templateId = faker.string.uuid();
    await supabase.from('templates').insert({
      id: templateId,
      client_id: clientId,
      name: `${industry === 'roofing' ? 'Roof Inspection' : 'Warranty'} Mailer`,
      size: '6x9',
      json_layers: {
        front: { content: content.headline },
        back: { content: content.cta }
      },
      thumbnail_url: `https://placehold.co/600x400/4A5568/FFFFFF?text=${encodeURIComponent(content.headline)}`,
    });
    ids.templates.push(templateId);
    
    // Create landing page
    const landingPageId = faker.string.uuid();
    await supabase.from('landing_pages').insert({
      id: landingPageId,
      client_id: clientId,
      name: `${lpContent.title} Page`,
      html_content: `<html><body><h1>${lpContent.title}</h1><h2>${lpContent.subtitle}</h2><ul>${lpContent.benefits.map(b => `<li>${b}</li>`).join('')}</ul></body></html>`,
      published: true,
    });
    ids.landingPages.push(landingPageId);
    
    console.log(`   ✅ Client ${clientIndex + 1}: Template + Landing Page`);
  }
  
  console.log('');
}

async function seedCampaigns() {
  console.log('📢 Creating campaigns...');
  
  for (const clientId of ids.clients) {
    const clientIndex = ids.clients.indexOf(clientId);
    const isRoofing = clientIndex < 3;
    const industry = isRoofing ? 'roofing' : 'automotive';
    const campaignTemplates = constants.CAMPAIGN_TEMPLATES[industry];
    
    // Get IDs for this client
    const templateId = ids.templates[clientIndex];
    const landingPageId = ids.landingPages[clientIndex];
    const poolId = ids.pools[clientIndex * 2]; // Use first pool
    const listId = ids.lists[clientIndex * 2]; // Use Hot Leads list
    
    // Create audience from contact list
    const audienceId = faker.string.uuid();
    await supabase.from('audiences').insert({
      id: audienceId,
      client_id: clientId,
      name: `${campaignTemplates[0].name} Audience`,
      source: 'manual',
      total_count: 0, // Will be updated by recipients
    });
    ids.audiences.push(audienceId);
    
    // Create 2 campaigns per client
    for (let i = 0; i < 2; i++) {
      const template = campaignTemplates[i];
      const campaignId = faker.string.uuid();
      const status = i === 0 ? 'in_production' : 'draft';
      
      await supabase.from('campaigns').insert({
        id: campaignId,
        client_id: clientId,
        name: template.name,
        status: status,
        template_id: templateId,
        landing_page_id: landingPageId,
        audience_id: audienceId,
        reward_pool_id: poolId,
        rewards_enabled: true,
        mail_date: status === 'in_production' ? generators.randomPastDate(15) : generators.randomFutureDate(30),
        drop_date: status === 'in_production' ? generators.randomPastDate(10) : generators.randomFutureDate(35),
      });
      ids.campaigns.push(campaignId);
      
      // Create campaign conditions
      await supabase.from('campaign_conditions').insert({
        id: faker.string.uuid(),
        campaign_id: campaignId,
        condition_type: 'sms_opt_in',
        is_required: true,
        trigger_reward: false,
      });
      
      await supabase.from('campaign_conditions').insert({
        id: faker.string.uuid(),
        campaign_id: campaignId,
        condition_type: 'call_verification',
        is_required: true,
        trigger_reward: true,
      });
      
      // Create reward config
      await supabase.from('campaign_reward_configs').insert({
        id: faker.string.uuid(),
        campaign_id: campaignId,
        reward_type: 'gift_card',
        reward_value: 25.00,
        delivery_method: 'sms',
      });
      
      // Add comments for active campaigns
      if (status === 'in_production') {
        await supabase.from('campaign_comments').insert({
          id: faker.string.uuid(),
          campaign_id: campaignId,
          user_id: ids.users[clientIndex + 2], // Client user
          comment_text: 'Campaign performing well! Great response rate.',
        });
      }
      
      console.log(`   ✅ ${template.name} (${status})`);
    }
  }
  
  console.log('');
}

async function seedRecipientsAndEvents() {
  console.log('📨 Creating recipients and events...');
  
  // Only create recipients for active campaigns (first campaign of each client)
  const activeCampaigns = ids.campaigns.filter((_, i) => i % 2 === 0);
  
  for (const campaignId of activeCampaigns) {
    const campaignIndex = activeCampaigns.indexOf(campaignId);
    const clientId = ids.clients[campaignIndex];
    const audienceId = ids.audiences[campaignIndex];
    
    // Get contacts for this client
    const { data: clientContacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('client_id', clientId)
      .limit(35);
    
    if (!clientContacts || clientContacts.length === 0) continue;
    
    // Create recipients
    for (let i = 0; i < Math.min(35, clientContacts.length); i++) {
      const contact = clientContacts[i];
      const recipientId = faker.string.uuid();
      
      await supabase.from('recipients').insert({
        id: recipientId,
        audience_id: audienceId,
        campaign_id: campaignId,
        ...generators.generateRecipient(contact),
        status: faker.helpers.arrayElement(['pending', 'mailed', 'delivered', 'engaged']),
      });
      
      // Create contact participation link
      await supabase.from('contact_campaign_participation').insert({
        id: faker.string.uuid(),
        contact_id: contact.id,
        campaign_id: campaignId,
        recipient_id: recipientId,
        participated_at: generators.randomPastDate(10),
      });
      
      // Create events (60% of recipients have events)
      if (Math.random() < 0.6) {
        const numEvents = faker.number.int({ min: 1, max: 4 });
        const eventTypes = faker.helpers.shuffle(constants.EVENT_TYPES).slice(0, numEvents);
        
        for (const eventType of eventTypes) {
          await supabase.from('events').insert({
            id: faker.string.uuid(),
            campaign_id: campaignId,
            recipient_id: recipientId,
            event_type: eventType,
            source: 'form',
            event_data_json: { source: 'seed_data' },
            occurred_at: generators.randomPastDate(10),
          });
        }
      }
    }
    
    console.log(`   ✅ Campaign ${campaignIndex + 1}: ${Math.min(35, clientContacts.length)} recipients`);
  }
  
  console.log('');
}

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         ACE ENGAGE - SEED DATA GENERATION                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  try {
    await clearDemoData();
    await seedOrganizations();
    await seedClients();
    await seedUsers();
    await seedGiftCards();
    await seedContacts();
    await seedTemplatesAndLandingPages();
    await seedCampaigns();
    await seedRecipientsAndEvents();
    
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ SEED DATA COMPLETE!                       ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  Organizations: ${ids.orgs.length.toString().padEnd(46)}║`);
    console.log(`║  Clients: ${ids.clients.length.toString().padEnd(52)}║`);
    console.log(`║  Users: ${ids.users.length.toString().padEnd(54)}║`);
    console.log(`║  Gift Card Brands: ${ids.brands.length.toString().padEnd(43)}║`);
    console.log(`║  Gift Card Pools: ${ids.pools.length.toString().padEnd(44)}║`);
    console.log(`║  Contacts: ${ids.contacts.length.toString().padEnd(51)}║`);
    console.log(`║  Contact Lists: ${ids.lists.length.toString().padEnd(46)}║`);
    console.log(`║  Campaigns: ${ids.campaigns.length.toString().padEnd(50)}║`);
    console.log(`║  Templates: ${ids.templates.length.toString().padEnd(50)}║`);
    console.log(`║  Landing Pages: ${ids.landingPages.length.toString().padEnd(46)}║`);
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();

