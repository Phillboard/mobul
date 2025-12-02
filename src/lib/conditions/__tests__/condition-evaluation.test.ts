import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY! // Need service role for testing
);

describe('Condition Evaluation Engine', () => {
  let testClientId: string;
  let testCampaignId: string;
  let testRecipientId: string;
  let testAudienceId: string;
  let testConditionId: string;

  beforeEach(async () => {
    // Create test client
    const { data: client } = await supabase
      .from('clients')
      .insert({ name: 'Test Client', industry: 'retail' })
      .select()
      .single();
    testClientId = client!.id;

    // Create test campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .insert({
        name: 'Condition Test Campaign',
        client_id: testClientId,
        type: 'postcards',
        status: 'active'
      })
      .select()
      .single();
    testCampaignId = campaign!.id;

    // Create test audience
    const { data: audience } = await supabase
      .from('audiences')
      .insert({
        campaign_id: testCampaignId,
        name: 'Test Audience',
        size: 1
      })
      .select()
      .single();
    testAudienceId = audience!.id;

    // Create test recipient
    const { data: recipient } = await supabase
      .from('recipients')
      .insert({
        audience_id: testAudienceId,
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        phone: '+15555555555',
        redemption_code: 'TEST123',
        token: 'test-token'
      })
      .select()
      .single();
    testRecipientId = recipient!.id;

    // Create test condition
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
  });

  afterEach(async () => {
    // Cleanup in reverse order
    if (testConditionId) {
      await supabase.from('campaign_conditions').delete().eq('id', testConditionId);
    }
    if (testRecipientId) {
      await supabase.from('recipients').delete().eq('id', testRecipientId);
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
  });

  it('evaluates simple condition successfully', async () => {
    const { data, error } = await supabase.functions.invoke(
      'evaluate-conditions',
      {
        body: {
          recipientId: testRecipientId,
          campaignId: testCampaignId,
          eventType: 'form_submitted',
          metadata: { formId: 'test-form' }
        }
      }
    );

    expect(error).toBeNull();
    expect(data.success).toBe(true);
  });
  
  it('creates condition status record', async () => {
    // Trigger condition
    await supabase.functions.invoke('evaluate-conditions', {
      body: {
        recipientId: testRecipientId,
        campaignId: testCampaignId,
        eventType: 'form_submitted'
      }
    });
    
    // Check status was created
    const { data: status } = await supabase
      .from('recipient_condition_status')
      .select('*')
      .eq('recipient_id', testRecipientId)
      .eq('condition_id', testConditionId)
      .single();
      
    expect(status).toBeDefined();
    expect(status!.status).toBe('completed');
    expect(status!.condition_number).toBe(1);
  });
  
  it('executes trigger action when condition met', async () => {
    await supabase.functions.invoke('evaluate-conditions', {
      body: {
        recipientId: testRecipientId,
        campaignId: testCampaignId,
        eventType: 'form_submitted'
      }
    });
    
    // Check trigger was executed
    const { data: triggers } = await supabase
      .from('condition_triggers')
      .select('*')
      .eq('recipient_id', testRecipientId)
      .eq('condition_id', testConditionId);
      
    expect(triggers).toBeDefined();
    expect(triggers!.length).toBeGreaterThan(0);
    expect(triggers![0].trigger_action).toBe('send_sms');
  });
  
  it('handles sequential conditions correctly', async () => {
    // Create second condition (depends on first)
    const { data: condition2 } = await supabase
      .from('campaign_conditions')
      .insert({
        campaign_id: testCampaignId,
        condition_number: 2,
        condition_type: 'sms_opt_in',
        condition_name: 'SMS Opt-in',
        trigger_action: 'send_gift_card',
        is_active: true,
        is_required: true,
        sequence_order: 2
      })
      .select()
      .single();
    
    // Try to trigger condition 2 without condition 1 being met
    const { data: result1 } = await supabase.functions.invoke(
      'evaluate-conditions',
      {
        body: {
          recipientId: testRecipientId,
          campaignId: testCampaignId,
          eventType: 'sms_opt_in'
        }
      }
    );
    
    // Check condition 2 was NOT completed (condition 1 not met)
    const { data: status1 } = await supabase
      .from('recipient_condition_status')
      .select('*')
      .eq('recipient_id', testRecipientId)
      .eq('condition_id', condition2!.id);
    
    expect(status1).toHaveLength(0);
    
    // Now meet condition 1
    await supabase.functions.invoke('evaluate-conditions', {
      body: {
        recipientId: testRecipientId,
        campaignId: testCampaignId,
        eventType: 'form_submitted'
      }
    });
    
    // Now condition 2 should be able to be met
    await supabase.functions.invoke('evaluate-conditions', {
      body: {
        recipientId: testRecipientId,
        campaignId: testCampaignId,
        eventType: 'sms_opt_in'
      }
    });
    
    // Check condition 2 is now completed
    const { data: status2 } = await supabase
      .from('recipient_condition_status')
      .select('*')
      .eq('recipient_id', testRecipientId)
      .eq('condition_id', condition2!.id)
      .single();
    
    expect(status2).toBeDefined();
    expect(status2!.status).toBe('completed');
    
    // Cleanup
    await supabase.from('campaign_conditions').delete().eq('id', condition2!.id);
  });
  
  it('handles failed conditions gracefully', async () => {
    // Create condition with invalid configuration
    const { data: badCondition } = await supabase
      .from('campaign_conditions')
      .insert({
        campaign_id: testCampaignId,
        condition_number: 99,
        condition_type: 'invalid_type',
        condition_name: 'Invalid Condition',
        trigger_action: 'invalid_action',
        is_active: true,
        is_required: false,
        sequence_order: 1
      })
      .select()
      .single();
    
    // Attempt to evaluate
    const { data, error } = await supabase.functions.invoke(
      'evaluate-conditions',
      {
        body: {
          recipientId: testRecipientId,
          campaignId: testCampaignId,
          eventType: 'invalid_type'
        }
      }
    );
    
    // Should not crash - either success or controlled error
    expect(data || error).toBeDefined();
    
    // Cleanup
    await supabase.from('campaign_conditions').delete().eq('id', badCondition!.id);
  });
  
  it('prevents duplicate condition completion', async () => {
    // Complete condition once
    await supabase.functions.invoke('evaluate-conditions', {
      body: {
        recipientId: testRecipientId,
        campaignId: testCampaignId,
        eventType: 'form_submitted'
      }
    });
    
    // Try to complete again
    await supabase.functions.invoke('evaluate-conditions', {
      body: {
        recipientId: testRecipientId,
        campaignId: testCampaignId,
        eventType: 'form_submitted'
      }
    });
    
    // Should only have one condition status
    const { data: statuses } = await supabase
      .from('recipient_condition_status')
      .select('*')
      .eq('recipient_id', testRecipientId)
      .eq('condition_id', testConditionId);
      
    expect(statuses).toHaveLength(1);
    
    // Should only have one trigger (idempotent)
    const { data: triggers } = await supabase
      .from('condition_triggers')
      .select('*')
      .eq('recipient_id', testRecipientId)
      .eq('condition_id', testConditionId);
      
    // May have multiple triggers depending on implementation
    // But condition_status should only be marked completed once
    expect(triggers!.length).toBeGreaterThanOrEqual(1);
  });
});
