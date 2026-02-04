/**
 * Activity Logger Hook
 * 
 * React hook for logging activities with automatic user and tenant context.
 */

import { useCallback, useMemo } from 'react';
import { useAuth } from '@core/auth/AuthProvider';
import { useTenant } from '@/contexts/TenantContext';
import { activityLogger, type LogActivityParams } from './activityLogger';

interface UseActivityLoggerReturn {
  /** Log an activity with automatic context */
  logActivity: (params: Omit<LogActivityParams, 'user_id' | 'organization_id' | 'client_id'> & {
    organization_id?: string;
    client_id?: string;
  }) => Promise<string | null>;
  
  /** Log a gift card event */
  logGiftCard: (
    event_type: string,
    status: LogActivityParams['status'],
    description: string,
    context?: Partial<LogActivityParams>
  ) => Promise<string | null>;
  
  /** Log a campaign event */
  logCampaign: (
    event_type: string,
    status: LogActivityParams['status'],
    description: string,
    context?: Partial<LogActivityParams>
  ) => Promise<string | null>;
  
  /** Log a user event */
  logUser: (
    event_type: string,
    status: LogActivityParams['status'],
    description: string,
    context?: Partial<LogActivityParams>
  ) => Promise<string | null>;
}

export function useActivityLogger(): UseActivityLoggerReturn {
  const { user } = useAuth();
  const { currentOrg } = useTenant();

  // Get context values
  const userId = user?.id;
  const organizationId = currentOrg?.type === 'agency' ? currentOrg.id : currentOrg?.org_id;
  const clientId = currentOrg?.type === 'client' ? currentOrg.id : undefined;

  const logActivity = useCallback(async (
    params: Omit<LogActivityParams, 'user_id' | 'organization_id' | 'client_id'> & {
      organization_id?: string;
      client_id?: string;
    }
  ) => {
    return activityLogger.log({
      ...params,
      user_id: userId,
      organization_id: params.organization_id || organizationId,
      client_id: params.client_id || clientId,
    });
  }, [userId, organizationId, clientId]);

  const logGiftCard = useCallback(async (
    event_type: string,
    status: LogActivityParams['status'],
    description: string,
    context: Partial<LogActivityParams> = {}
  ) => {
    return activityLogger.logGiftCard(event_type, status, description, {
      user_id: userId,
      organization_id: context.organization_id || organizationId,
      client_id: context.client_id || clientId,
      ...context,
    });
  }, [userId, organizationId, clientId]);

  const logCampaign = useCallback(async (
    event_type: string,
    status: LogActivityParams['status'],
    description: string,
    context: Partial<LogActivityParams> = {}
  ) => {
    return activityLogger.logCampaign(event_type, status, description, {
      user_id: userId,
      organization_id: context.organization_id || organizationId,
      client_id: context.client_id || clientId,
      ...context,
    });
  }, [userId, organizationId, clientId]);

  const logUser = useCallback(async (
    event_type: string,
    status: LogActivityParams['status'],
    description: string,
    context: Partial<LogActivityParams> = {}
  ) => {
    return activityLogger.logUser(event_type, status, description, {
      user_id: userId,
      organization_id: context.organization_id || organizationId,
      client_id: context.client_id || clientId,
      ...context,
    });
  }, [userId, organizationId, clientId]);

  return useMemo(() => ({
    logActivity,
    logGiftCard,
    logCampaign,
    logUser,
  }), [logActivity, logGiftCard, logCampaign, logUser]);
}
