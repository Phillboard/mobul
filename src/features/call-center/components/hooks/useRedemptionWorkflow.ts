/**
 * Redemption Workflow State Machine Hook
 * 
 * Manages the state and transitions for the call center gift card redemption flow.
 * Extracted from CallCenterRedemptionPanel for better maintainability.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { callEdgeFunction } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';
import { useOptInStatus } from '@/features/settings/hooks';
import { logger } from '@/core/services/logger';

// Types
export type WorkflowStep = 'code' | 'optin' | 'contact' | 'condition' | 'complete';
export type VerificationMethod = 'sms' | 'email' | 'skipped';
export type DispositionType = 'positive' | 'negative';

export interface CampaignGiftCardConfig {
  id: string;
  brand_id: string;
  denomination: number;
  condition_number: number;
}

export interface CampaignCondition {
  id: string;
  condition_number: number;
  condition_name: string;
  is_active: boolean;
  brand_id?: string | null;
  card_value?: number | null;
}

export interface Campaign {
  id: string;
  name: string;
  status?: string;
  client_id?: string;
  sms_opt_in_message?: string;
  clients?: { id: string; name: string };
  campaign_conditions?: CampaignCondition[];
  campaign_gift_card_config?: CampaignGiftCardConfig[];
}

export interface RecipientData {
  id: string;
  redemption_code: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  approval_status: string;
  campaign_id?: string;
  campaign?: Campaign;
  audience?: { id: string; name: string };
  _alreadyProvisioned?: boolean;
  _existingCard?: ExistingCard;
}

export interface ExistingCard {
  id: string;
  card_code: string;
  card_number: string | null;
  denomination: number;
  expiration_date: string | null;
  gift_card_brands?: {
    id: string;
    brand_name: string;
    logo_url: string | null;
    balance_check_url: string | null;
  } | null;
}

export interface GiftCardData {
  id: string;
  card_code: string;
  card_number: string | null;
  card_value?: number;
  expiration_date: string | null;
  gift_card_pools?: {
    id: string;
    pool_name: string;
    card_value: number;
    provider: string | null;
    gift_card_brands?: {
      brand_name: string;
      logo_url: string | null;
      balance_check_url: string | null;
    } | null;
  };
}

export interface ProvisionResult {
  success: boolean;
  recipient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
  };
  giftCard: GiftCardData;
}

export interface ProvisioningError {
  message: string;
  errorCode?: string;
  requestId?: string;
  canRetry?: boolean;
  requiresCampaignEdit?: boolean;
}

export interface WorkflowState {
  step: WorkflowStep;
  redemptionCode: string;
  recipient: RecipientData | null;
  cellPhone: string;
  callSessionId: string | null;
  phone: string;
  selectedConditionId: string;
  verificationMethod: VerificationMethod;
  selectedDisposition: string;
  emailVerificationSent: boolean;
  showSkipDisposition: boolean;
  result: ProvisionResult | null;
  provisioningError: ProvisioningError | null;
  isSimulatedMode: boolean;
  isSimulating: boolean;
  simulationCountdown: number;
}

const initialState: WorkflowState = {
  step: 'code',
  redemptionCode: '',
  recipient: null,
  cellPhone: '',
  callSessionId: null,
  phone: '',
  selectedConditionId: '',
  verificationMethod: 'sms',
  selectedDisposition: '',
  emailVerificationSent: false,
  showSkipDisposition: false,
  result: null,
  provisioningError: null,
  isSimulatedMode: false,
  isSimulating: false,
  simulationCountdown: 0,
};

export interface UseRedemptionWorkflowOptions {
  onRecipientLoaded?: (data: {
    clientId?: string;
    campaignId?: string;
    recipient: RecipientData;
    step: WorkflowStep;
  }) => void;
}

export function useRedemptionWorkflow(options: UseRedemptionWorkflowOptions = {}) {
  const { onRecipientLoaded } = options;
  
  // State
  const [state, setState] = useState<WorkflowState>(initialState);
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Opt-in status tracking
  const optInStatus = useOptInStatus(state.callSessionId, state.recipient?.id || null);

  // Derived values
  const campaign = state.recipient?.campaign;
  const clientName = campaign?.clients?.name || 'Your provider';
  const activeConditions = campaign?.campaign_conditions?.filter(c => c.is_active) || [];
  const selectedCondition = activeConditions.find(c => c.id === state.selectedConditionId);
  const isConditionConfigured = selectedCondition
    ? (selectedCondition.brand_id != null && selectedCondition.card_value != null && selectedCondition.card_value > 0)
    : false;

  // State update helpers
  const updateState = useCallback((updates: Partial<WorkflowState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const setStep = useCallback((step: WorkflowStep) => {
    updateState({ step });
  }, [updateState]);

  // Reset workflow
  const reset = useCallback(() => {
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
    setState(initialState);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
      }
    };
  }, []);

  // Auto-fill phone from recipient
  useEffect(() => {
    if (state.recipient?.phone && !state.cellPhone) {
      updateState({
        phone: state.recipient.phone,
        cellPhone: state.recipient.phone,
      });
    }
  }, [state.recipient, state.cellPhone, updateState]);

  // Code Lookup Mutation
  const lookupMutation = useMutation({
    mutationFn: async (code: string) => {
      logger.debug('[REDEMPTION] Looking up code:', code.toUpperCase());

      const { data: recipient, error: recipientError } = await supabase
        .from('recipients')
        .select(`
          *,
          campaign:campaigns (
            id,
            name,
            status,
            client_id,
            sms_opt_in_message,
            clients (id, name),
            campaign_conditions (*),
            campaign_gift_card_config (*)
          ),
          audience:audiences (
            id,
            name
          )
        `)
        .eq('redemption_code', code.toUpperCase())
        .maybeSingle();

      if (!recipient) {
        throw new Error('Code not found. Please verify the code and ensure the contact has been added to an active campaign.');
      }

      // Check campaign status
      const foundCampaign = recipient.campaign;
      if (foundCampaign) {
        const status = foundCampaign.status;
        const activeStatuses = ['in_production', 'mailed', 'scheduled'];
        
        if (!activeStatuses.includes(status)) {
          if (status === 'draft') {
            throw new Error("This contact is in a draft campaign that hasn't been activated yet.");
          } else if (status === 'completed') {
            throw new Error('This campaign has been completed. The redemption period has ended.');
          } else {
            throw new Error(`This campaign has status '${status}' which is not eligible for redemption.`);
          }
        }
      }

      // Check for existing card
      const { data: existingCard } = await supabase
        .from('gift_card_inventory')
        .select(`
          id,
          card_code,
          card_number,
          denomination,
          expiration_date,
          gift_card_brands (
            id,
            brand_name,
            logo_url,
            balance_check_url
          )
        `)
        .eq('assigned_to_recipient_id', recipient.id)
        .eq('status', 'assigned')
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingCard) {
        return {
          ...recipient,
          _alreadyProvisioned: true,
          _existingCard: existingCard,
        } as RecipientData;
      }

      return recipient as RecipientData;
    },
    onSuccess: (data) => {
      updateState({ recipient: data });

      if (data._alreadyProvisioned && data._existingCard) {
        const existingCard = data._existingCard;
        const brand = existingCard.gift_card_brands;

        const existingResult: ProvisionResult = {
          success: true,
          recipient: {
            id: data.id,
            firstName: data.first_name || '',
            lastName: data.last_name || '',
            phone: data.phone,
            email: data.email,
          },
          giftCard: {
            id: existingCard.id,
            card_code: existingCard.card_code,
            card_number: existingCard.card_number,
            card_value: existingCard.denomination,
            expiration_date: existingCard.expiration_date,
            gift_card_pools: {
              id: existingCard.id,
              pool_name: brand?.brand_name || 'Gift Card',
              card_value: existingCard.denomination,
              provider: brand?.brand_name || null,
              gift_card_brands: brand ? {
                brand_name: brand.brand_name,
                logo_url: brand.logo_url,
                balance_check_url: brand.balance_check_url,
              } : null,
            },
          },
        };

        updateState({
          result: existingResult,
          step: 'complete',
        });
        return;
      }

      updateState({ step: 'optin' });

      const recipientCampaign = data.campaign;
      if (onRecipientLoaded && recipientCampaign) {
        onRecipientLoaded({
          clientId: recipientCampaign.client_id,
          campaignId: recipientCampaign.id,
          recipient: data,
          step: 'optin',
        });
      }
    },
  });

  // Provision Gift Card Mutation
  const provisionMutation = useMutation({
    mutationFn: async () => {
      updateState({ provisioningError: null });

      if (!state.recipient || !state.selectedConditionId) {
        throw new Error('Missing required information');
      }

      const provCampaign = state.recipient.campaign;
      const condition = provCampaign?.campaign_conditions?.find(
        c => c.id === state.selectedConditionId
      );

      if (!provCampaign?.id) {
        throw new Error('Campaign not found for recipient');
      }

      if (!condition?.brand_id || !condition?.card_value) {
        throw new Error('Gift card configuration missing for this condition.');
      }

      console.log('[Provision] Calling Edge Function with:', {
        recipientId: state.recipient.id,
        campaignId: provCampaign.id,
        brandId: condition.brand_id,
        denomination: condition.card_value,
        conditionId: state.selectedConditionId,
      });

      let data: any;
      try {
        data = await callEdgeFunction(
          Endpoints.giftCards.provisionForCallCenter,
          {
            recipientId: state.recipient.id,
            campaignId: provCampaign.id,
            brandId: condition.brand_id,
            denomination: condition.card_value,
            conditionId: state.selectedConditionId,
          }
        );
        console.log('[Provision] Edge Function response:', { data });
      } catch (error: any) {
        console.error('[Provision] Edge Function error:', error);
        
        const provError: ProvisioningError = {
          message: error.message || 'Edge Function error',
          errorCode: error.code,
          canRetry: true,
        };
        updateState({ provisioningError: provError });
        throw error;
      }

      if (!data?.success) {
        const provError: ProvisioningError = {
          message: data?.message || data?.error || 'Provisioning failed',
          errorCode: data?.errorCode,
          requestId: data?.requestId,
          canRetry: data?.canRetry,
          requiresCampaignEdit: data?.requiresCampaignEdit,
        };
        updateState({ provisioningError: provError });
        throw new Error(data?.message || data?.error || 'Provisioning failed');
      }

      const transformedResult: ProvisionResult = {
        success: true,
        recipient: {
          id: state.recipient.id,
          firstName: state.recipient.first_name || '',
          lastName: state.recipient.last_name || '',
          phone: state.recipient.phone,
          email: state.recipient.email,
        },
        giftCard: {
          id: data.card?.id || '',
          card_code: data.card?.cardCode || '',
          card_number: data.card?.cardNumber || null,
          card_value: data.card?.denomination || 0,
          expiration_date: data.card?.expirationDate || null,
          gift_card_pools: {
            id: data.card?.id || '',
            pool_name: data.card?.brandName || 'Gift Card',
            card_value: data.card?.denomination || 0,
            provider: data.card?.brandName,
            gift_card_brands: {
              brand_name: data.card?.brandName || 'Gift Card',
              logo_url: data.card?.brandLogo || null,
              balance_check_url: null,
            },
          },
        },
      };

      return transformedResult;
    },
    onSuccess: (data) => {
      updateState({
        result: data,
        provisioningError: null,
        step: 'complete',
      });
    },
    onError: (error: Error) => {
      if (!state.provisioningError) {
        updateState({
          provisioningError: {
            message: error.message || 'Unknown error occurred',
            canRetry: true,
          },
        });
      }
    },
  });

  // Send opt-in SMS
  const sendOptInSms = useCallback(async () => {
    if (!state.cellPhone || !state.recipient || !campaign) return;

    try {
      const data = await callEdgeFunction<{ error?: string }>(
        Endpoints.messaging.sendOptIn,
        {
          recipient_id: state.recipient.id,
          campaign_id: campaign.id,
          call_session_id: state.callSessionId,
          phone: state.cellPhone,
          client_name: clientName,
          custom_message: campaign.sms_opt_in_message || undefined,
        }
      );

      if (data.error) throw new Error(data.error);

      updateState({ phone: state.cellPhone });
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Please try again';
      return { success: false, error: message };
    }
  }, [state.cellPhone, state.recipient, campaign, state.callSessionId, clientName, updateState]);

  // Simulate SMS opt-in
  const simulateSmsOptIn = useCallback(async () => {
    console.log('[SimulateOptIn] Starting simulation', {
      hasCellPhone: !!state.cellPhone,
      cellPhone: state.cellPhone,
      hasRecipient: !!state.recipient,
      recipientId: state.recipient?.id,
      hasCampaign: !!campaign,
      campaignId: campaign?.id,
    });
    
    if (!state.cellPhone || !state.recipient || !campaign) {
      console.warn('[SimulateOptIn] Missing required data, aborting');
      return;
    }

    updateState({
      isSimulating: true,
      isSimulatedMode: true,
      simulationCountdown: 10,
      phone: state.cellPhone,
    });

    await supabase
      .from('recipients')
      .update({
        sms_opt_in_status: 'pending',
        sms_opt_in_sent_at: new Date().toISOString(),
        verification_method: 'sms',
      })
      .eq('id', state.recipient.id);

    simulationTimerRef.current = setInterval(() => {
      setState(prev => {
        if (prev.simulationCountdown <= 1) {
          if (simulationTimerRef.current) {
            clearInterval(simulationTimerRef.current);
            simulationTimerRef.current = null;
          }
          // Complete simulation
          completeSimulation();
          return { ...prev, simulationCountdown: 0 };
        }
        return { ...prev, simulationCountdown: prev.simulationCountdown - 1 };
      });
    }, 1000);
  }, [state.cellPhone, state.recipient, campaign, updateState]);

  const completeSimulation = useCallback(async () => {
    if (!state.recipient) return;

    await supabase
      .from('recipients')
      .update({
        sms_opt_in_status: 'opted_in',
        sms_opt_in_response: 'YES (SIMULATED)',
        sms_opt_in_response_at: new Date().toISOString(),
      })
      .eq('id', state.recipient.id);

    updateState({ isSimulating: false });
    optInStatus.refresh();
  }, [state.recipient, updateState, optInStatus]);

  // Send email verification
  const sendEmailVerification = useCallback(async () => {
    if (!state.recipient?.email || !campaign) {
      return { success: false, error: 'No email address on file' };
    }

    try {
      const data = await callEdgeFunction<{ error?: string }>(
        Endpoints.messaging.sendVerificationEmail,
        {
          recipient_id: state.recipient.id,
          campaign_id: campaign.id,
          email: state.recipient.email,
          client_name: clientName,
          recipient_name: `${state.recipient.first_name || ''} ${state.recipient.last_name || ''}`.trim(),
        }
      );

      if (data?.error) throw new Error(data.error);

      updateState({
        emailVerificationSent: true,
        verificationMethod: 'email',
      });

      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Please try again';
      return { success: false, error: message };
    }
  }, [state.recipient, campaign, clientName, updateState]);

  // Handle skip disposition
  const handleSkipDisposition = useCallback(async (disposition: string, isPositive: boolean) => {
    if (!state.recipient || !campaign) return { success: false };

    try {
      await supabase
        .from('recipients')
        .update({
          verification_method: 'skipped',
          disposition: disposition,
          approval_status: isPositive ? 'pending' : 'rejected',
        })
        .eq('id', state.recipient.id);

      if (isPositive) {
        updateState({
          verificationMethod: 'skipped',
          selectedDisposition: disposition,
          showSkipDisposition: false,
          step: 'contact',
        });
      } else {
        reset();
      }

      return { success: true, isPositive };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to record disposition';
      return { success: false, error: message };
    }
  }, [state.recipient, campaign, updateState, reset]);

  return {
    // State
    state,
    updateState,
    setStep,
    reset,
    
    // Derived values
    campaign,
    clientName,
    activeConditions,
    selectedCondition,
    isConditionConfigured,
    optInStatus,
    
    // Mutations
    lookupMutation,
    provisionMutation,
    
    // Actions
    sendOptInSms,
    simulateSmsOptIn,
    sendEmailVerification,
    handleSkipDisposition,
  };
}

export type UseRedemptionWorkflowReturn = ReturnType<typeof useRedemptionWorkflow>;
