import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkEnvironmentVariables, isMVPReady, generateEnvTemplate } from '../system/env-checker';

// Mock import.meta.env
const mockEnv = {};
vi.stubGlobal('import', { meta: { env: mockEnv } });

describe('Environment Checker', () => {
  beforeEach(() => {
    // Clear mock env
    Object.keys(mockEnv).forEach(key => delete mockEnv[key as keyof typeof mockEnv]);
  });

  describe('checkEnvironmentVariables', () => {
    it('should detect all required variables are set', () => {
      mockEnv['VITE_SUPABASE_URL'] = 'https://test.supabase.co';
      mockEnv['VITE_SUPABASE_PUBLISHABLE_KEY'] = 'test-key';

      const result = checkEnvironmentVariables();
      
      expect(result.allRequired).toBe(true);
      expect(result.missingRequired).toHaveLength(0);
    });

    it('should detect missing required variables', () => {
      // No env vars set
      const result = checkEnvironmentVariables();
      
      expect(result.allRequired).toBe(false);
      expect(result.missingRequired).toContain('VITE_SUPABASE_URL');
      expect(result.missingRequired).toContain('VITE_SUPABASE_PUBLISHABLE_KEY');
    });

    it('should detect optional variables', () => {
      mockEnv['VITE_SUPABASE_URL'] = 'https://test.supabase.co';
      mockEnv['VITE_SUPABASE_PUBLISHABLE_KEY'] = 'test-key';
      mockEnv['VITE_TWILIO_ACCOUNT_SID'] = 'AC123';

      const result = checkEnvironmentVariables();
      
      const twilioCheck = result.checks.find(c => c.name === 'VITE_TWILIO_ACCOUNT_SID');
      expect(twilioCheck?.isConfigured).toBe(true);
    });

    it('should mask sensitive values', () => {
      mockEnv['VITE_SUPABASE_PUBLISHABLE_KEY'] = '1234567890abcdef';

      const result = checkEnvironmentVariables();
      
      const keyCheck = result.checks.find(c => c.name === 'VITE_SUPABASE_PUBLISHABLE_KEY');
      expect(keyCheck?.value).toMatch(/^1234\.\.\.cdef$/);
    });
  });

  describe('isMVPReady', () => {
    it('should return false when required variables missing', () => {
      const result = isMVPReady();
      
      expect(result.ready).toBe(false);
      expect(result.reason).toContain('Missing required');
    });

    it('should return false when Twilio not configured', () => {
      mockEnv['VITE_SUPABASE_URL'] = 'https://test.supabase.co';
      mockEnv['VITE_SUPABASE_PUBLISHABLE_KEY'] = 'test-key';

      const result = isMVPReady();
      
      expect(result.ready).toBe(false);
      expect(result.reason).toContain('Twilio');
    });

    it('should return true when all required variables set', () => {
      mockEnv['VITE_SUPABASE_URL'] = 'https://test.supabase.co';
      mockEnv['VITE_SUPABASE_PUBLISHABLE_KEY'] = 'test-key';
      mockEnv['VITE_TWILIO_ACCOUNT_SID'] = 'AC123';
      mockEnv['VITE_TWILIO_AUTH_TOKEN'] = 'token';
      mockEnv['VITE_TWILIO_PHONE_NUMBER'] = '+15125551234';

      const result = isMVPReady();
      
      expect(result.ready).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('generateEnvTemplate', () => {
    it('should generate valid .env template', () => {
      const template = generateEnvTemplate();
      
      expect(template).toContain('VITE_SUPABASE_URL');
      expect(template).toContain('VITE_TWILIO_ACCOUNT_SID');
      expect(template).toContain('<REQUIRED>');
      expect(template).toContain('<OPTIONAL>');
    });

    it('should group variables by category', () => {
      const template = generateEnvTemplate();
      
      expect(template).toContain('# Supabase');
      expect(template).toContain('# Twilio');
      expect(template).toContain('# AI');
    });
  });
});

