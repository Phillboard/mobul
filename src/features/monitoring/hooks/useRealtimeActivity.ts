/**
 * Real-time Activity Hook
 * 
 * Subscribes to Supabase Realtime for live activity updates.
 * Automatically scopes subscriptions based on user's organization/client.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@core/services/supabase';
import { useAuth } from '@core/auth/AuthProvider';
import { useTenant } from '@/contexts/TenantContext';
import type { ActivityLogEntry, ActivityCategory, RealtimeActivityEvent } from '../types/monitoring.types';

interface UseRealtimeActivityOptions {
  /** Filter by specific categories */
  categories?: ActivityCategory[];
  /** Maximum number of events to keep in state */
  maxEvents?: number;
  /** Whether to enable the subscription */
  enabled?: boolean;
  /** Callback when new event arrives */
  onEvent?: (event: ActivityLogEntry) => void;
}

interface UseRealtimeActivityReturn {
  /** Recent activity events (newest first) */
  events: ActivityLogEntry[];
  /** Whether the subscription is active */
  isConnected: boolean;
  /** Connection error if any */
  error: Error | null;
  /** Clear all events */
  clearEvents: () => void;
  /** Manually reconnect */
  reconnect: () => void;
}

export function useRealtimeActivity(
  options: UseRealtimeActivityOptions = {}
): UseRealtimeActivityReturn {
  const { categories, maxEvents = 100, enabled = true, onEvent } = options;
  
  const { user, roles } = useAuth();
  const { currentOrg } = useTenant();
  
  const [events, setEvents] = useState<ActivityLogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  // Determine scope based on user role
  const isAdmin = roles.some(r => r.role === 'admin');
  const isAgencyOwner = roles.some(r => r.role === 'agency_owner');
  
  // Build filter based on user's scope
  const getFilter = useCallback(() => {
    if (isAdmin) {
      // Admins see everything - no filter
      return undefined;
    }
    
    if (isAgencyOwner && currentOrg?.type === 'agency') {
      // Agency owners see their org
      return `organization_id=eq.${currentOrg.id}`;
    }
    
    // Client users see their client
    if (currentOrg?.id) {
      return `client_id=eq.${currentOrg.id}`;
    }
    
    return undefined;
  }, [isAdmin, isAgencyOwner, currentOrg]);

  // Subscribe to realtime changes
  const subscribe = useCallback(() => {
    if (!user || !enabled) return;

    // Unsubscribe from existing channel
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    const filter = getFilter();
    const channelName = `activity:${currentOrg?.id || 'global'}:${Date.now()}`;

    try {
      const channel = supabase.channel(channelName);
      
      // Build subscription config
      const subscriptionConfig: Parameters<typeof channel.on>[1] = {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_log',
      };
      
      // Add filter if not admin
      if (filter) {
        subscriptionConfig.filter = filter;
      }

      channel
        .on('postgres_changes', subscriptionConfig, (payload) => {
          const newEntry = payload.new as ActivityLogEntry;
          
          // Filter by categories if specified
          if (categories?.length && !categories.includes(newEntry.category)) {
            return;
          }
          
          // Add to events list
          setEvents(prev => {
            const updated = [newEntry, ...prev];
            return updated.slice(0, maxEvents);
          });
          
          // Call callback if provided
          onEventRef.current?.(newEntry);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setError(null);
          } else if (status === 'CHANNEL_ERROR') {
            setIsConnected(false);
            setError(new Error('Failed to subscribe to realtime channel'));
          } else if (status === 'TIMED_OUT') {
            setIsConnected(false);
            setError(new Error('Realtime subscription timed out'));
          }
        });

      subscriptionRef.current = channel;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setIsConnected(false);
    }
  }, [user, enabled, getFilter, categories, maxEvents, currentOrg?.id]);

  // Initial subscription
  useEffect(() => {
    subscribe();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [subscribe]);

  // Clear events
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Reconnect
  const reconnect = useCallback(() => {
    subscribe();
  }, [subscribe]);

  return {
    events,
    isConnected,
    error,
    clearEvents,
    reconnect,
  };
}

/**
 * Hook for subscribing to specific event types
 */
export function useRealtimeAlerts(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const [alerts, setAlerts] = useState<ActivityLogEntry[]>([]);
  const { currentOrg } = useTenant();

  useEffect(() => {
    if (!enabled) return;

    const filter = currentOrg?.id 
      ? `organization_id=eq.${currentOrg.id}` 
      : undefined;

    const channel = supabase
      .channel(`alerts:${currentOrg?.id || 'global'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
          filter: filter ? `${filter},severity=in.(warning,error,critical)` : 'severity=in.(warning,error,critical)',
        },
        (payload) => {
          const entry = payload.new as ActivityLogEntry;
          setAlerts(prev => [entry, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [enabled, currentOrg?.id]);

  const clearAlerts = useCallback(() => setAlerts([]), []);
  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  return { alerts, clearAlerts, dismissAlert };
}
