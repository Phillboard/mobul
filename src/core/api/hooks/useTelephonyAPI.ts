/**
 * Telephony API Hooks
 * 
 * TanStack Query hooks for ALL Twilio/telephony operations.
 * Covers number provisioning, configuration, and call handling.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction } from '../client';
import { Endpoints } from '../endpoints';

// ============================================================================
// Query Keys Factory
// ============================================================================

export const telephonyKeys = {
  all: ['telephony'] as const,
  status: () => ['telephony', 'status'] as const,
  numbers: () => ['telephony', 'numbers'] as const,
  availableNumbers: (areaCode?: string) => ['telephony', 'available', areaCode] as const,
  config: (clientId?: string) => ['telephony', 'config', clientId] as const,
  healthReport: () => ['telephony', 'health'] as const,
};

// ============================================================================
// Status Types
// ============================================================================

export interface TwilioStatusResponse {
  configured: boolean;
  accountSid?: string;
  phoneNumbers: number;
  messagingServiceSid?: string;
  status: 'active' | 'inactive' | 'error';
  lastVerified?: string;
  error?: string;
}

// ============================================================================
// Number Types
// ============================================================================

export interface FetchNumbersRequest {
  areaCode?: string;
  country?: string;
  capabilities?: ('sms' | 'voice' | 'mms')[];
  limit?: number;
}

export interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality?: string;
  region?: string;
  capabilities: {
    sms: boolean;
    voice: boolean;
    mms: boolean;
  };
  monthlyPrice?: number;
}

export interface FetchNumbersResponse {
  success: boolean;
  numbers: AvailableNumber[];
  error?: string;
}

export interface ProvisionNumberRequest {
  phoneNumber: string;
  clientId: string;
  friendlyName?: string;
  voiceWebhookUrl?: string;
  smsWebhookUrl?: string;
}

export interface ProvisionNumberResponse {
  success: boolean;
  phoneNumber?: string;
  sid?: string;
  error?: string;
}

export interface ReleaseNumberRequest {
  phoneNumber: string;
  clientId?: string;
}

export interface ReleaseNumberResponse {
  success: boolean;
  released: boolean;
  error?: string;
}

export interface AssignTrackedNumbersRequest {
  campaignId: string;
  count: number;
  clientId: string;
}

export interface AssignTrackedNumbersResponse {
  success: boolean;
  assigned: number;
  numbers: string[];
  error?: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface TwilioConfigRequest {
  clientId: string;
  accountSid?: string;
  authToken?: string;
  messagingServiceSid?: string;
  phoneNumber?: string;
}

export interface TwilioConfigResponse {
  success: boolean;
  configured: boolean;
  error?: string;
}

export interface ConfigureWebhooksRequest {
  clientId: string;
  phoneNumber: string;
  voiceWebhookUrl?: string;
  smsWebhookUrl?: string;
  statusCallbackUrl?: string;
}

export interface ConfigureWebhooksResponse {
  success: boolean;
  webhooksConfigured: boolean;
  error?: string;
}

export interface DisableConfigRequest {
  clientId: string;
  reason?: string;
}

export interface RemoveConfigRequest {
  clientId: string;
  confirm: boolean;
}

export interface RevalidateRequest {
  clientId: string;
}

export interface RevalidateResponse {
  success: boolean;
  valid: boolean;
  issues?: string[];
  error?: string;
}

// ============================================================================
// Test Types
// ============================================================================

export interface TestConnectionRequest {
  clientId?: string;
  testNumber?: string;
}

export interface TestConnectionResponse {
  success: boolean;
  accountValid: boolean;
  canSendSms: boolean;
  canMakeCalls: boolean;
  balance?: number;
  error?: string;
}

// ============================================================================
// Health Report Types
// ============================================================================

export interface HealthReportResponse {
  healthy: boolean;
  accounts: Array<{
    clientId: string;
    clientName: string;
    status: 'active' | 'inactive' | 'error';
    phoneNumbers: number;
    lastActivity?: string;
    issues?: string[];
  }>;
  summary: {
    totalAccounts: number;
    activeAccounts: number;
    totalNumbers: number;
    issuesCount: number;
  };
  generatedAt: string;
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Fetch available phone numbers.
 */
export function useFetchTwilioNumbers() {
  return useMutation({
    mutationFn: (request: FetchNumbersRequest) =>
      callEdgeFunction<FetchNumbersResponse>(
        Endpoints.telephony.fetchNumbers,
        request
      ),
  });
}

/**
 * Provision a new phone number.
 */
export function useProvisionTwilioNumber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ProvisionNumberRequest) =>
      callEdgeFunction<ProvisionNumberResponse>(
        Endpoints.telephony.provisionNumber,
        request
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: telephonyKeys.numbers() });
      queryClient.invalidateQueries({ queryKey: telephonyKeys.status() });
    },
  });
}

/**
 * Release a phone number.
 */
export function useReleaseTwilioNumber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ReleaseNumberRequest) =>
      callEdgeFunction<ReleaseNumberResponse>(
        Endpoints.telephony.releaseNumber,
        request
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: telephonyKeys.numbers() });
      queryClient.invalidateQueries({ queryKey: telephonyKeys.status() });
    },
  });
}

/**
 * Assign tracked phone numbers to a campaign.
 */
export function useAssignTrackedNumbers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: AssignTrackedNumbersRequest) =>
      callEdgeFunction<AssignTrackedNumbersResponse>(
        Endpoints.callCenter.assignTrackedNumbers,
        request
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: telephonyKeys.numbers() });
    },
  });
}

/**
 * Update Twilio configuration.
 */
export function useUpdateTwilioConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: TwilioConfigRequest) =>
      callEdgeFunction<TwilioConfigResponse>(
        Endpoints.telephony.updateConfig,
        request
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: telephonyKeys.config(variables.clientId) });
      queryClient.invalidateQueries({ queryKey: telephonyKeys.status() });
    },
  });
}

/**
 * Configure Twilio webhooks for a phone number.
 */
export function useConfigureTwilioWebhooks() {
  return useMutation({
    mutationFn: (request: ConfigureWebhooksRequest) =>
      callEdgeFunction<ConfigureWebhooksResponse>(
        Endpoints.telephony.configureWebhooks,
        request
      ),
  });
}

/**
 * Disable Twilio configuration.
 */
export function useDisableTwilioConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: DisableConfigRequest) =>
      callEdgeFunction<TwilioConfigResponse>(
        Endpoints.telephony.disableConfig,
        request
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: telephonyKeys.config(variables.clientId) });
      queryClient.invalidateQueries({ queryKey: telephonyKeys.status() });
    },
  });
}

/**
 * Remove Twilio configuration entirely.
 */
export function useRemoveTwilioConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RemoveConfigRequest) =>
      callEdgeFunction<TwilioConfigResponse>(
        Endpoints.telephony.removeConfig,
        request
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: telephonyKeys.config(variables.clientId) });
      queryClient.invalidateQueries({ queryKey: telephonyKeys.status() });
    },
  });
}

/**
 * Revalidate Twilio credentials.
 */
export function useRevalidateTwilio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RevalidateRequest) =>
      callEdgeFunction<RevalidateResponse>(
        Endpoints.telephony.revalidate,
        request
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: telephonyKeys.config(variables.clientId) });
    },
  });
}

/**
 * Test Twilio connection.
 */
export function useTestTwilioConnection() {
  return useMutation({
    mutationFn: (request: TestConnectionRequest) =>
      callEdgeFunction<TestConnectionResponse>(
        Endpoints.telephony.testConnection,
        request
      ),
  });
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get Twilio account status.
 */
export function useTwilioStatus(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: telephonyKeys.status(),
    queryFn: () =>
      callEdgeFunction<TwilioStatusResponse>(
        Endpoints.telephony.getStatus,
        {}
      ),
    enabled: options?.enabled !== false,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get admin Twilio health report.
 */
export function useTwilioHealthReport(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: telephonyKeys.healthReport(),
    queryFn: () =>
      callEdgeFunction<HealthReportResponse>(
        Endpoints.telephony.adminHealthReport,
        {}
      ),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Query available numbers by area code.
 */
export function useAvailableTwilioNumbers(
  areaCode?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: telephonyKeys.availableNumbers(areaCode),
    queryFn: () =>
      callEdgeFunction<FetchNumbersResponse>(
        Endpoints.telephony.fetchNumbers,
        { areaCode }
      ),
    enabled: options?.enabled !== false,
    staleTime: 1 * 60 * 1000, // 1 minute (availability changes quickly)
  });
}
