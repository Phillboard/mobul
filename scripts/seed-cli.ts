/**
 * Interactive CLI for Seed Data Generation
 * Provides a user-friendly command-line interface for generating seed data
 */

import { createInterface } from 'readline';
import { SeedDataOrchestrator } from './seed-all-data';
import { 
  SeedConfig, 
  SCENARIO_PRESETS, 
  ScenarioType,
  estimateRecordCounts 
} from './seed-data/config';

const readline = createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => {
    readline.question(query, resolve);
  });
}

function displayBanner() {
  console.clear();
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║       ACE ENGAGE - SEED DATA GENERATION CLI                   ║');
  console.log('║       Interactive Data Generation Tool                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
}

function displayScenarioMenu() {
  console.log('📋 Available Scenarios:');
  console.log('');
  console.log('1. Demo - Small dataset for presentations');
  console.log('   • 2 organizations, 6 clients');
  console.log('   • 300 contacts, 18 campaigns');
  console.log('   • Perfect for demos and quick testing');
  console.log('');
  console.log('2. Development - Medium dataset for feature development');
  console.log('   • 5 organizations, 20 clients');
  console.log('   • 5,000 contacts, 100 campaigns');
  console.log('   • 3 months of historical data');
  console.log('');
  console.log('3. Analytics - Large dataset with rich time-series');
  console.log('   • 12 organizations, 60 clients');
  console.log('   • 60,000 contacts, 480 campaigns');
  console.log('   • 6 months of historical data');
  console.log('   • Full analytics and metrics');
  console.log('');
  console.log('4. Load Test - Massive dataset for performance testing');
  console.log('   • 15 organizations, 100 clients');
  console.log('   • 200,000 contacts, 1,000 campaigns');
  console.log('   • 12 months of historical data');
  console.log('   • Full feature set');
  console.log('');
  console.log('5. Custom - Configure your own scenario');
  console.log('');
}

async function selectScenario(): Promise<SeedConfig> {
  displayScenarioMenu();
  
  const choice = await question('Select a scenario (1-5): ');
  
  switch (choice.trim()) {
    case '1':
      return { ...SCENARIO_PRESETS.demo };
    case '2':
      return { ...SCENARIO_PRESETS.development };
    case '3':
      return { ...SCENARIO_PRESETS.analytics };
    case '4':
      return { ...SCENARIO_PRESETS.load_test };
    case '5':
      return await configureCustomScenario();
    default:
      console.log('❌ Invalid choice. Using development scenario.');
      return { ...SCENARIO_PRESETS.development };
  }
}

async function configureCustomScenario(): Promise<SeedConfig> {
  console.log('\n🔧 Custom Scenario Configuration\n');
  
  const organizations = parseInt(await question('Number of organizations (5-15): ') || '5');
  const clients = parseInt(await question('Number of clients (10-100): ') || '20');
  const contactsPerClient = parseInt(await question('Contacts per client (100-2000): ') || '500');
  const campaignsPerClient = parseInt(await question('Campaigns per client (3-10): ') || '5');
  const months = parseInt(await question('Historical time range in months (1-12): ') || '6');
  
  console.log('\n📦 Features to include:');
  const includeCallCenter = (await question('Include call center data? (y/n): ')).toLowerCase() === 'y';
  const includeGiftCards = (await question('Include gift cards? (y/n): ')).toLowerCase() === 'y';
  const includeAnalytics = (await question('Include analytics & metrics? (y/n): ')).toLowerCase() === 'y';
  const includeErrors = (await question('Include error logs? (y/n): ')).toLowerCase() === 'y';
  
  return {
    scenario: 'development',
    timeRange: { months },
    scale: {
      organizations,
      clients,
      usersPerOrg: 5,
      contactsPerClient,
      listsPerClient: Math.ceil(contactsPerClient / 100),
      campaignsPerClient,
      recipientsPerCampaign: Math.ceil(contactsPerClient / campaignsPerClient),
      giftCardBrands: 20,
      giftCardInventorySize: clients * 100,
    },
    features: {
      includeCallCenter,
      includeGiftCards,
      includeAnalytics,
      includeErrors,
      includeHistoricalData: months > 1,
    },
    performance: {
      batchSize: 1000,
      parallelBatches: 3,
      checkpointInterval: 10000,
    },
  };
}

function displayEstimates(config: SeedConfig) {
  const estimates = estimateRecordCounts(config);
  const totalRecords = Object.values(estimates).reduce((a, b) => a + b, 0);
  const estimatedTime = Math.ceil(totalRecords / 5000); // Rough estimate: 5000 records/minute
  
  console.log('\n📊 Estimated Generation:');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Total Records:      ${totalRecords.toLocaleString()}`);
  console.log(`Organizations:      ${estimates.organizations.toLocaleString()}`);
  console.log(`Clients:            ${estimates.clients.toLocaleString()}`);
  console.log(`Users:              ${estimates.users.toLocaleString()}`);
  console.log(`Contacts:           ${estimates.contacts.toLocaleString()}`);
  console.log(`Campaigns:          ${estimates.campaigns.toLocaleString()}`);
  console.log(`Recipients:         ${estimates.recipients.toLocaleString()}`);
  console.log(`Events:             ${estimates.events.toLocaleString()}`);
  
  if (config.features.includeCallCenter) {
    console.log(`Call Sessions:      ${estimates.callSessions.toLocaleString()}`);
    console.log(`SMS Opt-ins:        ${estimates.smsOptIns.toLocaleString()}`);
  }
  
  if (config.features.includeGiftCards) {
    console.log(`Gift Card Brands:   ${estimates.giftCardBrands.toLocaleString()}`);
    console.log(`Gift Card Inventory: ${estimates.giftCardInventory.toLocaleString()}`);
    console.log(`Billing Transactions: ${estimates.billingTransactions.toLocaleString()}`);
  }
  
  if (config.features.includeAnalytics) {
    console.log(`Performance Metrics: ${estimates.performanceMetrics.toLocaleString()}`);
    console.log(`Usage Analytics:    ${estimates.usageAnalytics.toLocaleString()}`);
  }
  
  console.log('═══════════════════════════════════════════════════');
  console.log(`Estimated Time:     ${estimatedTime} minutes`);
  console.log('');
}

async function confirmGeneration(): Promise<boolean> {
  console.log('⚠️  WARNING: This will DELETE all existing data and regenerate.');
  console.log('   Make sure you have a backup if needed!');
  console.log('');
  
  const confirm = await question('Proceed with generation? (yes/no): ');
  return confirm.toLowerCase() === 'yes';
}

async function main() {
  try {
    displayBanner();
    
    console.log('Welcome to the ACE Engage Seed Data Generation Tool!');
    console.log('This tool will help you generate realistic test data for development,');
    console.log('testing, analytics validation, and demonstrations.');
    console.log('');
    
    const proceed = await question('Continue? (y/n): ');
    if (proceed.toLowerCase() !== 'y') {
      console.log('Cancelled.');
      readline.close();
      return;
    }
    
    // Select scenario
    const config = await selectScenario();
    
    // Display estimates
    displayEstimates(config);
    
    // Confirm
    const confirmed = await confirmGeneration();
    if (!confirmed) {
      console.log('❌ Cancelled by user.');
      readline.close();
      return;
    }
    
    readline.close();
    
    // Execute generation
    console.log('');
    console.log('🚀 Starting seed data generation...');
    console.log('   This may take several minutes depending on the scale.');
    console.log('');
    
    const orchestrator = new SeedDataOrchestrator(config);
    const stats = await orchestrator.execute();
    
    console.log('');
    console.log('✅ Seed data generation completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Run the validation script to verify data integrity');
    console.log('  2. Check the dashboards to see the generated data');
    console.log('  3. Test your features with realistic data');
    console.log('');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    readline.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

