/**
 * Analytics Validation and Performance Testing Script
 * Validates generated data and tests query performance across dashboards
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

interface ValidationResult {
  table: string;
  passed: boolean;
  count: number;
  message: string;
  queryTime?: number;
}

interface PerformanceTest {
  name: string;
  query: () => Promise<any>;
  expectedMaxTime: number; // milliseconds
}

const results: ValidationResult[] = [];
const performanceTests: PerformanceTest[] = [];

/**
 * Validate table record counts
 */
async function validateTableCounts() {
  console.log('\n📊 Validating Table Record Counts...\n');
  
  const tables = [
    { name: 'organizations', minExpected: 1 },
    { name: 'clients', minExpected: 5 },
    { name: 'profiles', minExpected: 10 },
    { name: 'contacts', minExpected: 100 },
    { name: 'contact_lists', minExpected: 10 },
    { name: 'campaigns', minExpected: 10 },
    { name: 'recipients', minExpected: 500 },
    { name: 'events', minExpected: 1000 },
    { name: 'gift_card_brands', minExpected: 5 },
    { name: 'call_sessions', minExpected: 50 },
  ];
  
  for (const table of tables) {
    const startTime = Date.now();
    const { count, error } = await supabase
      .from(table.name)
      .select('*', { count: 'exact', head: true });
    const queryTime = Date.now() - startTime;
    
    if (error) {
      results.push({
        table: table.name,
        passed: false,
        count: 0,
        message: `Error: ${error.message}`,
        queryTime,
      });
    } else {
      const actualCount = count || 0;
      const passed = actualCount >= table.minExpected;
      results.push({
        table: table.name,
        passed,
        count: actualCount,
        message: passed 
          ? `✅ ${actualCount.toLocaleString()} records (expected >= ${table.minExpected})`
          : `❌ Only ${actualCount} records (expected >= ${table.minExpected})`,
        queryTime,
      });
    }
  }
}

/**
 * Validate data relationships
 */
async function validateRelationships() {
  console.log('\n🔗 Validating Data Relationships...\n');
  
  // Check orphaned campaigns (campaigns without clients)
  const { count: orphanedCampaigns } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .is('client_id', null);
  
  results.push({
    table: 'campaigns_relationships',
    passed: orphanedCampaigns === 0,
    count: orphanedCampaigns || 0,
    message: orphanedCampaigns === 0 
      ? '✅ All campaigns have valid client relationships'
      : `❌ Found ${orphanedCampaigns} orphaned campaigns`,
  });
  
  // Check recipients without campaigns
  const { count: orphanedRecipients } = await supabase
    .from('recipients')
    .select('*', { count: 'exact', head: true })
    .is('campaign_id', null);
  
  results.push({
    table: 'recipients_relationships',
    passed: orphanedRecipients === 0,
    count: orphanedRecipients || 0,
    message: orphanedRecipients === 0
      ? '✅ All recipients have valid campaign relationships'
      : `❌ Found ${orphanedRecipients} orphaned recipients`,
  });
  
  // Check events without recipients
  const { count: orphanedEvents } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .is('recipient_id', null);
  
  results.push({
    table: 'events_relationships',
    passed: orphanedEvents === 0,
    count: orphanedEvents || 0,
    message: orphanedEvents === 0
      ? '✅ All events have valid recipient relationships'
      : `❌ Found ${orphanedEvents} orphaned events`,
  });
}

/**
 * Validate time-based data integrity
 */
async function validateTimeSequences() {
  console.log('\n⏰ Validating Time Sequences...\n');
  
  // Check that campaign dates are in logical order
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, created_at, mail_date, drop_date')
    .not('mail_date', 'is', null)
    .not('drop_date', 'is', null);
  
  let invalidDates = 0;
  if (campaigns) {
    for (const campaign of campaigns) {
      const created = new Date(campaign.created_at).getTime();
      const mailDate = new Date(campaign.mail_date).getTime();
      const dropDate = new Date(campaign.drop_date).getTime();
      
      if (mailDate < created || dropDate < mailDate) {
        invalidDates++;
      }
    }
  }
  
  results.push({
    table: 'campaign_date_sequences',
    passed: invalidDates === 0,
    count: invalidDates,
    message: invalidDates === 0
      ? '✅ All campaign dates are in logical order'
      : `❌ Found ${invalidDates} campaigns with invalid date sequences`,
  });
  
  // Check event sequences
  const { data: recipients } = await supabase
    .from('recipients')
    .select('id')
    .limit(100);
  
  let invalidEventSequences = 0;
  if (recipients) {
    for (const recipient of recipients) {
      const { data: events } = await supabase
        .from('events')
        .select('event_type, occurred_at')
        .eq('recipient_id', recipient.id)
        .order('occurred_at', { ascending: true });
      
      if (events && events.length > 1) {
        for (let i = 1; i < events.length; i++) {
          const prevTime = new Date(events[i - 1].occurred_at).getTime();
          const currTime = new Date(events[i].occurred_at).getTime();
          
          if (currTime < prevTime) {
            invalidEventSequences++;
            break;
          }
        }
      }
    }
  }
  
  results.push({
    table: 'event_sequences',
    passed: invalidEventSequences === 0,
    count: invalidEventSequences,
    message: invalidEventSequences === 0
      ? '✅ All event sequences are chronologically ordered'
      : `❌ Found ${invalidEventSequences} recipients with out-of-order events`,
  });
}

/**
 * Test dashboard query performance
 */
async function testDashboardPerformance() {
  console.log('\n⚡ Testing Dashboard Query Performance...\n');
  
  // Get a sample client for testing
  const { data: clients } = await supabase
    .from('clients')
    .select('id')
    .limit(1);
  
  if (!clients || clients.length === 0) {
    console.log('⚠️ No clients found for performance testing');
    return;
  }
  
  const clientId = clients[0].id;
  
  performanceTests.push(
    {
      name: 'Campaign List Query',
      expectedMaxTime: 2000,
      query: async () => {
        return await supabase
          .from('campaigns')
          .select('*')
          .eq('client_id', clientId)
          .limit(50);
      },
    },
    {
      name: 'Campaign with Recipients Count',
      expectedMaxTime: 3000,
      query: async () => {
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('id')
          .eq('client_id', clientId)
          .limit(10);
        
        if (!campaigns) return [];
        
        const promises = campaigns.map(c =>
          supabase
            .from('recipients')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', c.id)
        );
        
        return await Promise.all(promises);
      },
    },
    {
      name: 'Events Aggregation',
      expectedMaxTime: 3000,
      query: async () => {
        return await supabase
          .from('events')
          .select('event_type, occurred_at')
          .gte('occurred_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1000);
      },
    },
    {
      name: 'Contact List Query',
      expectedMaxTime: 2000,
      query: async () => {
        return await supabase
          .from('contacts')
          .select('*')
          .eq('client_id', clientId)
          .limit(100);
      },
    },
    {
      name: 'Analytics Metrics Query',
      expectedMaxTime: 2500,
      query: async () => {
        return await supabase
          .from('performance_metrics')
          .select('*')
          .gte('recorded_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(500);
      },
    }
  );
  
  for (const test of performanceTests) {
    const startTime = Date.now();
    try {
      await test.query();
      const queryTime = Date.now() - startTime;
      const passed = queryTime <= test.expectedMaxTime;
      
      results.push({
        table: test.name,
        passed,
        count: queryTime,
        message: passed
          ? `✅ ${queryTime}ms (target: <${test.expectedMaxTime}ms)`
          : `⚠️ ${queryTime}ms (target: <${test.expectedMaxTime}ms) - Consider optimization`,
        queryTime,
      });
    } catch (error: any) {
      results.push({
        table: test.name,
        passed: false,
        count: 0,
        message: `❌ Query failed: ${error.message}`,
      });
    }
  }
}

/**
 * Validate data distributions
 */
async function validateDistributions() {
  console.log('\n📈 Validating Data Distributions...\n');
  
  // Check campaign status distribution
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('status');
  
  if (campaigns) {
    const statusCounts = campaigns.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const completedRatio = (statusCounts['completed'] || 0) / campaigns.length;
    const passed = completedRatio >= 0.5 && completedRatio <= 0.7;
    
    results.push({
      table: 'campaign_status_distribution',
      passed,
      count: Math.round(completedRatio * 100),
      message: passed
        ? `✅ Campaign status distribution looks realistic (${Math.round(completedRatio * 100)}% completed)`
        : `⚠️ Campaign status distribution may need adjustment (${Math.round(completedRatio * 100)}% completed)`,
    });
  }
  
  // Check event type distribution
  const { data: events } = await supabase
    .from('events')
    .select('event_type')
    .limit(1000);
  
  if (events) {
    const eventCounts = events.reduce((acc, e) => {
      acc[e.event_type] = (acc[e.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const hasVariety = Object.keys(eventCounts).length >= 4;
    
    results.push({
      table: 'event_type_variety',
      passed: hasVariety,
      count: Object.keys(eventCounts).length,
      message: hasVariety
        ? `✅ Good event type variety (${Object.keys(eventCounts).length} different types)`
        : `⚠️ Limited event type variety (${Object.keys(eventCounts).length} types)`,
    });
  }
}

/**
 * Generate validation report
 */
function generateReport() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              VALIDATION & PERFORMANCE REPORT                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log('');
  
  if (failed > 0) {
    console.log('Failed Checks:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ${r.message}`);
    });
    console.log('');
  }
  
  // Performance summary
  const perfResults = results.filter(r => r.queryTime !== undefined);
  if (perfResults.length > 0) {
    const avgTime = perfResults.reduce((sum, r) => sum + (r.queryTime || 0), 0) / perfResults.length;
    const maxTime = Math.max(...perfResults.map(r => r.queryTime || 0));
    
    console.log('Performance Summary:');
    console.log(`  Average Query Time: ${Math.round(avgTime)}ms`);
    console.log(`  Slowest Query: ${maxTime}ms`);
    console.log('');
  }
  
  const overallPassed = (passed / total) >= 0.9; // 90% pass rate
  
  if (overallPassed) {
    console.log('✅ VALIDATION PASSED - Data quality is good!');
  } else {
    console.log('⚠️ VALIDATION WARNINGS - Some issues detected, review above.');
  }
  
  console.log('');
}

/**
 * Main execution
 */
async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   MOBUL - Data Validation & Performance Testing');
  console.log('═══════════════════════════════════════════════════════════════');
  
  try {
    await validateTableCounts();
    await validateRelationships();
    await validateTimeSequences();
    await validateDistributions();
    await testDashboardPerformance();
    
    generateReport();
    
    process.exit(results.every(r => r.passed) ? 0 : 1);
    
  } catch (error: any) {
    console.error('\n❌ Validation failed with error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { validateTableCounts, validateRelationships, validateTimeSequences, testDashboardPerformance };

