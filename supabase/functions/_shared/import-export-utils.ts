/**
 * Import/Export Utilities
 * 
 * Shared utilities for CSV parsing, validation, batched processing,
 * and standardized response formats across all import/export functions.
 */

// ============================================================================
// Types
// ============================================================================

export interface ValidationError {
  row: number;
  field?: string;
  message: string;
  code?: string;
  data?: unknown;
}

export interface ImportResult<T = unknown> {
  success: boolean;
  imported: number;
  failed: number;
  skipped: number;
  errors: ValidationError[];
  warnings?: string[];
  data?: T;
}

export interface ExportResult {
  success: boolean;
  rowCount: number;
  downloadUrl?: string;
  csv?: string;
}

export interface BatchProcessResult {
  successCount: number;
  failedCount: number;
  errors: ValidationError[];
}

export type RowValidator<T> = (row: T, rowNumber: number) => ValidationError[];

// ============================================================================
// CSV Parsing
// ============================================================================

/**
 * Parse CSV content into array of objects
 * Handles quoted fields, commas within quotes, and empty values
 */
export function parseCSV<T extends Record<string, string>>(
  content: string,
  options: {
    headerMapping?: Record<string, string>;
    requiredHeaders?: string[];
    normalize?: boolean;
  } = {}
): { rows: T[]; headers: string[]; errors: ValidationError[] } {
  const { headerMapping = {}, requiredHeaders = [], normalize = true } = options;
  const errors: ValidationError[] = [];
  const rows: T[] = [];

  const lines = content.trim().split(/\r?\n/);
  
  if (lines.length < 1) {
    errors.push({ row: 0, message: 'CSV file is empty' });
    return { rows, headers: [], errors };
  }

  // Parse headers
  let headers = parseCSVLine(lines[0]).map(h => {
    let header = h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    // Apply header mapping if provided
    if (headerMapping[header]) {
      header = headerMapping[header];
    }
    return header;
  });

  // Check required headers
  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      errors.push({
        row: 0,
        field: required,
        message: `Missing required column: ${required}`,
      });
    }
  }

  if (errors.length > 0) {
    return { rows, headers, errors };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const values = parseCSVLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      let value = values[index] || '';
      if (normalize) {
        value = value.trim();
      }
      row[header] = value;
    });

    rows.push(row as T);
  }

  return { rows, headers, errors };
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current);
  return result;
}

// ============================================================================
// CSV Generation
// ============================================================================

/**
 * Escape a value for CSV output
 * Handles commas, quotes, and newlines
 */
export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  
  const str = String(value);
  
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Generate CSV string from array of objects
 */
export function generateCSV<T extends Record<string, unknown>>(
  data: T[],
  options: {
    headers?: string[];
    headerLabels?: Record<string, string>;
    transforms?: Record<string, (value: unknown) => string>;
  } = {}
): string {
  if (data.length === 0) return '';

  const { 
    headers = Object.keys(data[0]), 
    headerLabels = {},
    transforms = {},
  } = options;

  // Header row
  const headerRow = headers.map(h => escapeCsvField(headerLabels[h] || h)).join(',');

  // Data rows
  const dataRows = data.map(row => {
    return headers.map(header => {
      let value = row[header];
      
      // Apply transform if provided
      if (transforms[header]) {
        value = transforms[header](value);
      }
      
      return escapeCsvField(value);
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Create CSV response with proper headers
 */
export function createCSVResponse(
  csv: string,
  filename: string,
  corsHeaders: Record<string, string> = {}
): Response {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
      ...corsHeaders,
    },
  });
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate rows and collect errors
 */
export function validateRows<T>(
  rows: T[],
  validator: RowValidator<T>,
  options: {
    startRow?: number; // Row number offset (default 2 for CSV with header)
    maxErrors?: number; // Stop collecting after N errors
  } = {}
): { validRows: T[]; errors: ValidationError[] } {
  const { startRow = 2, maxErrors = 1000 } = options;
  const validRows: T[] = [];
  const errors: ValidationError[] = [];

  for (let i = 0; i < rows.length; i++) {
    if (errors.length >= maxErrors) break;

    const rowErrors = validator(rows[i], startRow + i);
    
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      validRows.push(rows[i]);
    }
  }

  return { validRows, errors };
}

/**
 * Common validation helpers
 */
export const validators = {
  required: (value: unknown, field: string, row: number): ValidationError | null => {
    if (value === null || value === undefined || value === '') {
      return { row, field, message: `${field} is required` };
    }
    return null;
  },

  email: (value: string, row: number): ValidationError | null => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return { row, field: 'email', message: 'Invalid email format' };
    }
    return null;
  },

  zipCode: (value: string, row: number): ValidationError | null => {
    if (value && !/^\d{5}(-\d{4})?$/.test(value)) {
      return { row, field: 'zip', message: 'ZIP code must be 5 digits (optionally with -XXXX)' };
    }
    return null;
  },

  phone: (value: string, row: number): ValidationError | null => {
    if (value) {
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length < 10 || cleaned.length > 15) {
        return { row, field: 'phone', message: 'Phone must be 10-15 digits' };
      }
    }
    return null;
  },

  uniqueCode: (value: string, row: number): ValidationError | null => {
    if (!value || value.trim() === '') {
      return { row, field: 'unique_code', message: 'Code is required' };
    }
    
    const trimmed = value.trim();
    
    if (trimmed.length < 3) {
      return { row, field: 'unique_code', message: 'Code must be at least 3 characters' };
    }
    
    if (trimmed.length > 50) {
      return { row, field: 'unique_code', message: 'Code must be 50 characters or less' };
    }
    
    if (!/^[A-Za-z0-9][A-Za-z0-9\-_]*$/.test(trimmed)) {
      return { row, field: 'unique_code', message: 'Code must start with letter/number, contain only letters, numbers, dashes, underscores' };
    }
    
    return null;
  },
};

// ============================================================================
// Batch Processing
// ============================================================================

/**
 * Process items in batches with error handling
 */
export async function processBatches<T, R>(
  items: T[],
  processor: (batch: T[], batchIndex: number) => Promise<R[]>,
  options: {
    batchSize?: number;
    onProgress?: (processed: number, total: number) => void;
    continueOnError?: boolean;
  } = {}
): Promise<BatchProcessResult & { results: R[] }> {
  const { batchSize = 100, onProgress, continueOnError = true } = options;
  
  const results: R[] = [];
  let successCount = 0;
  let failedCount = 0;
  const errors: ValidationError[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchIndex = Math.floor(i / batchSize);

    try {
      const batchResults = await processor(batch, batchIndex);
      results.push(...batchResults);
      successCount += batch.length;
    } catch (error) {
      failedCount += batch.length;
      errors.push({
        row: i + 1,
        message: `Batch ${batchIndex + 1} failed: ${error instanceof Error ? error.message : String(error)}`,
      });

      if (!continueOnError) {
        break;
      }
    }

    if (onProgress) {
      onProgress(Math.min(i + batchSize, items.length), items.length);
    }
  }

  return { successCount, failedCount, errors, results };
}

/**
 * Insert records in batches using Supabase
 */
export async function batchInsert<T extends Record<string, unknown>>(
  supabase: { from: (table: string) => { insert: (data: T[]) => { select: () => Promise<{ data: T[] | null; error: Error | null }> } } },
  table: string,
  records: T[],
  options: {
    batchSize?: number;
    onProgress?: (inserted: number, total: number) => void;
  } = {}
): Promise<BatchProcessResult & { insertedRecords: T[] }> {
  const { batchSize = 1000, onProgress } = options;

  const insertedRecords: T[] = [];
  let successCount = 0;
  let failedCount = 0;
  const errors: ValidationError[] = [];

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    try {
      const { data, error } = await supabase
        .from(table)
        .insert(batch)
        .select();

      if (error) {
        throw error;
      }

      if (data) {
        insertedRecords.push(...data);
        successCount += data.length;
      }
    } catch (error) {
      failedCount += batch.length;
      errors.push({
        row: i + 1,
        message: `Insert batch failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }

    if (onProgress) {
      onProgress(Math.min(i + batchSize, records.length), records.length);
    }
  }

  return { successCount, failedCount, errors, insertedRecords };
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Create standardized import response
 */
export function createImportResponse<T = unknown>(
  result: ImportResult<T>,
  corsHeaders: Record<string, string> = {}
): Response {
  const status = result.success ? 200 : result.imported > 0 ? 200 : 400;

  return new Response(JSON.stringify(result), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

/**
 * Create standardized export response
 */
export function createExportResponse(
  result: ExportResult,
  corsHeaders: Record<string, string> = {}
): Response {
  if (result.csv) {
    return createCSVResponse(result.csv, 'export.csv', corsHeaders);
  }

  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 400,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

// ============================================================================
// Token Generation
// ============================================================================

/**
 * Generate unique alphanumeric token
 */
export function generateToken(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Generate unique tokens ensuring no duplicates
 */
export function generateUniqueTokens(count: number, existing: Set<string> = new Set()): string[] {
  const tokens: string[] = [];
  const allTokens = new Set(existing);

  while (tokens.length < count) {
    const token = generateToken();
    if (!allTokens.has(token)) {
      allTokens.add(token);
      tokens.push(token);
    }
  }

  return tokens;
}

// ============================================================================
// Data Masking
// ============================================================================

/**
 * Mask sensitive data showing only last N characters
 */
export function maskSensitiveData(value: string | null | undefined, visibleChars: number = 4): string {
  if (!value) return '';
  if (value.length <= visibleChars) return value;
  return '•'.repeat(value.length - visibleChars) + value.slice(-visibleChars);
}

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Format date for CSV export
 */
export function formatDateForExport(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * Format datetime for export
 */
export function formatDateTimeForExport(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

// ============================================================================
// File Size Validation
// ============================================================================

export const FILE_SIZE_LIMITS = {
  CSV_IMPORT: 20 * 1024 * 1024, // 20MB
  JSON_IMPORT: 10 * 1024 * 1024, // 10MB
} as const;

/**
 * Validate file size
 */
export function validateFileSize(
  size: number,
  maxSize: number = FILE_SIZE_LIMITS.CSV_IMPORT
): ValidationError | null {
  if (size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      row: 0,
      field: 'file',
      message: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }
  return null;
}
