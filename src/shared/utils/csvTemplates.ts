/**
 * CSV Template Utilities
 * 
 * Generates sample CSV templates for contact imports
 */

export interface CSVTemplateOptions {
  includeExamples?: boolean;
  includeCustomFields?: string[];
  includeOptionalFields?: boolean;
}

export class CSVTemplateGenerator {
  // Required fields that must be present
  private static readonly REQUIRED_FIELDS = [
    'unique_code',
    'email',
  ];

  // Core contact fields
  private static readonly CORE_FIELDS = [
    'first_name',
    'last_name',
    'phone',
    'mobile_phone',
    'company',
    'job_title',
  ];

  // Address fields
  private static readonly ADDRESS_FIELDS = [
    'address',
    'address2',
    'city',
    'state',
    'zip',
    'country',
  ];

  // Marketing fields
  private static readonly MARKETING_FIELDS = [
    'lifecycle_stage',
    'lead_source',
    'lead_score',
    'do_not_contact',
    'email_opt_out',
    'sms_opt_out',
  ];

  // Additional fields
  private static readonly ADDITIONAL_FIELDS = [
    'notes',
  ];

  /**
   * Generate a sample CSV template with examples
   */
  static generateTemplate(options: CSVTemplateOptions = {}): string {
    const {
      includeExamples = true,
      includeCustomFields = [],
      includeOptionalFields = true,
    } = options;

    // Build headers
    const headers = [
      ...this.REQUIRED_FIELDS,
      ...this.CORE_FIELDS,
      ...(includeOptionalFields ? this.ADDRESS_FIELDS : []),
      ...(includeOptionalFields ? this.MARKETING_FIELDS : []),
      ...(includeOptionalFields ? this.ADDITIONAL_FIELDS : []),
      ...includeCustomFields,
    ];

    const rows: string[][] = [headers];

    if (includeExamples) {
      // Add example rows
      rows.push(this.generateExampleRow(headers, 1));
      rows.push(this.generateExampleRow(headers, 2));
      rows.push(this.generateExampleRow(headers, 3));
    }

    return this.rowsToCSV(rows);
  }

  /**
   * Generate minimal template with only required fields
   */
  static generateMinimalTemplate(): string {
    const headers = [
      'unique_code',
      'first_name',
      'last_name',
      'email',
    ];

    const rows: string[][] = [headers];

    // Add example rows
    rows.push([
      'UC-EXAMPLE-001',
      'John',
      'Doe',
      'john.doe@example.com',
    ]);

    rows.push([
      'UC-EXAMPLE-002',
      'Jane',
      'Smith',
      'jane.smith@example.com',
    ]);

    return this.rowsToCSV(rows);
  }

  /**
   * Generate template for address-focused campaigns
   */
  static generateDirectMailTemplate(): string {
    const headers = [
      'unique_code',
      'first_name',
      'last_name',
      'address',
      'address2',
      'city',
      'state',
      'zip',
      'email',
      'phone',
    ];

    const rows: string[][] = [headers];

    rows.push([
      'UC-DM-001',
      'John',
      'Doe',
      '123 Main Street',
      'Apt 4B',
      'New York',
      'NY',
      '10001',
      'john.doe@example.com',
      '555-0100',
    ]);

    rows.push([
      'UC-DM-002',
      'Jane',
      'Smith',
      '456 Oak Avenue',
      '',
      'Los Angeles',
      'CA',
      '90001',
      'jane.smith@example.com',
      '555-0200',
    ]);

    return this.rowsToCSV(rows);
  }

  /**
   * Generate an example row with sample data
   */
  private static generateExampleRow(headers: string[], index: number): string[] {
    const exampleData: Record<string, string> = {
      unique_code: `UC-EXAMPLE-${String(index).padStart(3, '0')}`,
      first_name: ['John', 'Jane', 'Bob'][index - 1] || 'Example',
      last_name: ['Doe', 'Smith', 'Johnson'][index - 1] || 'User',
      email: `contact${index}@example.com`,
      phone: `555-01${String(index).padStart(2, '0')}`,
      mobile_phone: `555-02${String(index).padStart(2, '0')}`,
      company: ['Acme Corp', 'Tech Innovations', 'Global Industries'][index - 1] || 'Example Co',
      job_title: ['Marketing Manager', 'Sales Director', 'CEO'][index - 1] || 'Professional',
      address: [`${100 + index * 100} Main Street`, `${200 + index * 100} Oak Avenue`, `${300 + index * 100} Pine Road`][index - 1] || 'Street Address',
      address2: index === 1 ? 'Suite 100' : '',
      city: ['New York', 'Los Angeles', 'Chicago'][index - 1] || 'City',
      state: ['NY', 'CA', 'IL'][index - 1] || 'ST',
      zip: ['10001', '90001', '60601'][index - 1] || '00000',
      country: 'US',
      lifecycle_stage: ['lead', 'mql', 'customer'][index - 1] || 'lead',
      lead_source: ['Website', 'Referral', 'Trade Show'][index - 1] || 'Direct',
      lead_score: String(index * 25),
      do_not_contact: 'false',
      email_opt_out: 'false',
      sms_opt_out: 'false',
      notes: `Example contact ${index}`,
    };

    return headers.map(header => exampleData[header] || '');
  }

  /**
   * Convert rows to CSV string
   */
  private static rowsToCSV(rows: string[][]): string {
    return rows.map(row => 
      row.map(cell => {
        // Escape cells containing commas, quotes, or newlines
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    ).join('\n');
  }

  /**
   * Download CSV template as file
   */
  static downloadTemplate(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Get field descriptions for documentation
   */
  static getFieldDescriptions(): Record<string, string> {
    return {
      unique_code: 'REQUIRED: Unique identifier for this contact. Must be unique across all your contacts.',
      first_name: 'Contact\'s first name',
      last_name: 'Contact\'s last name',
      email: 'REQUIRED: Email address (must be unique per contact)',
      phone: 'Primary phone number',
      mobile_phone: 'Mobile phone number',
      company: 'Company or organization name',
      job_title: 'Job title or position',
      address: 'Street address line 1',
      address2: 'Street address line 2 (optional)',
      city: 'City name',
      state: 'State or province (2-letter code recommended)',
      zip: 'Postal or ZIP code',
      country: 'Country code (default: US)',
      lifecycle_stage: 'lead, mql, sql, opportunity, customer, or evangelist',
      lead_source: 'Where this lead came from',
      lead_score: 'Numeric score 0-100',
      do_not_contact: 'true/false - exclude from all communications',
      email_opt_out: 'true/false - opted out of email',
      sms_opt_out: 'true/false - opted out of SMS',
      notes: 'Additional notes about this contact',
    };
  }
}

