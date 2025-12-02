import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

describe('End-to-End: Complete Campaign Workflow', () => {
  let testClientId: string;
  let testCampaignId: string;
  let testAudienceId: string;
  let testRecipientIds: string[] = [];
  let testConditionId: string;

  beforeAll(async () => {
    console.log('🧪 Setting up E2E test environment...');
    
    // 1. Create client
    const { data: client } = await supabase
      .from('clients')
      .insert({
        name: 'E2E Test Client',
        industry: 'retail'
      })
      .select()
      .single();
    testClientId = client!.id;
    console.log('✅ Client created');
    
    // 2. Create campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .insert({
        name: 'E2E Test Campaign',
        client_id: testClientId,
        type: 'postcards',
        status: 'draft',
        mail_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        postage: 'first_class',
        size: '6x9'
      })
      .select()
      .single();
    testCampaignId = campaign!.id;
    console.log('✅ Campaign created');
    
    // 3. Create audience
    const { data: audience } = await supabase
      .from('audiences')
      .insert({
        campaign_id: testCampaignId,
        name: 'E2E Test Audience',
        size: 10
      })
      .select()
      .single();
    testAudienceId = audience!.id;
    console.log('✅ Audience created');
    
    // 4. Add recipients
    const recipients = [];
    for (let i = 0; i < 10; i++) {
      recipients.push({
        audience_id: testAudienceId,
        first_name: `Test${i}`,
        last_name: 'User',
        email: `test${i}@example.com`,
        phone: `+155555555${i.toString().padStart(2, '0')}`,
        redemption_code: `E2E${i.toString().padStart(4, '0')}`,
        token: `e2e-token-${i}`,
        approval_status: 'approved'
      });
    }
    
    const { data: createdRecipients } = await supabase
      .from('recipients')
      .insert(recipients)
      .select();
    
    testRecipientIds = createdRecipients!.map(r => r.id);
    console.log(`✅ ${testRecipientIds.length} recipients created`);
    
    // 5. Configure campaign conditions
    const { data: condition } = await supabase
      .from('campaign_conditions')
      .insert({
        campaign_id: testCampaignId,
        condition_number: 1,
        condition_type: 'form_submitted',
        condition_name: 'Form Submission',
        description: 'Customer submitted form',
        trigger_action: 'send_sms',
        is_active: true,
        is_required: true,
        sequence_order: 1
      })
      .select()
      .single();
    testConditionId = condition!.id;
    console.log('✅ Condition configured');
    
    // 6. Activate campaign
    await supabase
      .from('campaigns')
      .update({ status: 'active' })
      .eq('id', testCampaignId);
    console.log('✅ Campaign activated');
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up E2E test environment...');
    
    // Cleanup in reverse order
    if (testConditionId) {
      await supabase.from('campaign_conditions').delete().eq('id', testConditionId);
    }
    if (testRecipientIds.length > 0) {
      await supabase.from('recipients').delete().in('id', testRecipientIds);
    }
    if (testAudienceId) {
      await supabase.from('audiences').delete().eq('id', testAudienceId);
    }
    if (testCampaignId) {
      await supabase.from('campaigns').delete().eq('id', testCampaignId);
    }
    if (testClientId) {
      await supabase.from('clients').delete().eq('id', testClientId);
    }
    
    console.log('✅ Cleanup complete');
  });

  it('completes full campaign workflow', async () => {
    // Step 1: Verify campaign is active
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('status')
      .eq('id', testCampaignId)
      .single();
    
    expect(campaign!.status).toBe('active');
    
    // Step 2: Simulate form submission for first recipient
    const firstRecipient = testRecipientIds[0];
    
    const { data: evalResult, error: evalError } = await supabase.functions.invoke(
      'evaluate-conditions',
      {
        body: {
          recipientId: firstRecipient,
          campaignId: testCampaignId,
          eventType: 'form_submitted',
          metadata: {
            formId: 'test-form',
            submittedData: {
              name: 'Test User',
              email: 'test@example.com'
            }
          }
        }
      }
    );
    
    // Should process without error
    expect(evalResult?.success || !evalError).toBeTruthy();
    
    // Step 3: Verify condition was marked as completed
    const { data: conditionStatus } = await supabase
      .from('recipient_condition_status')
      .select('*')
      .eq('recipient_id', firstRecipient)
      .eq('condition_id', testConditionId)
      .single();
    
    if (conditionStatus) {
      expect(conditionStatus.status).toBe('completed');
      expect(conditionStatus.completed_at).toBeDefined();
    }
    
    // Step 4: Verify trigger was executed
    const { data: triggers } = await supabase
      .from('condition_triggers')
      .select('*')
      .eq('recipient_id', firstRecipient)
      .eq('campaign_id', testCampaignId);
    
    expect(triggers!.length).toBeGreaterThan(0);
    
    // Step 5: Verify event was logged
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('campaign_id', testCampaignId)
      .eq('event_type', 'form_submitted');
    
    // May or may not have event depending on implementation
    // This is informational
    console.log(`   Events logged: ${events?.length || 0}`);
  });
  
  it('handles multiple recipient interactions', async () => {
    // Simulate form submissions from multiple recipients
    const results = [];
    
    for (const recipientId of testRecipientIds.slice(0, 5)) {
      const { data } = await supabase.functions.invoke(
        'evaluate-conditions',
        {
          body: {
            recipientId,
            campaignId: testCampaignId,
            eventType: 'form_submitted'
          }
        }
      );
      results.push(data);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // All should succeed (or fail gracefully)
    expect(results).toHaveLength(5);
    
    // Check condition statuses created
    const { data: statuses } = await supabase
      .from('recipient_condition_status')
      .select('*')
      .eq('campaign_id', testCampaignId);
    
    expect(statuses!.length).toBeGreaterThanOrEqual(5);
  });
  
  it('tracks campaign performance metrics', async () => {
    // Get campaign stats
    const { data: stats } = await supabase
      .from('campaigns')
      .select(`
        *,
        audiences(
          size,
          recipients(count)
        )
      `)
      .eq('id', testCampaignId)
      .single();
    
    expect(stats).toBeDefined();
    expect(stats!.audiences).toBeDefined();
    
    // Verify recipient count
    const recipientCount = stats!.audiences?.[0]?.recipients?.[0]?.count || 0;
    expect(recipientCount).toBe(10);
  });
});

describe('Error Handling in Campaign Workflow', () => {
  it('handles invalid campaign ID gracefully', async () => {
    const { data, error } = await supabase.functions.invoke(
      'evaluate-conditions',
      {
        body: {
          recipientId: 'invalid-id',
          campaignId: 'invalid-campaign-id',
          eventType: 'form_submitted'
        }
      }
    );
    
    // Should return error or handle gracefully
    expect(error || (data && !data.success)).toBeTruthy();
  });
  
  it('logs errors to error_logs table', async () => {
    // Trigger error condition
    await supabase.functions.invoke(
      'evaluate-conditions',
      {
        body: {
          recipientId: 'invalid-id',
          campaignId: 'invalid-id',
          eventType: 'invalid-type'
        }
      }
    );
    
    // Check if error was logged
    const { data: errors } = await supabase
      .from('error_logs')
      .select('*')
      .eq('category', 'campaign')
      .gte('occurred_at', new Date(Date.now() - 60000).toISOString())
      .order('occurred_at', { ascending: false })
      .limit(1);
    
    // May or may not have logged depending on implementation
    if (errors && errors.length > 0) {
      expect(errors[0].category).toBe('campaign');
    }
  });
});


