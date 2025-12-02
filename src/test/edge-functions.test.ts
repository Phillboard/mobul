/**
 * Integration Tests for Edge Functions
 * 
 * Run with: npm test -- edge-functions.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

describe('Edge Functions Integration Tests', () => {
  let authToken: string;
  let testCampaignId: string;
  let testRecipientId: string;
  let testBrandId: string;

  beforeAll(async () => {
    // Setup: Authenticate as test user
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: 'admin@mopads.com',
      password: process.env.TEST_ADMIN_PASSWORD || 'test-password',
    });

    if (authData.session) {
      authToken = authData.session.access_token;
    }

    // Get test data IDs from database
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .limit(1)
      .single();
    
    testCampaignId = campaign?.id || '';

    const { data: brand } = await supabase
      .from('gift_card_brands')
      .select('id')
      .eq('is_enabled_by_admin', true)
      .limit(1)
      .single();
    
    testBrandId = brand?.id || '';
  });

  describe('validate-campaign-budget', () => {
    it('should validate budget successfully', async () => {
      const { data, error } = await supabase.functions.invoke(
        'validate-campaign-budget',
        {
          body: {
            campaignId: testCampaignId,
            recipientCount: 10,
            giftCardDenomination: 25,
            mailCostPerPiece: 0.55,
          },
        }
      );

      expect(error).toBeNull();
      expect(data).toHaveProperty('valid');
      expect(data).toHaveProperty('estimatedCost');
      expect(data).toHaveProperty('availableCredits');
      expect(data.estimatedCost).toBe(255.5); // (10 * 25) + (10 * 0.55)
    });

    it('should fail validation with insufficient credits', async () => {
      const { data, error } = await supabase.functions.invoke(
        'validate-campaign-budget',
        {
          body: {
            campaignId: testCampaignId,
            recipientCount: 10000,
            giftCardDenomination: 100,
            mailCostPerPiece: 0.55,
          },
        }
      );

      expect(error).toBeNull();
      expect(data.valid).toBe(false);
      expect(data).toHaveProperty('shortfall');
    });
  });

  describe('validate-gift-card-configuration', () => {
    it('should validate gift card config', async () => {
      const { data, error } = await supabase.functions.invoke(
        'validate-gift-card-configuration',
        {
          body: {
            campaignId: testCampaignId,
            brandId: testBrandId,
            denomination: 25,
            conditionNumber: 1,
          },
        }
      );

      expect(error).toBeNull();
      expect(data).toHaveProperty('valid');
      expect(data).toHaveProperty('errors');
      expect(data).toHaveProperty('inventoryStatus');
    });
  });

  describe('calculate-credit-requirements', () => {
    it('should calculate credit requirements correctly', async () => {
      const { data, error } = await supabase.functions.invoke(
        'calculate-credit-requirements',
        {
          body: {
            recipientCount: 100,
            giftCardDenomination: 25,
            mailCostPerPiece: 0.55,
          },
        }
      );

      expect(error).toBeNull();
      expect(data.giftCardTotal).toBe(2500);
      expect(data.mailTotal).toBe(55);
      expect(data.grandTotal).toBe(2555);
      expect(data.breakdown.perRecipient.total).toBe(25.55);
    });
  });

  describe('simulate-mail-tracking', () => {
    it('should simulate mail tracking events', async () => {
      const { data, error } = await supabase.functions.invoke(
        'simulate-mail-tracking',
        {
          body: {
            campaignId: testCampaignId,
            deliveryRate: 90,
            returnRate: 5,
          },
        }
      );

      expect(error).toBeNull();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('deliveredCount');
      expect(data).toHaveProperty('returnedCount');
      expect(data).toHaveProperty('inTransitCount');
    });
  });

  describe('provision-gift-card-from-api (test mode)', () => {
    it('should test Tillo API provisioning', async () => {
      const { data, error } = await supabase.functions.invoke(
        'provision-gift-card-from-api',
        {
          body: {
            testMode: true,
            testConfig: {
              api_provider: 'Tillo',
              card_value: 25,
            },
          },
        }
      );

      expect(error).toBeNull();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('testMode');
      expect(data.testMode).toBe(true);
      
      if (data.success) {
        expect(data.card).toHaveProperty('cardCode');
        expect(data.card.denomination).toBe(25);
      }
    });
  });

  describe('Error Handling', () => {
    it('should return proper error for missing parameters', async () => {
      const { data, error } = await supabase.functions.invoke(
        'validate-campaign-budget',
        {
          body: {
            // Missing required parameters
          },
        }
      );

      expect(data).toHaveProperty('success');
      expect(data.success).toBe(false);
      expect(data).toHaveProperty('error');
    });

    it('should return proper error for invalid UUID', async () => {
      const { data, error } = await supabase.functions.invoke(
        'validate-campaign-budget',
        {
          body: {
            campaignId: 'invalid-uuid',
            recipientCount: 10,
            giftCardDenomination: 25,
          },
        }
      );

      expect(data).toHaveProperty('success');
      expect(data.success).toBe(false);
      expect(data).toHaveProperty('error');
    });
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      // Create a client without authentication
      const unauthClient = createClient(supabaseUrl, supabaseKey);
      await unauthClient.auth.signOut();

      const { data, error } = await unauthClient.functions.invoke(
        'validate-campaign-budget',
        {
          body: {
            campaignId: testCampaignId,
            recipientCount: 10,
            giftCardDenomination: 25,
          },
        }
      );

      // Should fail authentication
      expect(error).toBeDefined();
    });
  });
});

describe('Performance Tests', () => {
  it('should respond within 2 seconds', async () => {
    const start = Date.now();

    await supabase.functions.invoke('calculate-credit-requirements', {
      body: {
        recipientCount: 100,
        giftCardDenomination: 25,
      },
    });

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });

  it('should handle concurrent requests', async () => {
    const requests = Array.from({ length: 10 }, () =>
      supabase.functions.invoke('calculate-credit-requirements', {
        body: {
          recipientCount: 10,
          giftCardDenomination: 25,
        },
      })
    );

    const results = await Promise.all(requests);
    
    results.forEach((result) => {
      expect(result.error).toBeNull();
      expect(result.data).toHaveProperty('grandTotal');
    });
  });
});

