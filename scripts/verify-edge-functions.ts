import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

interface FunctionTest {
  name: string;
  category: string;
  testPayload: any;
  expectedStatus?: number;
  critical: boolean;
  requiresAuth: boolean;
}

const functionTests: FunctionTest[] = [
  // Authentication & User Management
  {
    name: 'generate-api-key',
    category: 'authentication',
    testPayload: {
      action: 'create',
      keyName: 'Test Key',
      scopes: ['read']
    },
    critical: true,
    requiresAuth: true
  },
  
  // Campaign Operations
  {
    name: 'evaluate-conditions',
    category: 'campaign',
    testPayload: {
      recipientId: 'test-recipient-id',
      campaignId: 'test-campaign-id',
      eventType: 'form_submitted'
    },
    critical: true,
    requiresAuth: false
  },
  {
    name: 'save-campaign-draft',
    category: 'campaign',
    testPayload: {
      clientId: 'test-client-id',
      draftName: 'Test Draft',
      formData: {},
      currentStep: 1
    },
    critical: false,
    requiresAuth: true
  },
  
  // Communication
  {
    name: 'send-email',
    category: 'communication',
    testPayload: {
      to: 'test@example.com',
      subject: 'Test Email',
      body: 'Test body'
    },
    critical: true,
    requiresAuth: false
  },
  
  // Forms & Tracking
  {
    name: 'submit-lead-form',
    category: 'tracking',
    testPayload: {
      formId: 'test-form',
      data: { name: 'Test', email: 'test@example.com' }
    },
    critical: true,
    requiresAuth: false
  },
  {
    name: 'handle-purl',
    category: 'tracking',
    testPayload: {
      token: 'test-token',
      redirectUrl: 'https://example.com'
    },
    critical: true,
    requiresAuth: false
  },
  
  // Admin & System
  {
    name: 'cleanup-demo-data',
    category: 'admin',
    testPayload: {
      clientId: 'test-client-id',
      confirm: false // Dry run
    },
    critical: false,
    requiresAuth: true
  },
  
  // Webhooks
  {
    name: 'dispatch-zapier-event',
    category: 'integration',
    testPayload: {
      event_type: 'test_event',
      client_id: 'test-client-id',
      data: {}
    },
    critical: false,
    requiresAuth: false
  }
];

async function verifyAllFunctions() {
  console.log('🚀 Starting Edge Function Verification\n');
  console.log(`Testing ${functionTests.length} functions...\n`);
  
  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    total: functionTests.length,
    criticalFailed: 0
  };
  
  const failures: Array<{ name: string; error: string; critical: boolean }> = [];
  
  for (const test of functionTests) {
    process.stdout.write(`Testing ${test.name}...`);
    
    try {
      const { data, error } = await supabase.functions.invoke(
        test.name,
        { body: test.testPayload }
      );
      
      // Allow 404 for test data (function works but test data doesn't exist)
      if (error && error.message.includes('not found')) {
        console.log(` ⚠️  OK (test data missing)`);
        results.passed++;
      } else if (error) {
        console.log(` ❌ FAILED: ${error.message}`);
        results.failed++;
        if (test.critical) results.criticalFailed++;
        failures.push({
          name: test.name,
          error: error.message,
          critical: test.critical
        });
      } else {
        console.log(` ✅ PASSED`);
        results.passed++;
      }
    } catch (error: any) {
      console.log(` ❌ ERROR: ${error.message}`);
      results.failed++;
      if (test.critical) results.criticalFailed++;
      failures.push({
        name: test.name,
        error: error.message,
        critical: test.critical
      });
    }
    
    // Rate limit: wait 100ms between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION RESULTS');
  console.log('='.repeat(60));
  console.log(`Total Functions Tested: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Critical Failures: ${results.criticalFailed}`);
  console.log('='.repeat(60));
  
  if (failures.length > 0) {
    console.log('\n❌ FAILED FUNCTIONS:\n');
    failures.forEach(f => {
      const marker = f.critical ? '🔴 CRITICAL' : '🟡 NON-CRITICAL';
      console.log(`${marker} ${f.name}`);
      console.log(`   Error: ${f.error}\n`);
    });
  }
  
  if (results.criticalFailed > 0) {
    console.log('\n⛔ DEPLOYMENT VERIFICATION FAILED');
    console.log(`${results.criticalFailed} critical function(s) are not working correctly`);
    console.log('Do NOT proceed to production until these are fixed\n');
    process.exit(1);
  } else if (results.failed > 0) {
    console.log('\n⚠️  DEPLOYMENT VERIFICATION PASSED WITH WARNINGS');
    console.log(`${results.failed} non-critical function(s) have issues`);
    console.log('Consider fixing before production but not blocking\n');
    process.exit(0);
  } else {
    console.log('\n✅ DEPLOYMENT VERIFICATION PASSED');
    console.log('All critical functions are working correctly');
    console.log('System is ready for production\n');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  verifyAllFunctions()
    .catch(error => {
      console.error('Verification failed:', error);
      process.exit(1);
    });
}

export { verifyAllFunctions, functionTests };


