/**
 * Campaign Data Generator
 * Creates comprehensive campaign data with conditions, rewards, and configurations
 */

import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import { 
  generateCampaignTimeline,
  distributeCampaignsOverTime,
  addBusinessDays 
} from './time-simulator';
import { CAMPAIGN_STATUS_DISTRIBUTION } from './config';

export interface CampaignRecord {
  id: string;
  client_id: string;
  name: string;
  status: 'draft' | 'in_production' | 'mailed' | 'completed';
  type: string;
  mail_date?: string;
  drop_date?: string;
  created_at: string;
  template_id?: string;
  landing_page_id?: string;
  audience_id?: string;
  size?: string;
  postage?: string;
}

export interface CampaignConditionRecord {
  id: string;
  campaign_id: string;
  condition_number: number;
  condition_type: string;
  description: string;
  is_active: boolean;
}

export interface CampaignRewardConfigRecord {
  id: string;
  campaign_id: string;
  condition_number: number;
  gift_card_pool_id?: string;
  is_active: boolean;
}

export interface AudienceRecord {
  id: string;
  campaign_id: string;
  client_id: string;
  name: string;
  size: number;
  valid_count: number;
  created_at: string;
}

const CAMPAIGN_NAMES = {
  roofing: [
    'Spring Inspection Campaign',
    'Storm Damage Outreach',
    'Fall Maintenance Program',
    'New Homeowner Welcome',
    'Roof Replacement Special',
    'Emergency Repair Hotline',
    'Annual Inspection Reminder',
    'Insurance Claim Support',
  ],
  rei: [
    'Motivated Seller Outreach',
    'Property Investment Guide',
    'Foreclosure Opportunity Alert',
    'Estate Sale Notification',
    'Fast Cash Offer Campaign',
    'Fix & Flip Workshop Invite',
    'Property Valuation Offer',
    'Investor Network Invitation',
  ],
  auto_service: [
    'Oil Change Reminder',
    'Seasonal Maintenance Special',
    'Tire Rotation Campaign',
    'Brake Service Alert',
    'Vehicle Inspection Offer',
    'Fleet Maintenance Program',
    'New Customer Welcome',
    'Service Anniversary Reward',
  ],
  auto_warranty: [
    'Extended Warranty Offer',
    'Coverage Expiration Alert',
    'Protection Plan Upgrade',
    'Vehicle Protection Guide',
    'Warranty Renewal Notice',
    'Limited Time Coverage Deal',
    'Comprehensive Protection Plan',
    'Peace of Mind Campaign',
  ],
  auto_buyback: [
    'Instant Cash Offer',
    'Trade-In Value Campaign',
    'Vehicle Buyback Program',
    'Quick Sale Opportunity',
    'Fleet Buyback Special',
    'End of Lease Options',
    'Vehicle Upgrade Program',
    'Hassle-Free Sale Campaign',
  ],
};

const CONDITION_TYPES = [
  { type: 'sms_opt_in', description: 'Customer opted in via SMS', triggers_reward: false },
  { type: 'call_received', description: 'Customer called in', triggers_reward: false },
  { type: 'call_verification', description: 'Call verified and qualified', triggers_reward: true },
  { type: 'form_submitted', description: 'Online form submitted', triggers_reward: true },
  { type: 'qr_scan', description: 'QR code scanned', triggers_reward: false },
  { type: 'purl_visit', description: 'Personalized URL visited', triggers_reward: false },
  { type: 'appointment_scheduled', description: 'Appointment scheduled', triggers_reward: true },
];

/**
 * Distribute campaign statuses according to distribution weights
 */
function selectCampaignStatus(): 'draft' | 'in_production' | 'mailed' | 'completed' {
  const rand = Math.random();
  let accumulated = 0;
  
  for (const [status, probability] of Object.entries(CAMPAIGN_STATUS_DISTRIBUTION)) {
    accumulated += probability;
    if (rand < accumulated) {
      return status as any;
    }
  }
  
  return 'completed';
}

/**
 * Generate a campaign name based on industry
 */
function generateCampaignName(industry: string, index: number): string {
  const industryKey = industry as keyof typeof CAMPAIGN_NAMES;
  const names = CAMPAIGN_NAMES[industryKey] || CAMPAIGN_NAMES.roofing;
  
  if (index < names.length) {
    return names[index];
  }
  
  // Generate variation
  const baseName = names[index % names.length];
  const season = ['Spring', 'Summer', 'Fall', 'Winter'][Math.floor(Math.random() * 4)];
  return `${season} ${baseName}`;
}

/**
 * Generate campaign conditions
 */
function generateCampaignConditions(
  campaignId: string,
  includeCallCenter: boolean,
  includeGiftCards: boolean
): CampaignConditionRecord[] {
  const conditions: CampaignConditionRecord[] = [];
  
  // Base conditions for all campaigns
  const baseConditions = [
    CONDITION_TYPES[0], // SMS opt-in
    CONDITION_TYPES[1], // Call received
  ];
  
  if (includeCallCenter) {
    baseConditions.push(CONDITION_TYPES[2]); // Call verification
  }
  
  // Add random additional conditions
  if (Math.random() < 0.6) {
    baseConditions.push(CONDITION_TYPES[3]); // Form submitted
  }
  
  if (Math.random() < 0.4) {
    baseConditions.push(CONDITION_TYPES[4]); // QR scan
  }
  
  if (Math.random() < 0.5) {
    baseConditions.push(CONDITION_TYPES[5]); // PURL visit
  }
  
  baseConditions.forEach((cond, index) => {
    conditions.push({
      id: faker.string.uuid(),
      campaign_id: campaignId,
      condition_number: index + 1,
      condition_type: cond.type,
      description: cond.description,
      is_active: true,
    });
  });
  
  return conditions;
}

/**
 * Generate reward configurations
 */
function generateRewardConfigs(
  campaignId: string,
  conditions: CampaignConditionRecord[],
  giftCardPoolIds: string[]
): CampaignRewardConfigRecord[] {
  if (giftCardPoolIds.length === 0) return [];
  
  const configs: CampaignRewardConfigRecord[] = [];
  
  // Find conditions that trigger rewards
  const rewardConditions = conditions.filter(c => 
    CONDITION_TYPES.find(t => t.type === c.condition_type && t.triggers_reward)
  );
  
  if (rewardConditions.length > 0) {
    // Use first reward condition
    const condition = rewardConditions[0];
    const poolId = giftCardPoolIds[Math.floor(Math.random() * giftCardPoolIds.length)];
    
    configs.push({
      id: faker.string.uuid(),
      campaign_id: campaignId,
      condition_number: condition.condition_number,
      gift_card_pool_id: poolId,
      is_active: true,
    });
  }
  
  return configs;
}

/**
 * Generate campaigns for a client
 */
export async function generateCampaignsForClient(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  clientIndustry: string,
  count: number,
  startDate: Date,
  endDate: Date,
  templateIds: string[],
  landingPageIds: string[],
  giftCardPoolIds: string[],
  options: {
    includeCallCenter: boolean;
    includeGiftCards: boolean;
  }
): Promise<{ campaigns: CampaignRecord[]; audiences: AudienceRecord[] }> {
  const campaigns: CampaignRecord[] = [];
  const audiences: AudienceRecord[] = [];
  const conditions: CampaignConditionRecord[] = [];
  const rewardConfigs: CampaignRewardConfigRecord[] = [];
  
  // Distribute campaign creation dates
  const creationDates = distributeCampaignsOverTime(count, startDate, endDate);
  
  for (let i = 0; i < count; i++) {
    const campaignId = faker.string.uuid();
    const status = selectCampaignStatus();
    const timeline = generateCampaignTimeline(creationDates[i], status);
    const name = generateCampaignName(clientIndustry, i);
    
    // Create campaign
    const campaign: CampaignRecord = {
      id: campaignId,
      client_id: clientId,
      name,
      status,
      type: 'direct_mail',
      mail_date: timeline.mailDate.toISOString(),
      drop_date: timeline.dropDate.toISOString(),
      created_at: timeline.createdAt.toISOString(),
      template_id: templateIds.length > 0 ? templateIds[i % templateIds.length] : undefined,
      landing_page_id: landingPageIds.length > 0 ? landingPageIds[i % landingPageIds.length] : undefined,
      size: faker.helpers.arrayElement(['4x6', '6x9', '6x11']),
      postage: faker.helpers.arrayElement(['first_class', 'standard']),
    };
    
    campaigns.push(campaign);
    
    // Create audience
    const audienceSize = faker.number.int({ min: 100, max: 1000 });
    const audience: AudienceRecord = {
      id: faker.string.uuid(),
      campaign_id: campaignId,
      client_id: clientId,
      name: `${name} - Audience`,
      size: audienceSize,
      valid_count: Math.floor(audienceSize * (0.85 + Math.random() * 0.15)), // 85-100% valid
      created_at: timeline.createdAt.toISOString(),
    };
    
    audiences.push(audience);
    campaign.audience_id = audience.id;
    
    // Generate conditions
    const campaignConditions = generateCampaignConditions(
      campaignId,
      options.includeCallCenter,
      options.includeGiftCards
    );
    conditions.push(...campaignConditions);
    
    // Generate reward configs
    if (options.includeGiftCards) {
      const campaignRewards = generateRewardConfigs(
        campaignId,
        campaignConditions,
        giftCardPoolIds
      );
      rewardConfigs.push(...campaignRewards);
    }
  }
  
  // Insert campaigns
  const { error: campaignError } = await supabase
    .from('campaigns')
    .insert(campaigns);
  
  if (campaignError) throw new Error(`Failed to insert campaigns: ${campaignError.message}`);
  
  // Insert audiences
  const { error: audienceError } = await supabase
    .from('audiences')
    .insert(audiences);
  
  if (audienceError) throw new Error(`Failed to insert audiences: ${audienceError.message}`);
  
  // Insert conditions in batches
  if (conditions.length > 0) {
    const batchSize = 500;
    for (let i = 0; i < conditions.length; i += batchSize) {
      const batch = conditions.slice(i, i + batchSize);
      const { error } = await supabase
        .from('campaign_conditions')
        .insert(batch);
      
      if (error) throw new Error(`Failed to insert campaign conditions: ${error.message}`);
    }
  }
  
  // Insert reward configs
  if (rewardConfigs.length > 0) {
    const { error } = await supabase
      .from('campaign_reward_configs')
      .insert(rewardConfigs);
    
    if (error) throw new Error(`Failed to insert reward configs: ${error.message}`);
  }
  
  return { campaigns, audiences };
}

/**
 * Generate campaigns for multiple clients
 */
export async function generateAllCampaigns(
  supabase: ReturnType<typeof createClient>,
  clients: Array<{ id: string; industry: string }>,
  campaignsPerClient: number,
  startDate: Date,
  endDate: Date,
  options: {
    includeCallCenter: boolean;
    includeGiftCards: boolean;
  },
  onProgress?: (current: number, total: number) => void
): Promise<{ totalCampaigns: number; totalAudiences: number }> {
  let totalCampaigns = 0;
  let totalAudiences = 0;
  
  // Pre-fetch templates, landing pages, and gift card pools for each client
  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    
    // Get templates for this client
    const { data: templates } = await supabase
      .from('templates')
      .select('id')
      .eq('client_id', client.id);
    
    // Get landing pages for this client
    const { data: landingPages } = await supabase
      .from('landing_pages')
      .select('id')
      .eq('client_id', client.id);
    
    // Get gift card pools for this client
    const { data: giftCardPools } = await supabase
      .from('gift_card_pools')
      .select('id')
      .eq('client_id', client.id);
    
    const templateIds = templates?.map(t => t.id) || [];
    const landingPageIds = landingPages?.map(lp => lp.id) || [];
    const giftCardPoolIds = giftCardPools?.map(gcp => gcp.id) || [];
    
    // Generate campaigns for this client
    const result = await generateCampaignsForClient(
      supabase,
      client.id,
      client.industry,
      campaignsPerClient,
      startDate,
      endDate,
      templateIds,
      landingPageIds,
      giftCardPoolIds,
      options
    );
    
    totalCampaigns += result.campaigns.length;
    totalAudiences += result.audiences.length;
    
    if (onProgress) {
      onProgress(i + 1, clients.length);
    }
  }
  
  return { totalCampaigns, totalAudiences };
}

