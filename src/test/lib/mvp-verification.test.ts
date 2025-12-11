import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MVPVerification, type VerificationResult } from '../system/mvp-verification';
import { supabase } from '@core/services/supabase';

// Mock Supabase client
vi.mock('@core/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('MVPVerification', () => {
  let verification: MVPVerification;

  beforeEach(() => {
    verification = new MVPVerification();
    vi.clearAllMocks();
  });

  describe('Database Table Verification', () => {
    it('should detect existing tables', async () => {
      // Mock successful table query
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      } as any);

      const results = await verification.runAll();
      
      const tableChecks = results.filter(r => r.category === 'Database Tables');
      expect(tableChecks.length).toBeGreaterThan(0);
      expect(tableChecks.every(r => r.status === 'pass')).toBe(true);
    });

    it('should detect missing tables', async () => {
      // Mock table not found error
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'relation "test_table" does not exist' } 
          }),
        }),
      } as any);

      const results = await verification.runAll();
      
      const failedChecks = results.filter(r => r.status === 'fail');
      expect(failedChecks.length).toBeGreaterThan(0);
    });
  });

  describe('Organization and Client Checks', () => {
    it('should pass when organizations exist', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: '1', name: 'Test Org' }],
          error: null,
        }),
      } as any);

      const results = await verification.runAll();
      
      const orgCheck = results.find(
        r => r.category === 'Organizations & Clients' && r.check === 'Organizations'
      );
      expect(orgCheck?.status).toBe('pass');
    });

    it('should warn when no organizations exist', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as any);

      const results = await verification.runAll();
      
      const orgCheck = results.find(
        r => r.category === 'Organizations & Clients' && r.check === 'Organizations'
      );
      expect(orgCheck?.status).toBe('warning');
    });
  });

  describe('User Setup Checks', () => {
    it('should fail when no user logged in', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      const results = await verification.runAll();
      
      const authCheck = results.find(
        r => r.category === 'User Setup' && r.check === 'Authentication'
      );
      expect(authCheck?.status).toBe('fail');
    });

    it('should pass when user is logged in', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: '1', email: 'test@example.com' } },
        error: null,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ role: 'admin' }],
            error: null,
          }),
        }),
      } as any);

      const results = await verification.runAll();
      
      const authCheck = results.find(
        r => r.category === 'User Setup' && r.check === 'Authentication'
      );
      expect(authCheck?.status).toBe('pass');
    });
  });

  describe('Gift Card Infrastructure', () => {
    it('should warn when no gift card brands exist', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as any);

      const results = await verification.runAll();
      
      const brandCheck = results.find(
        r => r.category === 'Gift Cards' && r.check === 'Gift Card Brands'
      );
      expect(brandCheck?.status).toBe('warning');
    });

    it('should pass when pools have available cards', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            { id: '1', pool_name: 'Test Pool', available_cards: 10 }
          ],
          error: null,
        }),
      } as any);

      const results = await verification.runAll();
      
      const poolCheck = results.find(
        r => r.category === 'Gift Cards' && r.check === 'Gift Card Pools'
      );
      expect(poolCheck?.status).toBe('pass');
    });
  });

  describe('Result Methods', () => {
    it('should group results by category', async () => {
      const results = await verification.runAll();
      const byCategory = verification.getResultsByCategory();
      
      expect(Object.keys(byCategory).length).toBeGreaterThan(0);
      expect(byCategory['Database Tables']).toBeDefined();
    });

    it('should return all results', async () => {
      const results = await verification.runAll();
      const allResults = verification.getResults();
      
      expect(allResults).toEqual(results);
      expect(allResults.length).toBeGreaterThan(0);
    });
  });
});

