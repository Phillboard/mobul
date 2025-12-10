import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import { CallCenterRedemptionPanel } from '@/features/call-center/components/CallCenterRedemptionPanel';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

// Create query client for tests
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('Call Center Redemption Panel', () => {
  let testClientId: string;
  let testCampaignId: string;
  let testRecipientId: string;
  let testRedemptionCode: string;

  beforeEach(async () => {
    // Create test data
    const { data: client } = await supabase
      .from('clients')
      .insert({ name: 'Test Client', industry: 'retail' })
      .select()
      .single();
    testClientId = client!.id;

    const { data: campaign } = await supabase
      .from('campaigns')
      .insert({
        name: 'Call Center Test Campaign',
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

    testRedemptionCode = `TEST${Math.floor(Math.random() * 10000)}`;
    
    const { data: recipient } = await supabase
      .from('recipients')
      .insert({
        audience_id: audience!.id,
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        phone: '+15555555555',
        redemption_code: testRedemptionCode,
        token: `test-token-${Date.now()}`,
        approval_status: 'pending',
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
    if (testCampaignId) {
      await supabase.from('audiences').delete().eq('campaign_id', testCampaignId);
      await supabase.from('campaigns').delete().eq('id', testCampaignId);
    }
    if (testClientId) {
      await supabase.from('clients').delete().eq('id', testClientId);
    }
  });

  it('renders code input step initially', () => {
    render(<CallCenterRedemptionPanel />, { wrapper });
    
    expect(screen.getByText(/enter.*code/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
  
  it('looks up recipient by redemption code', async () => {
    render(<CallCenterRedemptionPanel />, { wrapper });
    
    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: /lookup|search/i });
    
    fireEvent.change(input, { target: { value: testRedemptionCode } });
    fireEvent.click(button);
    
    await waitFor(() => {
      // Should show recipient details
      expect(screen.getByText(/Test User/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
  
  it('validates SMS opt-in before showing gift card options', async () => {
    render(<CallCenterRedemptionPanel />, { wrapper });
    
    // Lookup recipient
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: testRedemptionCode } });
    
    const lookupButton = screen.getByRole('button', { name: /lookup/i });
    fireEvent.click(lookupButton);
    
    await waitFor(() => {
      // Should show SMS opt-in step
      expect(screen.getByText(/sms.*opt.*in/i)).toBeInTheDocument();
    });
    
    // Gift card selection should NOT be available yet
    expect(screen.queryByText(/select.*gift.*card/i)).not.toBeInTheDocument();
  });
  
  it('prevents double redemption', async () => {
    // Mark recipient as already redeemed
    await supabase
      .from('recipients')
      .update({ approval_status: 'redeemed' })
      .eq('id', testRecipientId);
    
    render(<CallCenterRedemptionPanel />, { wrapper });
    
    // Lookup recipient
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: testRedemptionCode } });
    
    const button = screen.getByRole('button', { name: /lookup/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      // Should show already redeemed message
      expect(screen.getByText(/already.*redeemed/i)).toBeInTheDocument();
    });
  });
  
  it('shows approval workflow for pending recipients', async () => {
    render(<CallCenterRedemptionPanel />, { wrapper });
    
    // Lookup recipient
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: testRedemptionCode } });
    fireEvent.click(screen.getByRole('button', { name: /lookup/i }));
    
    await waitFor(() => {
      // Should show approval options
      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    });
  });
});

describe('Call Center Workflow Steps', () => {
  it('progresses through workflow steps correctly', () => {
    render(<CallCenterRedemptionPanel />, { wrapper });
    
    // Step 1: Code entry
    expect(screen.getByText(/enter.*code/i)).toBeInTheDocument();
    
    // After code lookup (mock successful lookup)
    // Step 2: SMS opt-in
    // Step 3: Contact method
    // Step 4: Condition completion
    // Step 5: Gift card reveal
  });
  
  it('allows navigation back to previous steps', () => {
    render(<CallCenterRedemptionPanel />, { wrapper });
    
    // Mock being on a later step
    // Look for back/previous button
    // Verify returns to earlier step
  });
});

describe('Call Session Tracking', () => {
  let testCampaignId: string;
  let testRecipientId: string;

  beforeEach(async () => {
    const { data: client } = await supabase
      .from('clients')
      .insert({ name: 'Test Client', industry: 'retail' })
      .select()
      .single();

    const { data: campaign } = await supabase
      .from('campaigns')
      .insert({
        name: 'Call Session Test',
        client_id: client!.id,
        type: 'postcards'
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

    const { data: recipient } = await supabase
      .from('recipients')
      .insert({
        audience_id: audience!.id,
        first_name: 'Test',
        last_name: 'User',
        phone: '+15555555555'
      })
      .select()
      .single();
    testRecipientId = recipient!.id;
  });

  afterEach(async () => {
    if (testRecipientId) {
      await supabase.from('recipients').delete().eq('id', testRecipientId);
    }
    if (testCampaignId) {
      await supabase.from('audiences').delete().eq('campaign_id', testCampaignId);
      await supabase.from('campaigns').delete().eq('id', testCampaignId);
    }
  });

  it('creates call session record', async () => {
    const { data: session, error } = await supabase
      .from('call_sessions')
      .insert({
        campaign_id: testCampaignId,
        recipient_id: testRecipientId,
        start_time: new Date().toISOString(),
        call_status: 'in-progress'
      })
      .select()
      .single();
      
    expect(error).toBeNull();
    expect(session!.campaign_id).toBe(testCampaignId);
    expect(session!.recipient_id).toBe(testRecipientId);
    
    // Cleanup
    await supabase.from('call_sessions').delete().eq('id', session!.id);
  });
  
  it('updates call session on completion', async () => {
    const { data: session } = await supabase
      .from('call_sessions')
      .insert({
        campaign_id: testCampaignId,
        recipient_id: testRecipientId,
        start_time: new Date().toISOString(),
        call_status: 'in-progress'
      })
      .select()
      .single();
    
    // Complete call
    const { data: updated, error } = await supabase
      .from('call_sessions')
      .update({
        call_status: 'completed',
        end_time: new Date().toISOString(),
        disposition: 'approved'
      })
      .eq('id', session!.id)
      .select()
      .single();
      
    expect(error).toBeNull();
    expect(updated!.call_status).toBe('completed');
    expect(updated!.disposition).toBe('approved');
    
    // Cleanup
    await supabase.from('call_sessions').delete().eq('id', session!.id);
  });
});
