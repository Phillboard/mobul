import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function testAlertSystem() {
  console.log('🧪 Testing Alert System\n');
  console.log('='.repeat(60));
  
  const results = {
    passed: 0,
    failed: 0
  };
  
  // Test 1: Create test alert
  console.log('\n📝 Test 1: Creating test alert in database...');
  try {
    const { data: alert, error } = await supabase
      .from('system_alerts')
      .insert({
        alert_type: 'test_alert',
        title: 'Test Alert',
        message: 'This is a test alert from the monitoring system',
        severity: 'info',
        metadata: { test: true, timestamp: new Date().toISOString() }
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log(`✅ Alert created successfully (ID: ${alert.id})`);
    results.passed++;
    
    // Cleanup
    await supabase.from('system_alerts').delete().eq('id', alert.id);
    
  } catch (error: any) {
    console.log(`❌ FAILED: ${error.message}`);
    results.failed++;
  }
  
  // Test 2: Send email alert
  console.log('\n📧 Test 2: Testing email alert delivery...');
  try {
    const { data, error } = await supabase.functions.invoke(
      'send-alert-notification',
      {
        body: {
          severity: 'info',
          title: 'Test Email Alert',
          message: 'This is a test email from the ACE Engage alerting system. If you receive this, email alerts are configured correctly.',
          category: 'system_test'
        }
      }
    );
    
    if (error) throw error;
    
    console.log('✅ Email alert function executed');
    console.log('   Check your inbox at: ' + process.env.ALERT_EMAIL_RECIPIENTS);
    results.passed++;
    
  } catch (error: any) {
    console.log(`❌ FAILED: ${error.message}`);
    console.log('   Make sure ALERT_EMAIL_RECIPIENTS and RESEND_API_KEY are set');
    results.failed++;
  }
  
  // Test 3: Send Slack alert (if configured)
  console.log('\n📱 Test 3: Testing Slack alert delivery...');
  const slackWebhook = process.env.ALERT_SLACK_WEBHOOK_URL;
  
  if (slackWebhook) {
    try {
      const response = await fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '🧪 Test Alert from ACE Engage',
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '🧪 Test Alert'
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: 'This is a test alert from the ACE Engage monitoring system. If you see this, Slack alerts are configured correctly.'
              }
            },
            {
              type: 'context',
              elements: [{
                type: 'mrkdwn',
                text: `Sent at: ${new Date().toISOString()}`
              }]
            }
          ]
        })
      });
      
      if (response.ok) {
        console.log('✅ Slack alert sent successfully');
        console.log('   Check your Slack #alerts channel');
        results.passed++;
      } else {
        throw new Error(`Slack API returned ${response.status}`);
      }
      
    } catch (error: any) {
      console.log(`❌ FAILED: ${error.message}`);
      results.failed++;
    }
  } else {
    console.log('⏭️  SKIPPED: ALERT_SLACK_WEBHOOK_URL not configured');
  }
  
  // Test 4: Check error tracking
  console.log('\n🔍 Test 4: Testing error logging...');
  try {
    const { data: testError, error } = await supabase
      .from('error_logs')
      .insert({
        severity: 'low',
        category: 'system',
        message: 'Test error from alert system test',
        error_details: { test: true }
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log(`✅ Error logged successfully (ID: ${testError.id})`);
    results.passed++;
    
    // Cleanup
    await supabase.from('error_logs').delete().eq('id', testError.id);
    
  } catch (error: any) {
    console.log(`❌ FAILED: ${error.message}`);
    results.failed++;
  }
  
  // Test 5: Check monitoring functions
  console.log('\n⚙️  Test 5: Testing monitoring functions...');
  try {
    const { data, error } = await supabase.rpc('get_error_rate', {
      p_time_window_minutes: 60
    });
    
    if (error) throw error;
    
    console.log('✅ Monitoring functions working');
    console.log(`   Current error rate: ${data?.[0]?.errors_per_minute || 0} per minute`);
    results.passed++;
    
  } catch (error: any) {
    console.log(`❌ FAILED: ${error.message}`);
    console.log('   Make sure monitoring migrations have been applied');
    results.failed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log('='.repeat(60));
  
  if (results.failed > 0) {
    console.log('\n⚠️  Some tests failed. Review configuration and try again.');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed! Alert system is configured correctly.');
    process.exit(0);
  }
}

// Run tests
testAlertSystem();


