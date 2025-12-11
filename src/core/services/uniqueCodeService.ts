import { supabase } from "@core/services/supabase";

/**
 * UniqueCodeService
 * 
 * Handles all unique code operations for contacts including:
 * - Generation of unique codes
 * - Validation and uniqueness checking
 * - Intelligent column detection in CSV imports
 * - Batch generation for imports
 */
export class UniqueCodeService {
  // Common variations of unique code column names
  private static readonly CODE_VARIATIONS = [
    'unique_code',
    'uniquecode', 
    'unique-code',
    'code',
    'customer_code',
    'customercode',
    'customer-code',
    'contact_code',
    'contactcode',
    'contact-code'
  ];

  /**
   * Generate a unique code with format: UC-{timestamp}-{random}
   */
  static generate(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `UC-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Validate uniqueness of a code for a specific client
   */
  static async isUnique(code: string, clientId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('contacts')
      .select('id')
      .eq('client_id', clientId)
      .eq('customer_code', code)
      .maybeSingle();

    if (error) {
      console.error('Error checking code uniqueness:', error);
      return false;
    }

    return data === null;
  }

  /**
   * Detect unique code column in CSV headers
   * Returns the header name if found, null otherwise
   */
  static detectCodeColumn(headers: string[]): string | null {
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    
    for (const variation of this.CODE_VARIATIONS) {
      const index = normalizedHeaders.indexOf(variation.toLowerCase());
      if (index !== -1) {
        return headers[index]; // Return original case
      }
    }

    return null;
  }

  /**
   * Generate a batch of unique codes for a client
   * Ensures all codes are unique within the client and don't exist in the database
   */
  static async generateBatch(count: number, clientId: string): Promise<string[]> {
    const codes: string[] = [];
    const attempts = count * 3; // Allow multiple attempts per code
    let attemptsUsed = 0;

    while (codes.length < count && attemptsUsed < attempts) {
      const newCode = this.generate();
      attemptsUsed++;

      // Check if code already in our batch
      if (codes.includes(newCode)) {
        continue;
      }

      // Check if code exists in database
      const isUnique = await this.isUnique(newCode, clientId);
      if (isUnique) {
        codes.push(newCode);
      }
    }

    if (codes.length < count) {
      throw new Error(`Could not generate ${count} unique codes. Only generated ${codes.length}.`);
    }

    return codes;
  }

  /**
   * Generate a single unique code for a client
   * Retries up to maxAttempts times if duplicates are found
   */
  static async generateUnique(clientId: string, maxAttempts: number = 10): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const code = this.generate();
      const isUnique = await this.isUnique(code, clientId);
      
      if (isUnique) {
        return code;
      }
    }

    throw new Error('Could not generate a unique code after multiple attempts');
  }

  /**
   * Validate code format
   * Checks if code matches expected pattern
   */
  static isValidFormat(code: string): boolean {
    if (!code || typeof code !== 'string') {
      return false;
    }

    // Allow various formats:
    // - UC-xxxxx-xxxxx (our generated format)
    // - Any alphanumeric code with optional dashes/underscores
    const pattern = /^[A-Z0-9][A-Z0-9\-_]{2,50}$/i;
    return pattern.test(code);
  }

  /**
   * Find duplicates in an array of codes
   */
  static findDuplicates(codes: string[]): Map<string, number[]> {
    const duplicates = new Map<string, number[]>();
    const seen = new Map<string, number[]>();

    codes.forEach((code, index) => {
      const normalized = code.toUpperCase().trim();
      if (!seen.has(normalized)) {
        seen.set(normalized, [index]);
      } else {
        const indices = seen.get(normalized)!;
        indices.push(index);
        duplicates.set(normalized, indices);
      }
    });

    return duplicates;
  }

  /**
   * Check for existing codes in the database
   * Returns array of codes that already exist for the client
   */
  static async checkExistingCodes(codes: string[], clientId: string): Promise<string[]> {
    if (codes.length === 0) return [];

    const { data, error } = await supabase
      .from('contacts')
      .select('customer_code')
      .eq('client_id', clientId)
      .in('customer_code', codes);

    if (error) {
      console.error('Error checking existing codes:', error);
      throw error;
    }

    return (data || []).map(d => d.customer_code).filter(Boolean) as string[];
  }

  /**
   * Normalize code for comparison
   */
  static normalize(code: string): string {
    return code.toUpperCase().trim();
  }

  /**
   * Get smart suggestions for column mapping
   * Returns confidence scores for each header
   */
  static getColumnSuggestions(headers: string[]): Map<string, number> {
    const suggestions = new Map<string, number>();

    headers.forEach(header => {
      const normalized = header.toLowerCase().trim();
      let confidence = 0;

      // Exact match
      if (this.CODE_VARIATIONS.includes(normalized)) {
        confidence = 1.0;
      } 
      // Partial match
      else if (normalized.includes('code') || normalized.includes('unique')) {
        confidence = 0.7;
      }
      // ID-like column
      else if (normalized.includes('id') || normalized.includes('identifier')) {
        confidence = 0.5;
      }

      if (confidence > 0) {
        suggestions.set(header, confidence);
      }
    });

    return suggestions;
  }
}

