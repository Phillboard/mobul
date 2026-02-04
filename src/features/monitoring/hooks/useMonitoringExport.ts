/**
 * Monitoring Export Hook
 * 
 * Provides export functionality for activity logs, alerts, and reports.
 * Supports CSV, Excel, and PDF formats.
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { useAuth } from '@core/auth/AuthProvider';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { 
  ExportFormat, 
  ExportOptions, 
  ActivityLogEntry,
  DashboardFilters,
} from '../types/monitoring.types';

// ============================================================================
// Types
// ============================================================================

interface ExportResult {
  success: boolean;
  filename?: string;
  records_exported?: number;
  error?: string;
}

// ============================================================================
// CSV Generation
// ============================================================================

function generateCSV(data: ActivityLogEntry[], columns?: string[]): string {
  if (data.length === 0) return '';

  const defaultColumns = [
    'created_at',
    'category',
    'event_type',
    'status',
    'severity',
    'description',
    'user_id',
    'client_id',
    'campaign_id',
    'resource_type',
    'resource_id',
  ];

  const cols = columns || defaultColumns;
  
  // Header row
  const header = cols.join(',');
  
  // Data rows
  const rows = data.map(entry => {
    return cols.map(col => {
      const value = entry[col as keyof ActivityLogEntry];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
      const str = String(value);
      // Escape commas and quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

// ============================================================================
// Excel Generation (using xlsx format via csv conversion)
// ============================================================================

async function generateExcel(data: ActivityLogEntry[], columns?: string[]): Promise<Blob> {
  // For now, generate CSV and convert to Excel using browser APIs
  // In production, you'd use a library like xlsx or exceljs
  const csv = generateCSV(data, columns);
  
  // Create a simple Excel-compatible file (TSV wrapped as xls)
  // For proper Excel, integrate xlsx library
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel
  return new Blob([BOM + csv], { 
    type: 'application/vnd.ms-excel;charset=utf-8' 
  });
}

// ============================================================================
// PDF Generation (basic implementation)
// ============================================================================

function generatePDFReport(data: ActivityLogEntry[], title: string): void {
  // Open a new window with formatted data for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error('Please allow popups to generate PDF reports');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .meta { color: #666; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f4f4f4; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .status-success { color: green; }
        .status-failed { color: red; }
        .severity-critical { color: red; font-weight: bold; }
        .severity-error { color: red; }
        .severity-warning { color: orange; }
        @media print {
          body { padding: 0; }
          table { font-size: 10px; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="meta">
        <p>Generated: ${new Date().toLocaleString()}</p>
        <p>Total Records: ${data.length}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Category</th>
            <th>Event</th>
            <th>Status</th>
            <th>Severity</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(entry => `
            <tr>
              <td>${new Date(entry.created_at).toLocaleString()}</td>
              <td>${entry.category}</td>
              <td>${entry.event_type}</td>
              <td class="status-${entry.status}">${entry.status}</td>
              <td class="severity-${entry.severity}">${entry.severity}</td>
              <td>${entry.description}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

// ============================================================================
// Download Helper
// ============================================================================

function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Main Hook
// ============================================================================

export function useMonitoringExport() {
  const [isExporting, setIsExporting] = useState(false);
  const { roles } = useAuth();
  const { currentOrg } = useTenant();
  
  const isAdmin = roles.some(r => r.role === 'admin');

  // Fetch data for export
  const fetchExportData = useCallback(async (
    filters?: DashboardFilters,
    limit: number = 10000
  ): Promise<ActivityLogEntry[]> => {
    let query = supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply scope filters for non-admins
    if (!isAdmin && currentOrg?.id) {
      if (currentOrg.type === 'agency') {
        query = query.eq('organization_id', currentOrg.id);
      } else {
        query = query.eq('client_id', currentOrg.id);
      }
    }

    // Apply user filters
    if (filters?.categories?.length) {
      query = query.in('category', filters.categories);
    }
    if (filters?.status?.length) {
      query = query.in('status', filters.status);
    }
    if (filters?.severity?.length) {
      query = query.in('severity', filters.severity);
    }
    if (filters?.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.from.toISOString())
        .lte('created_at', filters.dateRange.to.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }, [isAdmin, currentOrg]);

  // Export function
  const exportLogs = useCallback(async (
    options: ExportOptions
  ): Promise<ExportResult> => {
    setIsExporting(true);

    try {
      const data = await fetchExportData(options.filters);

      if (data.length === 0) {
        return { success: false, error: 'No data to export' };
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const baseFilename = `activity-logs-${timestamp}`;

      switch (options.format) {
        case 'csv': {
          const csv = generateCSV(data, options.columns);
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
          downloadFile(blob, `${baseFilename}.csv`);
          return { 
            success: true, 
            filename: `${baseFilename}.csv`,
            records_exported: data.length,
          };
        }

        case 'excel': {
          const blob = await generateExcel(data, options.columns);
          downloadFile(blob, `${baseFilename}.xlsx`);
          return { 
            success: true, 
            filename: `${baseFilename}.xlsx`,
            records_exported: data.length,
          };
        }

        case 'pdf': {
          generatePDFReport(data, 'Activity Log Report');
          return { 
            success: true, 
            records_exported: data.length,
          };
        }

        default:
          return { success: false, error: 'Unsupported format' };
      }
    } catch (error) {
      console.error('Export error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Export failed',
      };
    } finally {
      setIsExporting(false);
    }
  }, [fetchExportData]);

  return {
    exportLogs,
    isExporting,
  };
}

// ============================================================================
// Scheduled Reports Hook (for managing scheduled exports)
// ============================================================================

export function useScheduledReports() {
  const { currentOrg } = useTenant();

  const { data: reports, isLoading, refetch } = useQuery({
    queryKey: ['scheduled-reports', currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .eq('organization_id', currentOrg?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg?.id,
  });

  const createReport = useMutation({
    mutationFn: async (params: {
      name: string;
      report_type: string;
      format: ExportFormat;
      schedule_cron: string;
      recipients: string[];
      filters?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .insert({
          ...params,
          organization_id: currentOrg?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetch();
      toast.success('Scheduled report created');
    },
    onError: (error) => {
      toast.error(`Failed to create report: ${error.message}`);
    },
  });

  const deleteReport = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from('scheduled_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast.success('Scheduled report deleted');
    },
  });

  return {
    reports,
    isLoading,
    createReport,
    deleteReport,
  };
}
