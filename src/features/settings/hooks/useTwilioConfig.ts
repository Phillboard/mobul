/**
 * Twilio Configuration Hooks
 * 
 * React hooks for managing hierarchical Twilio configuration.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';
import { toast } from 'sonner';
import { logApiError, createScopedLogger } from '@core/api/errorLogger';
import type {
  TwilioStatusResponse,
  TwilioTestResult,
  TwilioPhoneNumber,
  UpdateTwilioConfigParams,
  TwilioHealthStats,
} from '../types/twilio';

// Create a scoped logger for Twilio operations
const twilioLogger = createScopedLogger('twilio-config');

/**
 * Default Twilio status response when not configured or error
 */
const DEFAULT_TWILIO_STATUS: TwilioStatusResponse = {
  ownConfig: {
    configured: false,
    enabled: false,
    validated: false,
    validatedAt: null,
    phoneNumber: null,
    accountSidLast4: null,
    friendlyName: null,
    lastError: null,
    lastErrorAt: null,
    needsRevalidation: false,
    circuitOpen: false,
    circuitOpensAt: null,
    monthlyLimit: null,
    currentMonthUsage: 0,
  },
  activeConfig: null,
  fallbackChain: [],
};

/**
 * Get Twilio status for a client or agency
 */
export function useTwilioStatus(entityId: string | null, level: 'client' | 'agency' = 'client') {
  return useQuery({
    queryKey: ['twilio-status', level, entityId],
    queryFn: async (): Promise<TwilioStatusResponse> => {
      if (!entityId) {
        // Return default state instead of throwing
        return DEFAULT_TWILIO_STATUS;
      }
      
      try {
        const data = await callEdgeFunction<TwilioStatusResponse & { success?: boolean; error?: string }>(
          Endpoints.telephony.getStatus,
          { level, entityId }
        );
        
        if (!data?.success) {
          // Log API-level error
          await twilioLogger.warning(`Twilio status API returned error: ${data?.error}`, {
            level,
            entityId,
            apiError: data?.error,
          });
          return DEFAULT_TWILIO_STATUS;
        }
        
        return data;
      } catch (err: any) {
        // Log error to error_logs table
        await logApiError('get-twilio-status', err, {
          method: 'POST',
          requestBody: { level, entityId },
        });
        // Log exception
        await twilioLogger.error(err instanceof Error ? err : new Error(String(err)), {
          operation: 'get-twilio-status',
          level,
          entityId,
        });
        // Return default state on any error
        return DEFAULT_TWILIO_STATUS;
      }
    },
    enabled: !!entityId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
    retry: false, // Don't retry - if edge function doesn't exist, fail gracefully
  });
}

/**
 * Test Twilio connection without saving
 */
export function useTestTwilioConnection() {
  return useMutation({
    mutationFn: async (params: {
      accountSid: string;
      authToken: string;
      phoneNumber?: string;
    }): Promise<TwilioTestResult> => {
      try {
        const data = await callEdgeFunction<TwilioTestResult>(
          Endpoints.telephony.testConnection,
          params
        );
        
        // Log failed tests as warnings
        if (!data?.success) {
          await twilioLogger.warning(`Twilio connection test failed: ${data?.error}`, {
            accountSidPrefix: params.accountSid?.substring(0, 10),
            phoneNumber: params.phoneNumber,
            errorCode: data?.errorCode,
          });
        }
        
        return data;
      } catch (err) {
        // Log error
        await logApiError('test-twilio-connection', err, {
          method: 'POST',
          requestBody: { accountSid: params.accountSid?.substring(0, 10) + '...', hasAuthToken: !!params.authToken, phoneNumber: params.phoneNumber },
        });
        // Log exception
        await twilioLogger.error(err instanceof Error ? err : new Error(String(err)), {
          operation: 'test-twilio-connection',
          accountSidPrefix: params.accountSid?.substring(0, 10),
        });
        throw err;
      }
    },
    onError: (error: Error) => {
      console.error('Twilio test error:', error);
    },
  });
}

/**
 * Update Twilio configuration
 */
export function useUpdateTwilioConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: UpdateTwilioConfigParams): Promise<{ success: boolean; message?: string; error?: string }> => {
      try {
        const data = await callEdgeFunction<{ success: boolean; message?: string; error?: string; errorCode?: string }>(
          Endpoints.telephony.updateConfig,
          {
            level: params.level,
            entityId: params.entityId,
            accountSid: params.config.accountSid,
            authToken: params.config.authToken,
            phoneNumber: params.config.phoneNumber,
            enabled: params.config.enabled,
            friendlyName: params.config.friendlyName,
            monthlyLimit: params.config.monthlyLimit,
            skipValidation: params.skipValidation,
            expectedVersion: params.expectedVersion,
          }
        );
        
        if (!data?.success) {
          // Log API error
          await twilioLogger.error(`Twilio config update failed: ${data?.error}`, {
            level: params.level,
            entityId: params.entityId,
            errorCode: data?.errorCode,
          });
          throw new Error(data?.error || 'Failed to update Twilio configuration');
        }
        
        return data;
      } catch (err) {
        // Log error
        await logApiError('update-twilio-config', err, {
          method: 'POST',
          requestBody: { level: params.level, entityId: params.entityId, phoneNumber: params.config.phoneNumber },
        });
        // Log exception
        await twilioLogger.error(err instanceof Error ? err : new Error(String(err)), {
          operation: 'update-twilio-config',
          level: params.level,
          entityId: params.entityId,
        });
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['twilio-status', variables.level, variables.entityId] });
      queryClient.invalidateQueries({ queryKey: ['twilio-overview-stats'] });
      toast.success('Twilio configuration saved successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save Twilio configuration');
    },
  });
}

/**
 * Fetch available phone numbers from Twilio account
 */
export function useFetchTwilioNumbers(accountSid: string, authToken: string) {
  return useQuery({
    queryKey: ['twilio-numbers', accountSid],
    queryFn: async (): Promise<TwilioPhoneNumber[]> => {
      try {
        const data = await callEdgeFunction<{ success: boolean; numbers?: TwilioPhoneNumber[]; error?: string }>(
          Endpoints.telephony.fetchNumbers,
          { accountSid, authToken }
        );
        
        if (!data?.success) {
          // Log API error
          await twilioLogger.warning(`Fetch Twilio numbers failed: ${data?.error}`, {
            accountSidPrefix: accountSid?.substring(0, 10),
          });
          throw new Error(data?.error || 'Unable to fetch numbers. Please use manual entry.');
        }
        
        return data.numbers || [];
      } catch (err: any) {
        // Log error
        await logApiError('fetch-twilio-numbers', err, {
          method: 'POST',
          requestBody: { accountSidPrefix: accountSid?.substring(0, 10) + '...' },
        });
        // Log the exception
        await twilioLogger.error(err instanceof Error ? err : new Error(String(err)), {
          operation: 'fetch-twilio-numbers',
          accountSidPrefix: accountSid?.substring(0, 10),
        });
        
        // Re-throw with a user-friendly message
        if (err.message?.includes('Failed to send a request')) {
          throw new Error('Phone number fetch unavailable. Please use manual entry.');
        }
        throw err;
      }
    },
    enabled: !!accountSid && !!authToken && accountSid.length >= 34,
    staleTime: 60000, // 1 minute
    retry: false, // Don't retry - if edge function doesn't exist, fail gracefully
  });
}

/**
 * Disable Twilio configuration (without removing credentials)
 */
export function useDisableTwilioConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      level: 'client' | 'agency' | 'admin';
      entityId?: string;
    }): Promise<void> => {
      try {
        const data = await callEdgeFunction<{ success: boolean; error?: string }>(
          Endpoints.telephony.disableConfig,
          params
        );
        
        if (!data?.success) {
          await twilioLogger.error(`Disable Twilio config failed: ${data?.error}`, params);
          throw new Error(data?.error || 'Failed to disable Twilio');
        }
      } catch (err) {
        await logApiError('disable-twilio-config', err, { method: 'POST', requestBody: params });
        await twilioLogger.error(err instanceof Error ? err : new Error(String(err)), {
          operation: 'disable-twilio-config',
          ...params,
        });
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['twilio-status', variables.level, variables.entityId] });
      toast.success('Twilio configuration disabled');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to disable Twilio');
    },
  });
}

/**
 * Remove Twilio configuration completely
 */
export function useRemoveTwilioConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      level: 'client' | 'agency' | 'admin';
      entityId?: string;
    }): Promise<void> => {
      try {
        const data = await callEdgeFunction<{ success: boolean; error?: string }>(
          Endpoints.telephony.removeConfig,
          { ...params, confirmRemoval: true }
        );
        
        if (!data?.success) {
          await twilioLogger.error(`Remove Twilio config failed: ${data?.error}`, params);
          throw new Error(data?.error || 'Failed to remove Twilio');
        }
      } catch (err) {
        await logApiError('remove-twilio-config', err, { method: 'POST', requestBody: params });
        await twilioLogger.error(err instanceof Error ? err : new Error(String(err)), {
          operation: 'remove-twilio-config',
          ...params,
        });
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['twilio-status', variables.level, variables.entityId] });
      queryClient.invalidateQueries({ queryKey: ['twilio-overview-stats'] });
      toast.success('Twilio configuration removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove Twilio');
    },
  });
}

/**
 * Default health stats when not available
 */
const DEFAULT_HEALTH_STATS: TwilioHealthStats = {
  totalAgencies: 0,
  agenciesWithOwnTwilio: 0,
  totalClients: 0,
  clientsWithOwnTwilio: 0,
  clientsUsingAgencyFallback: 0,
  clientsUsingAdminFallback: 0,
  staleValidationCount: 0,
  recentFailureCount: 0,
  openCircuitCount: 0,
};

/**
 * Get platform-wide Twilio health statistics (admin only)
 */
export function useTwilioOverviewStats() {
  return useQuery({
    queryKey: ['twilio-overview-stats'],
    queryFn: async (): Promise<TwilioHealthStats> => {
      try {
        const data = await callEdgeFunction<{ summary?: TwilioHealthStats }>(
          Endpoints.telephony.adminHealthReport,
          {}
        );
        
        return data?.summary || DEFAULT_HEALTH_STATS;
      } catch (err) {
        await logApiError('admin-twilio-health-report', err, { method: 'POST' });
        await twilioLogger.error(err instanceof Error ? err : new Error(String(err)), {
          operation: 'admin-twilio-health-report',
        });
        return DEFAULT_HEALTH_STATS;
      }
    },
    staleTime: 60000, // 1 minute
    retry: false, // Don't retry
  });
}

/**
 * Revalidate Twilio credentials
 */
export function useRevalidateTwilio() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      level: 'client' | 'agency' | 'admin';
      entityId?: string;
    }): Promise<void> => {
      try {
        const data = await callEdgeFunction<{ success: boolean; error?: string }>(
          Endpoints.telephony.revalidate,
          params
        );
        
        if (!data?.success) {
          await twilioLogger.error(`Revalidate Twilio failed: ${data?.error}`, params);
          throw new Error(data?.error || 'Revalidation failed');
        }
      } catch (err) {
        await logApiError('revalidate-twilio', err, { method: 'POST', requestBody: params });
        await twilioLogger.error(err instanceof Error ? err : new Error(String(err)), {
          operation: 'revalidate-twilio',
          ...params,
        });
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['twilio-status', variables.level, variables.entityId] });
      toast.success('Twilio credentials validated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to validate credentials');
    },
  });
}
