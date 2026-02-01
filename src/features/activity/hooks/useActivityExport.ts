/**
 * useActivityExport Hook
 * 
 * Export functionality for activity logs with support for:
 * - CSV export
 * - JSON export
 * - PDF export (print-friendly HTML)
 * - Export audit logging
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { ActivityLog, ActivityFilters, ExportFormat, ExportOptions, ExportResult } from '../types/activity.types';
import { formatDate, DATE_FORMATS } from '@shared/utils/date';

interface UseActivityExportReturn {
  exportLogs: (logs: ActivityLog[], options: ExportOptions) => Promise<ExportResult>;
  isExporting: boolean;
  error: Error | null;
  lastExport: ExportResult | null;
}

/**
 * Convert logs to CSV format
 */
function logsToCSV(logs: ActivityLog[], columns?: string[]): string {
  if (logs.length === 0) return '';

  // Default columns if not specified
  const defaultColumns = ['timestamp', 'category', 'event_type', 'status', 'user_email', 'ip_address'];
  const cols = columns || defaultColumns;

  // Header row
  const header = cols.map(col => `"${col}"`).join(',');

  // Data rows
  const rows = logs.map(log => {
    return cols.map(col => {
      const value = (log as any)[col];
      if (value === null || value === undefined) return '""';
      if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      if (col === 'timestamp') return `"${formatDate(value, DATE_FORMATS.DATETIME)}"`;
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Convert logs to JSON format
 */
function logsToJSON(logs: ActivityLog[], columns?: string[]): string {
  if (columns) {
    // Filter to only specified columns
    const filtered = logs.map(log => {
      const filtered: Record<string, unknown> = {};
      columns.forEach(col => {
        if ((log as any)[col] !== undefined) {
          filtered[col] = (log as any)[col];
        }
      });
      return filtered;
    });
    return JSON.stringify(filtered, null, 2);
  }
  return JSON.stringify(logs, null, 2);
}

/**
 * Generate PDF-ready HTML for printing
 */
function logsToPrintableHTML(logs: ActivityLog[], title = 'Activity Log Export'): string {
  const timestamp = formatDate(new Date().toISOString(), DATE_FORMATS.DATETIME);
  
  const rows = logs.map(log => `
    <tr>
      <td>${formatDate(log.timestamp, DATE_FORMATS.DATETIME)}</td>
      <td><span class="badge ${log.category}">${log.category.replace('_', ' ')}</span></td>
      <td>${log.event_type.replace(/_/g, ' ')}</td>
      <td>${log.user_email || 'System'}</td>
      <td><span class="status ${log.status}">${log.status}</span></td>
      <td>${log.ip_address || '-'}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1a1a1a; }
    .header { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
    .header h1 { font-size: 24px; margin-bottom: 8px; }
    .header .meta { font-size: 12px; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #f3f4f6; padding: 10px 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
    td { padding: 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    tr:nth-child(even) { background: #f9fafb; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 500; text-transform: capitalize; }
    .badge.gift_card { background: #f3e8ff; color: #7c3aed; }
    .badge.campaign { background: #dbeafe; color: #2563eb; }
    .badge.communication { background: #dcfce7; color: #16a34a; }
    .badge.api { background: #ffedd5; color: #ea580c; }
    .badge.user { background: #fce7f3; color: #db2777; }
    .badge.system { background: #f3f4f6; color: #4b5563; }
    .status { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 500; }
    .status.success { background: #dcfce7; color: #16a34a; }
    .status.failed { background: #fee2e2; color: #dc2626; }
    .status.pending { background: #fef3c7; color: #d97706; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; }
    @media print {
      body { padding: 20px; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <div class="meta">
      Generated: ${timestamp} | Records: ${logs.length}
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Timestamp</th>
        <th>Category</th>
        <th>Event</th>
        <th>User</th>
        <th>Status</th>
        <th>IP Address</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  
  <div class="footer">
    <p>Mobul Activity Log Export - Confidential</p>
  </div>
  
  <script>
    // Auto-print when opened
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
  `;
}

/**
 * Log export action for audit trail
 */
async function logExportAudit(format: ExportFormat, recordCount: number, filters?: ActivityFilters): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Log to security_audit_log if table exists
    await supabase.from('security_audit_log').insert({
      user_id: user?.id,
      action_type: 'activity_log_export',
      resource_type: 'activity_logs',
      success: true,
      ip_address: null, // Would need to get from request context
      metadata: {
        format,
        record_count: recordCount,
        filters: filters || {},
        exported_at: new Date().toISOString(),
      },
    }).catch(() => {
      // Table might not exist, silently fail
      console.log('Export audit logging skipped - table may not exist');
    });
  } catch (error) {
    // Don't fail export if audit logging fails
    console.warn('Failed to log export audit:', error);
  }
}

/**
 * Download blob as file
 */
function downloadBlob(blob: Blob, filename: string): void {
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
 * Generate filename with timestamp
 */
function generateFilename(format: ExportFormat, prefix = 'activity-logs'): string {
  const timestamp = formatDate(new Date().toISOString(), 'yyyy-MM-dd_HHmmss');
  return `${prefix}_${timestamp}.${format}`;
}

export function useActivityExport(): UseActivityExportReturn {
  const [lastExport, setLastExport] = useState<ExportResult | null>(null);

  const exportMutation = useMutation({
    mutationFn: async ({ logs, options }: { logs: ActivityLog[]; options: ExportOptions }): Promise<ExportResult> => {
      const { format, columns, include_header = true, filters } = options;
      
      let content: string;
      let mimeType: string;
      let filename: string;
      
      switch (format) {
        case 'csv':
          content = logsToCSV(logs, columns);
          mimeType = 'text/csv;charset=utf-8;';
          filename = generateFilename('csv');
          break;
        case 'json':
          content = logsToJSON(logs, columns);
          mimeType = 'application/json;charset=utf-8;';
          filename = generateFilename('json');
          break;
        case 'pdf': {
          // Generate print-friendly HTML and open in new window for printing to PDF
          const htmlContent = logsToPrintableHTML(logs, 'Activity Log Export');
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
          }
          
          // Log audit for PDF export
          await logExportAudit(format, logs.length, filters);
          
          return {
            filename: generateFilename('pdf'),
            records_exported: logs.length,
            generated_at: new Date().toISOString(),
          };
        }
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      const blob = new Blob([content], { type: mimeType });
      
      // Trigger download
      downloadBlob(blob, filename);
      
      // Log export for audit trail
      await logExportAudit(format, logs.length, filters);

      const result: ExportResult = {
        blob,
        filename,
        records_exported: logs.length,
        generated_at: new Date().toISOString(),
      };

      return result;
    },
    onSuccess: (result) => {
      setLastExport(result);
    },
  });

  const exportLogs = useCallback(async (
    logs: ActivityLog[], 
    options: ExportOptions
  ): Promise<ExportResult> => {
    return exportMutation.mutateAsync({ logs, options });
  }, [exportMutation]);

  return {
    exportLogs,
    isExporting: exportMutation.isPending,
    error: exportMutation.error as Error | null,
    lastExport,
  };
}

export default useActivityExport;
