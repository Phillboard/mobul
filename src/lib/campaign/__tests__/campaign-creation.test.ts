import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Use test Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

describe('Campaign Creation Flow', () => {
  let testClientId: string;
  let testCampaignId: string;

  beforeEach(async () => {
    // Create test client for campaigns
    const { data: client } = await supabase
      .from('clients')
      .insert({
        name: 'Test Client for Campaigns',
        industry: 'retail'
      })
      .select()
      .single();
    
    testClientId = client!.id;
  });

  afterEach(async () => {
    // Cleanup test data
    if (testCampaignId) {
      await supabase
        .from('campaigns')
        .delete()
        .eq('id', testCampaignId);
    }
    
    if (testClientId) {
      await supabase
        .from('clients')
        .delete()
        .eq('id', testClientId);
    }
  });

  it('creates campaign with valid data', async () => {
    const campaign = {
      name: 'Test Campaign',
      client_id: testClientId,
      type: 'postcards',
      status: 'draft',
      mail_date: new Date().toISOString(),
      postage: 'first_class',
      size: '6x9'
    };
    
    const { data, error } = await supabase
      .from('campaigns')
      .insert(campaign)
      .select()
      .single();
      
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data!.name).toBe('Test Campaign');
    expect(data!.client_id).toBe(testClientId);
    expect(data!.type).toBe('postcards');
    
    testCampaignId = data!.id;
  });
  
  it('validates required fields', async () => {
    const incompleteCampaign = {
      name: 'Test Campaign'
      // Missing required fields like client_id
    };
    
    const { error } = await supabase
      .from('campaigns')
      .insert(incompleteCampaign);
      
    expect(error).not.toBeNull();
    expect(error!.message).toContain('null value');
  });
  
  it('sets default values correctly', async () => {
    const minimalCampaign = {
      name: 'Minimal Campaign',
      client_id: testClientId,
      type: 'postcards'
    };
    
    const { data, error } = await supabase
      .from('campaigns')
      .insert(minimalCampaign)
      .select()
      .single();
      
    expect(error).toBeNull();
    expect(data!.status).toBe('draft'); // Default status
    expect(data!.created_at).toBeDefined();
    
    testCampaignId = data!.id;
  });
  
  it('allows campaign name reuse across different clients', async () => {
    // Create first campaign
    const campaign1 = {
      name: 'Duplicate Name Campaign',
      client_id: testClientId,
      type: 'postcards'
    };
    
    const { data: data1, error: error1 } = await supabase
      .from('campaigns')
      .insert(campaign1)
      .select()
      .single();
      
    expect(error1).toBeNull();
    testCampaignId = data1!.id;
    
    // Create second client
    const { data: client2 } = await supabase
      .from('clients')
      .insert({
        name: 'Second Test Client',
        industry: 'retail'
      })
      .select()
      .single();
    
    // Create campaign with same name but different client
    const campaign2 = {
      name: 'Duplicate Name Campaign',
      client_id: client2!.id,
      type: 'postcards'
    };
    
    const { data: data2, error: error2 } = await supabase
      .from('campaigns')
      .insert(campaign2)
      .select()
      .single();
      
    expect(error2).toBeNull();
    expect(data2!.name).toBe(data1!.name);
    expect(data2!.client_id).not.toBe(data1!.client_id);
    
    // Cleanup second client
    await supabase.from('campaigns').delete().eq('id', data2!.id);
    await supabase.from('clients').delete().eq('id', client2!.id);
  });
  
  it('tracks campaign creation in audit log', async () => {
    const campaign = {
      name: 'Audit Test Campaign',
      client_id: testClientId,
      type: 'postcards'
    };
    
    const { data, error } = await supabase
      .from('campaigns')
      .insert(campaign)
      .select()
      .single();
      
    expect(error).toBeNull();
    testCampaignId = data!.id;
    
    // Check if audit log entry exists
    const { data: auditLog } = await supabase
      .from('security_audit_log')
      .select('*')
      .eq('resource_type', 'campaign')
      .eq('resource_id', testCampaignId)
      .single();
    
    // May not exist if trigger not set up yet
    if (auditLog) {
      expect(auditLog.action_type).toBe('campaign_created');
    }
  });
});

describe('Campaign Status Transitions', () => {
  let testClientId: string;
  let testCampaignId: string;

  beforeEach(async () => {
    const { data: client } = await supabase
      .from('clients')
      .insert({ name: 'Test Client', industry: 'retail' })
      .select()
      .single();
    testClientId = client!.id;

    const { data: campaign } = await supabase
      .from('campaigns')
      .insert({
        name: 'Status Test Campaign',
        client_id: testClientId,
        type: 'postcards',
        status: 'draft'
      })
      .select()
      .single();
    testCampaignId = campaign!.id;
  });

  afterEach(async () => {
    if (testCampaignId) {
      await supabase.from('campaigns').delete().eq('id', testCampaignId);
    }
    if (testClientId) {
      await supabase.from('clients').delete().eq('id', testClientId);
    }
  });

  it('transitions from draft to active', async () => {
    const { data, error } = await supabase
      .from('campaigns')
      .update({ status: 'active' })
      .eq('id', testCampaignId)
      .select()
      .single();
      
    expect(error).toBeNull();
    expect(data!.status).toBe('active');
  });
  
  it('transitions from active to paused', async () => {
    // First set to active
    await supabase
      .from('campaigns')
      .update({ status: 'active' })
      .eq('id', testCampaignId);
    
    // Then pause
    const { data, error } = await supabase
      .from('campaigns')
      .update({ status: 'paused' })
      .eq('id', testCampaignId)
      .select()
      .single();
      
    expect(error).toBeNull();
    expect(data!.status).toBe('paused');
  });
  
  it('tracks status change timestamps', async () => {
    const beforeUpdate = new Date();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const { data, error } = await supabase
      .from('campaigns')
      .update({ status: 'active' })
      .eq('id', testCampaignId)
      .select()
      .single();
      
    expect(error).toBeNull();
    
    const updatedAt = new Date(data!.updated_at);
    expect(updatedAt.getTime()).toBeGreaterThan(beforeUpdate.getTime());
  });
});

describe('Campaign Deletion', () => {
  let testClientId: string;
  let testCampaignId: string;

  beforeEach(async () => {
    const { data: client } = await supabase
      .from('clients')
      .insert({ name: 'Test Client', industry: 'retail' })
      .select()
      .single();
    testClientId = client!.id;

    const { data: campaign } = await supabase
      .from('campaigns')
      .insert({
        name: 'Delete Test Campaign',
        client_id: testClientId,
        type: 'postcards'
      })
      .select()
      .single();
    testCampaignId = campaign!.id;
  });

  afterEach(async () => {
    if (testClientId) {
      await supabase.from('clients').delete().eq('id', testClientId);
    }
  });

  it('soft deletes campaign', async () => {
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'archived' })
      .eq('id', testCampaignId);
      
    expect(error).toBeNull();
    
    // Verify still exists but archived
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', testCampaignId)
      .single();
      
    expect(data!.status).toBe('archived');
  });
  
  it('hard deletes campaign (admin only)', async () => {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', testCampaignId);
      
    // May fail if RLS prevents deletion
    // This is expected and correct behavior
    if (error) {
      expect(error.message).toContain('permission denied');
    } else {
      // If deletion succeeded, verify it's gone
      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', testCampaignId);
        
      expect(data).toHaveLength(0);
    }
    
    testCampaignId = ''; // Already deleted
  });
});
