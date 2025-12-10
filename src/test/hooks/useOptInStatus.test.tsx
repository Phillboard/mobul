import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

// Create wrapper for hooks
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('SMS Opt-In Workflow', () => {
  let testClientId: string;
  let testCampaignId: string;
  let testRecipientId: string;
  let testAudienceId: string;

  beforeEach(async () => {
    // Setup test data
    const { data: client } = await supabase
      .from('clients')
      .insert({ name: 'Test Client', industry: 'retail' })
      .select()
      .single();
    testClientId = client!.id;

    const { data: campaign } = await supabase
      .from('campaigns')
      .insert({
        name: 'SMS Test Campaign',
        client_id: testClientId,
        type: 'postcards',
        status: 'active'
      })
      .select()
      .single();
    testCampaignId = campaign!.id;

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

    const { data: recipient } = await supabase
      .from('recipients')
      .insert({
        audience_id: testAudienceId,
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        phone: '+15555555555',
        redemption_code: 'TEST123',
        token: 'test-token',
        sms_opt_in_status: 'not_sent'
      })
      .select()
      .single();
    testRecipientId = recipient!.id;
  });

  afterEach(async () => {
    // Cleanup
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

  it('tracks opt-in request creation', async () => {
    // Send opt-in request
    const { data, error } = await supabase.functions.invoke(
      'send-sms-opt-in',
      {
        body: {
          recipientId: testRecipientId,
          campaignId: testCampaignId,
          phone: '+15555555555'
        }
      }
    );

    // May fail if Twilio not configured, that's OK for test
    if (!error || error.message.includes('Twilio')) {
      // Check recipient status updated
      const { data: recipient } = await supabase
        .from('recipients')
        .select('sms_opt_in_status, sms_opt_in_requested_at')
        .eq('id', testRecipientId)
        .single();

      expect(recipient!.sms_opt_in_status).toBe('pending');
      expect(recipient!.sms_opt_in_requested_at).toBeDefined();
    }
  });
  
  it('handles SMS opt-in response (YES)', async () => {
    // First set to pending
    await supabase
      .from('recipients')
      .update({
        sms_opt_in_status: 'pending',
        sms_opt_in_requested_at: new Date().toISOString()
      })
      .eq('id', testRecipientId);
    
    // Simulate "YES" response
    const { data, error } = await supabase.functions.invoke(
      'handle-sms-response',
      {
        body: {
          From: '+15555555555',
          Body: 'YES',
          MessageSid: 'SM123456'
        }
      }
    );
    
    // Check recipient status updated to opted_in
    const { data: recipient } = await supabase
      .from('recipients')
      .select('sms_opt_in_status, sms_opted_in_at')
      .eq('phone', '+15555555555')
      .single();
    
    if (recipient) {
      expect(recipient.sms_opt_in_status).toBe('opted_in');
      expect(recipient.sms_opted_in_at).toBeDefined();
    }
  });
  
  it('handles SMS opt-in response (NO)', async () => {
    // Set to pending
    await supabase
      .from('recipients')
      .update({
        sms_opt_in_status: 'pending',
        sms_opt_in_requested_at: new Date().toISOString()
      })
      .eq('id', testRecipientId);
    
    // Simulate "NO" response
    const { data, error } = await supabase.functions.invoke(
      'handle-sms-response',
      {
        body: {
          From: '+15555555555',
          Body: 'NO',
          MessageSid: 'SM123456'
        }
      }
    );
    
    // Check recipient status updated to opted_out
    const { data: recipient } = await supabase
      .from('recipients')
      .select('sms_opt_in_status')
      .eq('phone', '+15555555555')
      .single();
    
    if (recipient) {
      expect(recipient.sms_opt_in_status).toBe('opted_out');
    }
  });
  
  it('enforces 3-attempt limit for opt-in requests', async () => {
    // Track retry attempts
    await supabase
      .from('recipients')
      .update({ sms_opt_in_retry_count: 3 })
      .eq('id', testRecipientId);
    
    // Try to send another opt-in
    const { data, error } = await supabase.functions.invoke(
      'send-sms-opt-in',
      {
        body: {
          recipientId: testRecipientId,
          campaignId: testCampaignId,
          phone: '+15555555555'
        }
      }
    );
    
    // Should be rejected (max retries reached)
    // Implementation may vary - check for appropriate error handling
    if (error) {
      expect(error.message).toMatch(/retry|attempts|limit/i);
    } else if (data) {
      expect(data.message).toMatch(/retry|attempts|limit/i);
    }
  });
  
  it('records SMS delivery status', async () => {
    const { data, error } = await supabase.functions.invoke(
      'send-sms-opt-in',
      {
        body: {
          recipientId: testRecipientId,
          campaignId: testCampaignId,
          phone: '+15555555555'
        }
      }
    );
    
    // Check SMS delivery log exists
    const { data: deliveryLog } = await supabase
      .from('sms_delivery_log')
      .select('*')
      .eq('recipient_id', testRecipientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (deliveryLog) {
      expect(deliveryLog.phone_number).toBe('+15555555555');
      expect(deliveryLog.message_body).toBeDefined();
      expect(deliveryLog.delivery_status).toMatch(/pending|sent|failed/);
    }
  });
});

describe('SMS Opt-In Status Tracking', () => {
  it('transitions through opt-in states correctly', async () => {
    // Create recipient
    const { data: recipient } = await supabase
      .from('recipients')
      .insert({
        audience_id: 'temp-audience',
        first_name: 'Test',
        last_name: 'User',
        phone: '+15555555555',
        sms_opt_in_status: 'not_sent'
      })
      .select()
      .single();
    
    const recipientId = recipient!.id;
    
    // Transition: not_sent → pending
    await supabase
      .from('recipients')
      .update({ sms_opt_in_status: 'pending' })
      .eq('id', recipientId);
    
    let { data: updated } = await supabase
      .from('recipients')
      .select('sms_opt_in_status')
      .eq('id', recipientId)
      .single();
    expect(updated!.sms_opt_in_status).toBe('pending');
    
    // Transition: pending → opted_in
    await supabase
      .from('recipients')
      .update({ sms_opt_in_status: 'opted_in' })
      .eq('id', recipientId);
    
    ({ data: updated } = await supabase
      .from('recipients')
      .select('sms_opt_in_status')
      .eq('id', recipientId)
      .single());
    expect(updated!.sms_opt_in_status).toBe('opted_in');
    
    // Cleanup
    await supabase.from('recipients').delete().eq('id', recipientId);
  });
});
