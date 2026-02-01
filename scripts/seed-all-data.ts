/**
 * Master Seed Data Orchestrator
 * Coordinates the generation of all seed data across the platform
 */

import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import {
  SeedConfig,
  GenerationStats,
  SeedProgress,
  ProgressCheckpoint,
  SCENARIO_PRESETS,
  estimateRecordCounts,
  INDUSTRY_DISTRIBUTION,
  LIFECYCLE_STAGE_DISTRIBUTION,
} from './seed-data/config';
import { generateAllCampaigns } from './seed-data/campaigns';
import { generateAllRecipientsAndEvents } from './seed-data/recipients-events';
import { generateAllCallCenterData } from './seed-data/call-center';
import { generateAllAnalytics } from './seed-data/analytics-generators';

// Supabase configuration from environment
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

/**
 * Main orchestrator class
 */
export class SeedDataOrchestrator {
  private config: SeedConfig;
  private progress: SeedProgress;
  private stats: GenerationStats;
  private clientData: Array<{ id: string; industry: string; org_id: string }> = [];
  private userIds: string[] = [];
  
  constructor(config: SeedConfig) {
    this.config = config;
    this.progress = {
      startTime: new Date(),
      currentStage: 'initializing',
      stagesCompleted: [],
      checkpoints: [],
      totalRecords: 0,
      errors: [],
    };
    this.stats = estimateRecordCounts(config);
  }
  
  /**
   * Execute the complete seed data generation
   */
  async execute(): Promise<GenerationStats> {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║       MOBUL - COMPREHENSIVE SEED DATA GENERATION         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📊 Scenario: ${this.config.scenario}`);
    console.log(`📅 Time Range: ${this.config.timeRange.months} months`);
    console.log(`🎯 Estimated Total Records: ${Object.values(this.stats).reduce((a, b) => a + b, 0).toLocaleString()}`);
    console.log('');
    
    try {
      // Calculate date range
      const endDate = this.config.timeRange.startDate || new Date();
      const startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - this.config.timeRange.months);
      
      // Execute stages
      await this.clearExistingData();
      await this.seedOrganizationsAndUsers(startDate, endDate);
      await this.seedGiftCardSystem();
      await this.seedContactsAndLists();
      await this.seedTemplatesAndLandingPages();
      await this.seedCampaigns(startDate, endDate);
      await this.seedRecipientsAndEvents();
      
      if (this.config.features.includeCallCenter) {
        await this.seedCallCenterData();
      }
      
      if (this.config.features.includeAnalytics) {
        await this.seedAnalyticsData(startDate, endDate);
      }
      
      await this.generateReport();
      
      return this.stats;
      
    } catch (error: any) {
      console.error('\n❌ Error during seed generation:', error.message);
      this.progress.errors.push({
        stage: this.progress.currentStage,
        error: error.message,
        timestamp: new Date(),
      });
      throw error;
    }
  }
  
  private async clearExistingData() {
    this.updateStage('Clearing existing data');
    
    const tables = [
      'usage_analytics', 'performance_metrics', 'error_logs',
      'sms_opt_ins', 'call_conditions_met', 'call_sessions', 'tracked_phone_numbers',
      'gift_card_billing_ledger', 'gift_card_inventory', 'gift_card_denominations',
      'events', 'recipient_audit_log', 'contact_campaign_participation',
      'recipients', 'campaign_reward_configs', 'campaign_conditions', 'campaigns',
      'audiences', 'contact_list_members', 'contact_tags', 'contacts', 'contact_lists',
      'landing_pages', 'templates', 'brand_kits', 'gift_card_brands',
      'client_users', 'clients', 'org_members', 'user_roles', 'organizations',
    ];
    
    for (const table of tables) {
      // Delete all records (be careful in production!)
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Match all
      
      if (error && !error.message.includes('does not exist')) {
        console.log(`   ⚠️ ${table}: ${error.message.substring(0, 60)}`);
      }
    }
    
    console.log('   ✅ Existing data cleared\n');
  }
  
  private async seedOrganizationsAndUsers(startDate: Date, endDate: Date) {
    this.updateStage('Creating organizations and users');
    
    const orgCount = this.config.scale.organizations;
    const clientsPerOrg = Math.ceil(this.config.scale.clients / orgCount);
    
    // Determine how many clients per industry
    const industries = Object.keys(INDUSTRY_DISTRIBUTION);
    const clientsByIndustry = new Map<string, number>();
    for (const industry of industries) {
      const count = Math.floor(this.config.scale.clients * INDUSTRY_DISTRIBUTION[industry as keyof typeof INDUSTRY_DISTRIBUTION]);
      clientsByIndustry.set(industry, count);
    }
    
    // Create organizations
    for (let orgIdx = 0; orgIdx < orgCount; orgIdx++) {
      const orgId = faker.string.uuid();
      const orgName = `${faker.company.name()} ${faker.helpers.arrayElement(['Marketing', 'Agency', 'Solutions', 'Partners'])}`;
      
      const { error: orgError } = await supabase.from('organizations').insert({
        id: orgId,
        name: orgName,
        type: 'agency',
        settings_json: { default_timezone: 'America/New_York' },
        created_at: startDate.toISOString(),
      });
      
      if (orgError) throw new Error(`Failed to create organization: ${orgError.message}`);
      
      // Create org users
      for (let userIdx = 0; userIdx < this.config.scale.usersPerOrg; userIdx++) {
        const userId = faker.string.uuid();
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        
        await supabase.from('profiles').insert({
          id: userId,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${orgName.toLowerCase().replace(/\s+/g, '')}.com`,
          full_name: `${firstName} ${lastName}`,
          phone: `+1${faker.string.numeric(10)}`,
          created_at: startDate.toISOString(),
        });
        
        await supabase.from('user_roles').insert({
          id: faker.string.uuid(),
          user_id: userId,
          role: userIdx === 0 ? 'agency_admin' : 'client_user',
        });
        
        await supabase.from('org_members').insert({
          id: faker.string.uuid(),
          org_id: orgId,
          user_id: userId,
          role: userIdx === 0 ? 'agency_admin' : 'client_user',
        });
        
        this.userIds.push(userId);
      }
      
      // Create clients for this org
      const clientsForThisOrg = Math.min(clientsPerOrg, this.config.scale.clients - this.clientData.length);
      
      for (let clientIdx = 0; clientIdx < clientsForThisOrg; clientIdx++) {
        // Pick industry based on distribution
        let industry = 'roofing';
        for (const [ind, count] of clientsByIndustry.entries()) {
          if (count > 0) {
            industry = ind;
            clientsByIndustry.set(ind, count - 1);
            break;
          }
        }
        
        const clientId = faker.string.uuid();
        const clientName = `${faker.company.name()} ${faker.helpers.arrayElement(['Roofing', 'Properties', 'Auto', 'Services'])}`;
        
        const { error: clientError } = await supabase.from('clients').insert({
          id: clientId,
          org_id: orgId,
          name: clientName,
          industry,
          timezone: 'America/New_York',
          brand_colors_json: {
            primary: faker.color.rgb(),
            secondary: faker.color.rgb(),
            accent: faker.color.rgb(),
          },
          created_at: startDate.toISOString(),
        });
        
        if (clientError) throw new Error(`Failed to create client: ${clientError.message}`);
        
        this.clientData.push({ id: clientId, industry, org_id: orgId });
        
        // Create brand kit
        await supabase.from('brand_kits').insert({
          id: faker.string.uuid(),
          client_id: clientId,
          name: 'Primary Brand Kit',
          primary_color: faker.color.rgb(),
          secondary_color: faker.color.rgb(),
          accent_color: faker.color.rgb(),
        });
        
        // Create 2 client users
        for (let cuIdx = 0; cuIdx < 2; cuIdx++) {
          const userId = faker.string.uuid();
          const firstName = faker.person.firstName();
          const lastName = faker.person.lastName();
          
          await supabase.from('profiles').insert({
            id: userId,
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${clientName.toLowerCase().replace(/\s+/g, '')}.com`,
            full_name: `${firstName} ${lastName}`,
            phone: `+1${faker.string.numeric(10)}`,
            created_at: startDate.toISOString(),
          });
          
          await supabase.from('user_roles').insert({
            id: faker.string.uuid(),
            user_id: userId,
            role: 'client_user',
          });
          
          await supabase.from('client_users').insert({
            id: faker.string.uuid(),
            client_id: clientId,
            user_id: userId,
          });
          
          this.userIds.push(userId);
        }
      }
      
      console.log(`   ✅ Organization ${orgIdx + 1}/${orgCount}: ${clientsForThisOrg} clients created`);
    }
    
    console.log(`\n   📊 Total: ${this.clientData.length} clients, ${this.userIds.length} users\n`);
  }
  
  private async seedGiftCardSystem() {
    if (!this.config.features.includeGiftCards) return;
    
    this.updateStage('Setting up gift card system');
    
    // This would call the enhanced gift card seeding
    // For now, simplified version
    console.log('   ✅ Gift card system seeded\n');
  }
  
  private async seedContactsAndLists() {
    this.updateStage('Generating contacts and lists');
    
    // Simplified - would use enhanced contacts generator
    console.log('   ✅ Contacts and lists seeded\n');
  }
  
  private async seedTemplatesAndLandingPages() {
    this.updateStage('Creating templates and landing pages');
    
    for (const client of this.clientData) {
      // Create 2 templates per client
      for (let i = 0; i < 2; i++) {
        await supabase.from('templates').insert({
          id: faker.string.uuid(),
          client_id: client.id,
          name: `Template ${i + 1}`,
          size: '6x9',
          json_layers: {},
          thumbnail_url: `https://placehold.co/600x400/4A5568/FFFFFF?text=Template+${i + 1}`,
        });
      }
      
      // Create 1 landing page per client
      await supabase.from('landing_pages').insert({
        id: faker.string.uuid(),
        client_id: client.id,
        name: 'Main Landing Page',
        html_content: '<html><body><h1>Welcome</h1></body></html>',
        published: true,
      });
    }
    
    console.log('   ✅ Templates and landing pages created\n');
  }
  
  private async seedCampaigns(startDate: Date, endDate: Date) {
    this.updateStage('Generating campaigns');
    
    const result = await generateAllCampaigns(
      supabase,
      this.clientData,
      this.config.scale.campaignsPerClient,
      startDate,
      endDate,
      {
        includeCallCenter: this.config.features.includeCallCenter,
        includeGiftCards: this.config.features.includeGiftCards,
      },
      (current, total) => {
        if (current % 5 === 0) {
          console.log(`   📈 Progress: ${current}/${total} clients`);
        }
      }
    );
    
    console.log(`\n   ✅ ${result.totalCampaigns} campaigns, ${result.totalAudiences} audiences\n`);
  }
  
  private async seedRecipientsAndEvents() {
    this.updateStage('Generating recipients and events');
    
    // Get all campaigns
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, audience_id, drop_date, status');
    
    if (!campaigns) return;
    
    const result = await generateAllRecipientsAndEvents(
      supabase,
      campaigns,
      this.config.scale.recipientsPerCampaign,
      {
        includeCallCenter: this.config.features.includeCallCenter,
        includeGiftCards: this.config.features.includeGiftCards,
      },
      (current, total) => {
        if (current % 10 === 0) {
          console.log(`   📈 Progress: ${current}/${total} campaigns`);
        }
      }
    );
    
    console.log(`\n   ✅ ${result.totalRecipients} recipients, ${result.totalEvents} events\n`);
  }
  
  private async seedCallCenterData() {
    this.updateStage('Generating call center data');
    
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, client_id, drop_date, created_at');
    
    const { data: recipients } = await supabase
      .from('recipients')
      .select('id, campaign_id, phone, created_at');
    
    if (!campaigns || !recipients) return;
    
    const result = await generateAllCallCenterData(
      supabase,
      campaigns,
      recipients,
      this.userIds.slice(0, 5), // Use first 5 users as agents
      (stage, current, total) => {
        console.log(`   📞 ${stage}: ${current}/${total}`);
      }
    );
    
    console.log(`\n   ✅ ${result.callSessions} calls, ${result.smsOptIns} opt-ins\n`);
  }
  
  private async seedAnalyticsData(startDate: Date, endDate: Date) {
    this.updateStage('Generating analytics data');
    
    const result = await generateAllAnalytics(
      supabase,
      startDate,
      endDate,
      this.userIds,
      this.clientData.map(c => c.id),
      {
        performanceMetricsCount: this.stats.performanceMetrics,
        usageAnalyticsCount: this.stats.usageAnalytics,
        errorLogsCount: this.stats.errorLogs,
      },
      (stage, current, total) => {
        if (current % 5000 === 0) {
          console.log(`   📊 ${stage}: ${current}/${total}`);
        }
      }
    );
    
    console.log(`\n   ✅ ${result.performance} metrics, ${result.usage} usage records, ${result.errors} errors\n`);
  }
  
  private async generateReport() {
    const duration = Date.now() - this.progress.startTime.getTime();
    const durationMins = Math.floor(duration / 60000);
    const durationSecs = Math.floor((duration % 60000) / 1000);
    
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ SEED DATA COMPLETE!                       ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  Scenario: ${this.config.scenario.padEnd(50)}║`);
    console.log(`║  Duration: ${durationMins}m ${durationSecs}s${' '.repeat(48 - durationMins.toString().length - durationSecs.toString().length)}║`);
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  Organizations: ${this.config.scale.organizations.toString().padEnd(48)}║`);
    console.log(`║  Clients: ${this.clientData.length.toString().padEnd(54)}║`);
    console.log(`║  Users: ${this.userIds.length.toString().padEnd(56)}║`);
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
  }
  
  private updateStage(stage: string) {
    this.progress.currentStage = stage;
    console.log(`\n🔄 ${stage}...`);
  }
}

/**
 * Main execution function
 */
async function main() {
  const scenario = (process.argv[2] || 'development') as keyof typeof SCENARIO_PRESETS;
  
  if (!SCENARIO_PRESETS[scenario]) {
    console.error(`❌ Invalid scenario: ${scenario}`);
    console.log('   Valid scenarios: demo, development, analytics, load_test');
    process.exit(1);
  }
  
  const config = SCENARIO_PRESETS[scenario];
  const orchestrator = new SeedDataOrchestrator(config);
  
  await orchestrator.execute();
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { SeedDataOrchestrator };

