/**
 * Landing Page Analytics Hook
 * Track views, conversions, and performance metrics
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';

export interface LandingPageAnalytics {
  page_id: string;
  total_views: number;
  unique_views: number;
  total_conversions: number;
  conversion_rate: number;
  avg_time_on_page: number;
  bounce_rate: number;
  views_by_date: Array<{ date: string; views: number }>;
  conversions_by_date: Array<{ date: string; conversions: number }>;
  device_breakdown: {
    desktop: number;
    tablet: number;
    mobile: number;
  };
}

export function useLandingPageAnalytics(pageId: string) {
  return useQuery({
    queryKey: ['landing-page-analytics', pageId],
    queryFn: async () => {
      // In a real implementation, this would query an analytics table
      // For now, return mock data structure
      const analytics: LandingPageAnalytics = {
        page_id: pageId,
        total_views: 0,
        unique_views: 0,
        total_conversions: 0,
        conversion_rate: 0,
        avg_time_on_page: 0,
        bounce_rate: 0,
        views_by_date: [],
        conversions_by_date: [],
        device_breakdown: {
          desktop: 0,
          tablet: 0,
          mobile: 0,
        },
      };

      return analytics;
    },
    enabled: !!pageId,
  });
}

/**
 * Track a page view
 */
export function useTrackPageView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pageId,
      sessionId,
      device,
      referrer,
    }: {
      pageId: string;
      sessionId: string;
      device: 'desktop' | 'tablet' | 'mobile';
      referrer?: string;
    }) => {
      // In production, this would insert into an analytics table
      const { error } = await supabase.from('landing_page_views').insert({
        landing_page_id: pageId,
        session_id: sessionId,
        device,
        referrer,
        viewed_at: new Date().toISOString(),
      });

      if (error) throw error;

      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['landing-page-analytics', variables.pageId] });
    },
  });
}

/**
 * Track a conversion
 */
export function useTrackConversion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pageId,
      sessionId,
      conversionType,
      conversionValue,
    }: {
      pageId: string;
      sessionId: string;
      conversionType: string;
      conversionValue?: number;
    }) => {
      // In production, this would insert into an analytics table
      const { error } = await supabase.from('landing_page_conversions').insert({
        landing_page_id: pageId,
        session_id: sessionId,
        conversion_type: conversionType,
        conversion_value: conversionValue,
        converted_at: new Date().toISOString(),
      });

      if (error) throw error;

      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['landing-page-analytics', variables.pageId] });
    },
  });
}

/**
 * Generate a unique session ID for tracking
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Detect device type
 */
export function detectDevice(): 'desktop' | 'tablet' | 'mobile' {
  const width = window.innerWidth;
  
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

