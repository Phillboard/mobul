import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

describe('Dashboard Analytics Calculations', () => {
  let testClientId: string;
  let testCampaignId: string;

  beforeEach(async () => {
    // Create test client
    const { data: client } = await supabase
      .from('clients')
      .insert({ name: 'Analytics Test Client', industry: 'retail' })
      .select()
      .single();
    testClientId = client!.id;

    // Create test campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .insert({
        name: 'Analytics Test Campaign',
        client_id: testClientId,
        type: 'postcards',
        status: 'active'
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

  it('calculates campaign stats correctly', async () => {
    // Create test events
    const events = [
      { campaign_id: testCampaignId, event_type: 'imb_injected', occurred_at: new Date().toISOString() },
      { campaign_id: testCampaignId, event_type: 'imb_delivered', occurred_at: new Date().toISOString() },
      { campaign_id: testCampaignId, event_type: 'qr_scan', occurred_at: new Date().toISOString() },
      { campaign_id: testCampaignId, event_type: 'qr_scan', occurred_at: new Date().toISOString() },
      { campaign_id: testCampaignId, event_type: 'purl_visit', occurred_at: new Date().toISOString() },
      { campaign_id: testCampaignId, event_type: 'lead_captured', occurred_at: new Date().toISOString() }
    ];
    
    await supabase.from('events').insert(events);
    
    // Query stats
    const { data: statsData } = await supabase
      .from('events')
      .select('event_type')
      .eq('campaign_id', testCampaignId);
    
    const stats = statsData!.reduce((acc: any, event: any) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {});
    
    expect(stats.imb_injected).toBe(1);
    expect(stats.imb_delivered).toBe(1);
    expect(stats.qr_scan).toBe(2);
    expect(stats.purl_visit).toBe(1);
    expect(stats.lead_captured).toBe(1);
    
    // Cleanup
    await supabase.from('events').delete().eq('campaign_id', testCampaignId);
  });
  
  it('filters by date range correctly', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Create events at different times
    await supabase.from('events').insert([
      { campaign_id: testCampaignId, event_type: 'qr_scan', occurred_at: lastWeek.toISOString() },
      { campaign_id: testCampaignId, event_type: 'qr_scan', occurred_at: yesterday.toISOString() },
      { campaign_id: testCampaignId, event_type: 'qr_scan', occurred_at: now.toISOString() }
    ]);
    
    // Query last 24 hours
    const { data: recent } = await supabase
      .from('events')
      .select('*')
      .eq('campaign_id', testCampaignId)
      .gte('occurred_at', yesterday.toISOString());
    
    expect(recent!.length).toBe(2); // Yesterday and today
    
    // Query last 7 days
    const { data: weekly } = await supabase
      .from('events')
      .select('*')
      .eq('campaign_id', testCampaignId)
      .gte('occurred_at', lastWeek.toISOString());
    
    expect(weekly!.length).toBe(3); // All events
    
    // Cleanup
    await supabase.from('events').delete().eq('campaign_id', testCampaignId);
  });
  
  it('handles empty data gracefully', async () => {
    // Query stats for campaign with no events
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('campaign_id', testCampaignId);
    
    expect(events).toHaveLength(0);
    
    // Calculate stats should not crash
    const stats = events!.reduce((acc: any, event: any) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {});
    
    expect(stats).toEqual({});
  });
  
  it('calculates conversion rates correctly', async () => {
    // Create events showing funnel
    await supabase.from('events').insert([
      { campaign_id: testCampaignId, event_type: 'imb_delivered', occurred_at: new Date().toISOString() },
      { campaign_id: testCampaignId, event_type: 'imb_delivered', occurred_at: new Date().toISOString() },
      { campaign_id: testCampaignId, event_type: 'imb_delivered', occurred_at: new Date().toISOString() },
      { campaign_id: testCampaignId, event_type: 'imb_delivered', occurred_at: new Date().toISOString() },
      { campaign_id: testCampaignId, event_type: 'qr_scan', occurred_at: new Date().toISOString() },
      { campaign_id: testCampaignId, event_type: 'qr_scan', occurred_at: new Date().toISOString() },
      { campaign_id: testCampaignId, event_type: 'lead_captured', occurred_at: new Date().toISOString() }
    ]);
    
    const { data: events } = await supabase
      .from('events')
      .select('event_type')
      .eq('campaign_id', testCampaignId);
    
    const delivered = events!.filter(e => e.event_type === 'imb_delivered').length;
    const scanned = events!.filter(e => e.event_type === 'qr_scan').length;
    const converted = events!.filter(e => e.event_type === 'lead_captured').length;
    
    const scanRate = (scanned / delivered) * 100;
    const conversionRate = (converted / delivered) * 100;
    
    expect(scanRate).toBe(50); // 2/4 = 50%
    expect(conversionRate).toBe(25); // 1/4 = 25%
    
    // Cleanup
    await supabase.from('events').delete().eq('campaign_id', testCampaignId);
  });
});

describe('Performance Metrics Tracking', () => {
  it('records page load metrics', async () => {
    const { data, error } = await supabase
      .from('performance_metrics')
      .insert({
        metric_type: 'page_load',
        metric_name: 'dashboard',
        duration_ms: 1250,
        metadata: { route: '/dashboard' }
      })
      .select()
      .single();
      
    expect(error).toBeNull();
    expect(data!.duration_ms).toBe(1250);
    expect(data!.metric_type).toBe('page_load');
    
    // Cleanup
    await supabase.from('performance_metrics').delete().eq('id', data!.id);
  });
  
  it('calculates average response time', async () => {
    // Insert multiple metrics
    const metrics = [
      { metric_type: 'edge_function', metric_name: 'test-function', duration_ms: 100 },
      { metric_type: 'edge_function', metric_name: 'test-function', duration_ms: 200 },
      { metric_type: 'edge_function', metric_name: 'test-function', duration_ms: 300 }
    ];
    
    await supabase.from('performance_metrics').insert(metrics);
    
    // Calculate average
    const { data } = await supabase
      .from('performance_metrics')
      .select('duration_ms')
      .eq('metric_name', 'test-function');
    
    const avg = data!.reduce((sum, m) => sum + m.duration_ms, 0) / data!.length;
    expect(avg).toBe(200);
    
    // Cleanup
    await supabase
      .from('performance_metrics')
      .delete()
      .eq('metric_name', 'test-function');
  });
});
