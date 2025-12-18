/**
 * useOptInStatus
 * 
 * Real-time hook for call center dashboard to track SMS opt-in status.
 * Subscribes to Supabase Realtime channel for instant updates.
 * Also polls the database as a fallback.
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@core/services/supabase";
import { logger } from "@/core/services/logger";

export type OptInStatus = 'not_sent' | 'pending' | 'opted_in' | 'opted_out' | 'invalid_response';

export interface OptInState {
  status: OptInStatus;
  sentAt: string | null;
  response: string | null;
  responseAt: string | null;
  isLoading: boolean;
}

interface UseOptInStatusOptions {
  pollInterval?: number; // ms, default 3000
  enableRealtime?: boolean; // default true
}

export function useOptInStatus(
  callSessionId: string | null, 
  recipientId: string | null,
  options: UseOptInStatusOptions = {}
) {
  const { pollInterval = 3000, enableRealtime = true } = options;
  
  const [state, setState] = useState<OptInState>({
    status: 'not_sent',
    sentAt: null,
    response: null,
    responseAt: null,
    isLoading: false,
  });

  // Fetch current status from database
  const fetchStatus = useCallback(async () => {
    if (!recipientId) return;

    try {
      const { data, error } = await supabase
        .from("recipients")
        .select("sms_opt_in_status, sms_opt_in_sent_at, sms_opt_in_response, sms_opt_in_response_at")
        .eq("id", recipientId)
        .single();

      if (error) {
        logger.error("[useOptInStatus] Fetch error:", error);
        return;
      }

      if (data) {
        setState(prev => ({
          ...prev,
          status: (data.sms_opt_in_status as OptInStatus) || 'not_sent',
          sentAt: data.sms_opt_in_sent_at,
          response: data.sms_opt_in_response,
          responseAt: data.sms_opt_in_response_at,
          isLoading: false,
        }));
      }
    } catch (error) {
      logger.error("[useOptInStatus] Fetch exception:", error);
    }
  }, [recipientId]);

  // Initial fetch
  useEffect(() => {
    if (recipientId) {
      setState(prev => ({ ...prev, isLoading: true }));
      fetchStatus();
    } else {
      setState({
        status: 'not_sent',
        sentAt: null,
        response: null,
        responseAt: null,
        isLoading: false,
      });
    }
  }, [recipientId, fetchStatus]);

  // Subscribe to real-time updates via call session channel
  useEffect(() => {
    if (!enableRealtime || !callSessionId) return;

    const channel = supabase
      .channel(`opt_in_status:${callSessionId}`)
      .on('broadcast', { event: 'status_update' }, (payload) => {
        logger.debug("[useOptInStatus] Real-time update:", payload.payload);
        const data = payload.payload;
        setState(prev => ({
          ...prev,
          status: data.status || prev.status,
          sentAt: data.sent_at || prev.sentAt,
          response: data.response ?? prev.response,
          responseAt: data.response_at ?? prev.responseAt,
          isLoading: false,
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [callSessionId, enableRealtime]);

  // Also subscribe to recipient-specific channel as backup
  useEffect(() => {
    if (!enableRealtime || !recipientId) return;

    const channel = supabase
      .channel(`opt_in_recipient:${recipientId}`)
      .on('broadcast', { event: 'status_update' }, (payload) => {
        logger.debug("[useOptInStatus] Recipient channel update:", payload.payload);
        const data = payload.payload;
        setState(prev => ({
          ...prev,
          status: data.status || prev.status,
          sentAt: data.sent_at || prev.sentAt,
          response: data.response ?? prev.response,
          responseAt: data.response_at ?? prev.responseAt,
          isLoading: false,
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recipientId, enableRealtime]);

  // Polling fallback - especially useful when status is pending
  useEffect(() => {
    if (!recipientId || state.status !== 'pending') return;

    const interval = setInterval(() => {
      fetchStatus();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [recipientId, state.status, pollInterval, fetchStatus]);

  // Manual refresh function
  const refresh = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: true }));
    fetchStatus();
  }, [fetchStatus]);

  return {
    ...state,
    refresh,
    isPending: state.status === 'pending',
    isOptedIn: state.status === 'opted_in',
    isOptedOut: state.status === 'opted_out',
    canProceed: state.status === 'opted_in',
  };
}

