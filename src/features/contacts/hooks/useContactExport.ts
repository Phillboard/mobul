import { useCallback, useState } from 'react';
import { supabase } from '@core/services/supabase';
import { toast } from 'sonner';
import type { Contact } from '@/types/contacts';

export interface ExportOptions {
  filename?: string;
  includeFields?: string[];
  excludeFields?: string[];
  format?: 'csv' | 'json';
}

export function useContactExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportContacts = useCallback(async (
    contacts: Contact[],
    options: ExportOptions = {}
  ) => {
    setIsExporting(true);

    try {
      const {
        filename = `contacts-export-${new Date().toISOString().split('T')[0]}.csv`,
        includeFields,
        excludeFields,
        format = 'csv',
      } = options;

      if (format === 'csv') {
        await exportAsCSV(contacts, filename, includeFields, excludeFields);
      } else {
        await exportAsJSON(contacts, filename, includeFields, excludeFields);
      }

      toast.success(`Exported ${contacts.length} contact${contacts.length !== 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export contacts');
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    exportContacts,
    isExporting,
  };
}

async function exportAsCSV(
  contacts: Contact[],
  filename: string,
  includeFields?: string[],
  excludeFields?: string[]
) {
  // Define field mapping and order
  const fieldDefinitions = [
    { key: 'customer_code', label: 'unique_code' },
    { key: 'first_name', label: 'first_name' },
    { key: 'last_name', label: 'last_name' },
    { key: 'email', label: 'email' },
    { key: 'phone', label: 'phone' },
    { key: 'mobile_phone', label: 'mobile_phone' },
    { key: 'company', label: 'company' },
    { key: 'job_title', label: 'job_title' },
    { key: 'address', label: 'address' },
    { key: 'address2', label: 'address2' },
    { key: 'city', label: 'city' },
    { key: 'state', label: 'state' },
    { key: 'zip', label: 'zip' },
    { key: 'country', label: 'country' },
    { key: 'lifecycle_stage', label: 'lifecycle_stage' },
    { key: 'lead_source', label: 'lead_source' },
    { key: 'lead_score', label: 'lead_score' },
    { key: 'do_not_contact', label: 'do_not_contact' },
    { key: 'email_opt_out', label: 'email_opt_out' },
    { key: 'sms_opt_out', label: 'sms_opt_out' },
    { key: 'notes', label: 'notes' },
    { key: 'created_at', label: 'created_at' },
    { key: 'last_activity_date', label: 'last_activity_date' },
  ];

  // Filter fields based on include/exclude
  let fields = fieldDefinitions;
  if (includeFields && includeFields.length > 0) {
    fields = fields.filter(f => includeFields.includes(f.key));
  }
  if (excludeFields && excludeFields.length > 0) {
    fields = fields.filter(f => !excludeFields.includes(f.key));
  }

  // Create CSV header
  const headers = fields.map(f => f.label);
  const csvRows = [headers.join(',')];

  // Create CSV rows
  contacts.forEach(contact => {
    const row = fields.map(field => {
      const value = (contact as any)[field.key];
      
      // Handle special formatting
      if (value === null || value === undefined) {
        return '';
      }
      
      // Convert booleans
      if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
      }

      // Handle dates
      if (field.key.includes('_at') || field.key.includes('date')) {
        return value ? new Date(value).toISOString() : '';
      }

      // Escape commas and quotes
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    });

    csvRows.push(row.join(','));
  });

  // Create and download file
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

async function exportAsJSON(
  contacts: Contact[],
  filename: string,
  includeFields?: string[],
  excludeFields?: string[]
) {
  let data = contacts;

  if (includeFields || excludeFields) {
    data = contacts.map(contact => {
      const filtered: any = {};
      Object.keys(contact).forEach(key => {
        if (includeFields && !includeFields.includes(key)) return;
        if (excludeFields && excludeFields.includes(key)) return;
        filtered[key] = (contact as any)[key];
      });
      return filtered;
    });
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const jsonFilename = filename.replace(/\.csv$/, '.json');
  downloadBlob(blob, jsonFilename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

