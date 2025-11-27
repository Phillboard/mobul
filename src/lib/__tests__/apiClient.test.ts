import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callEdgeFunction, callPublicEdgeFunction, EdgeFunctionError } from '../apiClient';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
  });

  describe('callEdgeFunction', () => {
    it('should successfully call edge function', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      } as any);

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: 'test' }),
      } as Response);

      const result = await callEdgeFunction('test-function', { input: 'test' });
      
      expect(result).toEqual({ success: true, data: 'test' });
      expect(fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/test-function',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should throw EdgeFunctionError on failure', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      } as any);

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: 'Bad request' }),
      } as Response);

      await expect(
        callEdgeFunction('test-function', { input: 'test' })
      ).rejects.toThrow(EdgeFunctionError);
    });

    it('should timeout after specified duration', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      } as any);

      vi.mocked(fetch).mockImplementation(() =>
        new Promise((resolve) => setTimeout(resolve, 2000))
      );

      await expect(
        callEdgeFunction('test-function', { input: 'test' }, { timeout: 100 })
      ).rejects.toThrow(/timed out/);
    });

    it('should handle auth session error', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' },
      } as any);

      await expect(
        callEdgeFunction('test-function')
      ).rejects.toThrow(EdgeFunctionError);
    });
  });

  describe('callPublicEdgeFunction', () => {
    it('should call edge function without auth', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const result = await callPublicEdgeFunction('public-function');
      
      expect(result).toEqual({ success: true });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('public-function'),
        expect.not.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.anything(),
          }),
        })
      );
    });
  });

  describe('EdgeFunctionError', () => {
    it('should create error with all properties', () => {
      const error = new EdgeFunctionError(
        'Test error',
        404,
        'test-function',
        new Error('Original')
      );

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(404);
      expect(error.functionName).toBe('test-function');
      expect(error.originalError).toBeDefined();
    });
  });
});

