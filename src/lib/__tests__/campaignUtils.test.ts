/**
 * Campaign Utilities Tests
 * 
 * Tests for campaign status and validation utilities
 */

import { describe, it, expect } from 'vitest';
import { getCampaignStatusColor, canEditCampaign, calculateCampaignProgress } from '../campaignUtils';

describe('campaignUtils', () => {
  describe('getCampaignStatusColor', () => {
    it('should return correct color for each status', () => {
      expect(getCampaignStatusColor('draft')).toBe('gray');
      expect(getCampaignStatusColor('scheduled')).toBe('blue');
      expect(getCampaignStatusColor('in_progress')).toBe('green');
      expect(getCampaignStatusColor('completed')).toBe('gray');
      expect(getCampaignStatusColor('cancelled')).toBe('red');
    });
  });

  describe('canEditCampaign', () => {
    it('should allow editing draft campaigns', () => {
      expect(canEditCampaign('draft')).toBe(true);
    });

    it('should not allow editing scheduled campaigns', () => {
      expect(canEditCampaign('scheduled')).toBe(false);
    });

    it('should not allow editing in_progress campaigns', () => {
      expect(canEditCampaign('in_progress')).toBe(false);
    });

    it('should not allow editing completed campaigns', () => {
      expect(canEditCampaign('completed')).toBe(false);
    });

    it('should not allow editing cancelled campaigns', () => {
      expect(canEditCampaign('cancelled')).toBe(false);
    });
  });

  describe('calculateCampaignProgress', () => {
    it('should calculate progress correctly', () => {
      expect(calculateCampaignProgress(50, 100)).toBe(50);
      expect(calculateCampaignProgress(25, 100)).toBe(25);
      expect(calculateCampaignProgress(100, 100)).toBe(100);
    });

    it('should handle zero total', () => {
      expect(calculateCampaignProgress(0, 0)).toBe(0);
    });

    it('should cap at 100%', () => {
      expect(calculateCampaignProgress(150, 100)).toBe(100);
    });

    it('should handle partial progress', () => {
      expect(calculateCampaignProgress(33, 100)).toBe(33);
    });
  });
});
