/**
 * Import/Export API Hooks
 * 
 * TanStack Query hooks for data import and export operations.
 * Covers audience, contacts, codes, and database exports.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction } from '../client';
import { Endpoints } from '../endpoints';

// ============================================================================
// Base Types
// ============================================================================

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors?: Array<{
    row: number;
    field?: string;
    error: string;
  }>;
  warnings?: string[];
}

export interface ExportResult {
  success: boolean;
  data?: string;
  downloadUrl?: string;
  rowCount?: number;
  error?: string;
}

// ============================================================================
// Audience Import/Export Types
// ============================================================================

export interface ImportAudienceRequest {
  clientId: string;
  audienceName: string;
  csvData: string;
  mapping?: Record<string, string>;
  dedupeByEmail?: boolean;
  dedupeByPhone?: boolean;
}

export interface ImportAudienceResponse extends ImportResult {
  audienceId?: string;
  duplicatesSkipped?: number;
}

export interface ExportAudienceRequest {
  audienceId: string;
  format?: 'csv' | 'json';
  fields?: string[];
  includeMetadata?: boolean;
}

// ============================================================================
// Contacts Import Types
// ============================================================================

export interface ImportContactsRequest {
  clientId: string;
  csvData: string;
  mapping?: Record<string, string>;
  updateExisting?: boolean;
  tags?: string[];
}

export interface ImportContactsResponse extends ImportResult {
  created: number;
  updated: number;
}

// ============================================================================
// Campaign Codes Import Types
// ============================================================================

export interface ImportCampaignCodesRequest {
  campaignId: string;
  codes: string[];
  codeType?: 'redemption' | 'tracking' | 'custom';
}

export interface ImportCampaignCodesResponse extends ImportResult {
  duplicatesSkipped?: number;
}

// ============================================================================
// Customer Codes Import Types
// ============================================================================

export interface ImportCustomerCodesRequest {
  audienceId: string;
  csvData: string;
  codeColumn: string;
  matchColumn: string;
  matchBy: 'email' | 'phone' | 'external_id';
}

export interface ImportCustomerCodesResponse extends ImportResult {
  matched: number;
  unmatched: number;
}

// ============================================================================
// Database Export Types
// ============================================================================

export interface ExportDatabaseRequest {
  tables?: string[];
  format?: 'csv' | 'json' | 'sql';
  includeSchema?: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
}

export interface ExportDatabaseResponse {
  success: boolean;
  downloadUrl?: string;
  size?: number;
  tables?: string[];
  error?: string;
}

// ============================================================================
// Import Mutation Hooks
// ============================================================================

/**
 * Import audience from CSV.
 */
export function useImportAudience() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ImportAudienceRequest) =>
      callEdgeFunction<ImportAudienceResponse>(
        Endpoints.imports.audience,
        request
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audiences'] });
    },
  });
}

/**
 * Import contacts from CSV.
 */
export function useImportContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ImportContactsRequest) =>
      callEdgeFunction<ImportContactsResponse>(
        Endpoints.imports.contacts,
        request
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

/**
 * Import campaign codes.
 */
export function useImportCampaignCodes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ImportCampaignCodesRequest) =>
      callEdgeFunction<ImportCampaignCodesResponse>(
        Endpoints.imports.campaignCodes,
        request
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', variables.campaignId] });
    },
  });
}

/**
 * Import customer redemption codes.
 */
export function useImportCustomerCodes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ImportCustomerCodesRequest) =>
      callEdgeFunction<ImportCustomerCodesResponse>(
        Endpoints.imports.customerCodes,
        request
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['audiences', variables.audienceId] });
    },
  });
}

// ============================================================================
// Export Mutation Hooks
// ============================================================================

/**
 * Export audience data.
 */
export function useExportAudience() {
  return useMutation({
    mutationFn: (request: ExportAudienceRequest) =>
      callEdgeFunction<ExportResult>(
        Endpoints.exports.audience,
        request
      ),
  });
}

/**
 * Export full database (admin only).
 */
export function useExportDatabase() {
  return useMutation({
    mutationFn: (request: ExportDatabaseRequest) =>
      callEdgeFunction<ExportDatabaseResponse>(
        Endpoints.exports.database,
        request
      ),
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse import errors for display.
 */
export function formatImportErrors(
  errors: ImportResult['errors']
): string[] {
  if (!errors || errors.length === 0) return [];
  
  return errors.map(e => {
    if (e.field) {
      return `Row ${e.row}, ${e.field}: ${e.error}`;
    }
    return `Row ${e.row}: ${e.error}`;
  });
}

/**
 * Download export data as file.
 */
export function downloadExportData(
  data: string,
  filename: string,
  mimeType = 'text/csv'
): void {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
