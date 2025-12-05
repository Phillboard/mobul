/**
 * Frontend Request Tracer Utility
 * 
 * Provides client-side request tracing for gift card provisioning
 * to help correlate frontend requests with backend traces.
 */

import { supabase } from '@core/services/supabase';

// Generate unique trace ID in the same format as backend
export function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `req_${timestamp}_${random}`;
}

// Error code descriptions
export const PROVISIONING_ERROR_CODES: Record<string, { 
  code: string; 
  description: string; 
  recommendation: string; 
  severity: 'critical' | 'error' | 'warning' | 'info';
  canRetry: boolean;
  requiresCampaignEdit: boolean;
}> = {
  'GC-001': { 
    code: 'GC-001',
    description: 'Campaign condition missing gift card config', 
    recommendation: 'Edit the campaign and configure a gift card brand and value for all conditions.',
    severity: 'critical',
    canRetry: false,
    requiresCampaignEdit: true,
  },
  'GC-002': { 
    code: 'GC-002',
    description: 'Gift card brand not found', 
    recommendation: 'Verify the brand ID is correct or choose a different brand in campaign settings.',
    severity: 'error',
    canRetry: false,
    requiresCampaignEdit: true,
  },
  'GC-003': { 
    code: 'GC-003',
    description: 'No gift card inventory available', 
    recommendation: 'Upload gift card inventory OR configure Tillo API credentials in Settings → Integrations.',
    severity: 'error',
    canRetry: true,
    requiresCampaignEdit: false,
  },
  'GC-004': { 
    code: 'GC-004',
    description: 'Tillo API not configured', 
    recommendation: 'Configure TILLO_API_KEY and TILLO_SECRET_KEY in Supabase secrets.',
    severity: 'critical',
    canRetry: false,
    requiresCampaignEdit: false,
  },
  'GC-005': { 
    code: 'GC-005',
    description: 'Tillo API call failed', 
    recommendation: 'Check Tillo API credentials and ensure the brand code is valid. Try again in a few minutes.',
    severity: 'error',
    canRetry: true,
    requiresCampaignEdit: false,
  },
  'GC-006': { 
    code: 'GC-006',
    description: 'Insufficient credits', 
    recommendation: 'Add credits to the client/agency account before provisioning.',
    severity: 'critical',
    canRetry: false,
    requiresCampaignEdit: false,
  },
  'GC-007': { 
    code: 'GC-007',
    description: 'Billing transaction failed', 
    recommendation: 'Contact support - billing transaction failed. Card may need manual reconciliation.',
    severity: 'error',
    canRetry: false,
    requiresCampaignEdit: false,
  },
  'GC-008': { 
    code: 'GC-008',
    description: 'Campaign billing not configured', 
    recommendation: 'Ensure the campaign has a valid client assigned with billing configuration.',
    severity: 'critical',
    canRetry: false,
    requiresCampaignEdit: true,
  },
  'GC-009': { 
    code: 'GC-009',
    description: 'Recipient verification required', 
    recommendation: 'Complete SMS opt-in or email verification before provisioning.',
    severity: 'warning',
    canRetry: true,
    requiresCampaignEdit: false,
  },
  'GC-010': { 
    code: 'GC-010',
    description: 'Gift card already provisioned', 
    recommendation: 'This recipient already has a gift card for this campaign condition.',
    severity: 'info',
    canRetry: false,
    requiresCampaignEdit: false,
  },
  'GC-011': { 
    code: 'GC-011',
    description: 'Invalid redemption code', 
    recommendation: 'Verify the redemption code and ensure customer is in an active campaign.',
    severity: 'warning',
    canRetry: true,
    requiresCampaignEdit: false,
  },
  'GC-012': { 
    code: 'GC-012',
    description: 'Missing required parameters', 
    recommendation: 'Check that all required fields are provided in the request.',
    severity: 'error',
    canRetry: true,
    requiresCampaignEdit: false,
  },
  'GC-013': { 
    code: 'GC-013',
    description: 'Database function error', 
    recommendation: 'Run database migrations to create required functions.',
    severity: 'critical',
    canRetry: false,
    requiresCampaignEdit: false,
  },
  'GC-014': { 
    code: 'GC-014',
    description: 'SMS/Email delivery failed', 
    recommendation: 'Delivery notification failed but card was provisioned. Check SMS/Email settings.',
    severity: 'warning',
    canRetry: true,
    requiresCampaignEdit: false,
  },
  'GC-015': { 
    code: 'GC-015',
    description: 'Unknown provisioning error', 
    recommendation: 'Review the error details and contact support if needed.',
    severity: 'error',
    canRetry: true,
    requiresCampaignEdit: false,
  },
};

export interface ProvisioningRequest {
  traceId: string;
  campaignId?: string;
  recipientId?: string;
  brandId?: string;
  denomination?: number;
  startedAt: Date;
  status: 'pending' | 'success' | 'failed';
  error?: {
    code?: string;
    message: string;
    canRetry?: boolean;
    requiresCampaignEdit?: boolean;
  };
  completedAt?: Date;
  durationMs?: number;
}

export interface TraceDetails {
  requestId: string;
  steps: Array<{
    stepNumber: number;
    stepName: string;
    status: 'started' | 'completed' | 'failed' | 'skipped';
    durationMs?: number;
    details?: Record<string, any>;
    errorMessage?: string;
    errorCode?: string;
    createdAt: string;
  }>;
  overallStatus: 'success' | 'failed' | 'in_progress';
  totalDurationMs?: number;
}

/**
 * Request Tracer Class
 * 
 * Provides methods for creating, tracking, and querying provisioning requests
 */
class RequestTracerClass {
  private pendingRequests: Map<string, ProvisioningRequest> = new Map();
  
  /**
   * Generate a new trace ID
   */
  generateTraceId(): string {
    return generateTraceId();
  }
  
  /**
   * Start tracking a new provisioning request
   */
  startRequest(context: {
    campaignId?: string;
    recipientId?: string;
    brandId?: string;
    denomination?: number;
  }): ProvisioningRequest {
    const traceId = this.generateTraceId();
    const request: ProvisioningRequest = {
      traceId,
      ...context,
      startedAt: new Date(),
      status: 'pending',
    };
    
    this.pendingRequests.set(traceId, request);
    
    console.log(`[REQUEST-TRACER] Started request ${traceId}`, {
      campaignId: context.campaignId,
      recipientId: context.recipientId,
    });
    
    return request;
  }
  
  /**
   * Mark a request as completed
   */
  completeRequest(traceId: string): void {
    const request = this.pendingRequests.get(traceId);
    if (request) {
      request.status = 'success';
      request.completedAt = new Date();
      request.durationMs = request.completedAt.getTime() - request.startedAt.getTime();
      
      console.log(`[REQUEST-TRACER] Request ${traceId} completed in ${request.durationMs}ms`);
    }
  }
  
  /**
   * Mark a request as failed
   */
  failRequest(traceId: string, error: {
    code?: string;
    message: string;
    canRetry?: boolean;
    requiresCampaignEdit?: boolean;
  }): void {
    const request = this.pendingRequests.get(traceId);
    if (request) {
      request.status = 'failed';
      request.error = error;
      request.completedAt = new Date();
      request.durationMs = request.completedAt.getTime() - request.startedAt.getTime();
      
      console.error(`[REQUEST-TRACER] Request ${traceId} failed:`, error);
    }
  }
  
  /**
   * Get a pending request by trace ID
   */
  getRequest(traceId: string): ProvisioningRequest | undefined {
    return this.pendingRequests.get(traceId);
  }
  
  /**
   * Fetch trace details from the database
   */
  async getTraceDetails(requestId: string): Promise<TraceDetails | null> {
    try {
      const { data, error } = await supabase.rpc('get_provisioning_trace', {
        p_request_id: requestId,
      });
      
      if (error) {
        console.error('[REQUEST-TRACER] Failed to fetch trace:', error);
        return null;
      }
      
      if (!data || data.length === 0) {
        return null;
      }
      
      // Determine overall status
      const hasFailure = data.some((step: any) => step.status === 'failed');
      const allCompleted = data.every((step: any) => 
        step.status === 'completed' || step.status === 'skipped'
      );
      
      let overallStatus: 'success' | 'failed' | 'in_progress' = 'in_progress';
      if (hasFailure) overallStatus = 'failed';
      else if (allCompleted) overallStatus = 'success';
      
      // Calculate total duration
      const durations = data
        .filter((step: any) => step.duration_ms)
        .map((step: any) => step.duration_ms);
      const totalDurationMs = durations.reduce((sum: number, d: number) => sum + d, 0);
      
      return {
        requestId,
        steps: data.map((step: any) => ({
          stepNumber: step.step_number,
          stepName: step.step_name,
          status: step.status,
          durationMs: step.duration_ms,
          details: step.details,
          errorMessage: step.error_message,
          errorCode: step.error_code,
          createdAt: step.created_at,
        })),
        overallStatus,
        totalDurationMs,
      };
    } catch (err) {
      console.error('[REQUEST-TRACER] Exception fetching trace:', err);
      return null;
    }
  }
  
  /**
   * Run diagnostics for a campaign
   */
  async runDiagnostics(params: {
    campaignId?: string;
    recipientId?: string;
    conditionId?: string;
    brandId?: string;
    denomination?: number;
  }): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('diagnose-provisioning-setup', {
        body: params,
      });
      
      if (error) {
        console.error('[REQUEST-TRACER] Diagnostics failed:', error);
        return { success: false, error: error.message };
      }
      
      return data;
    } catch (err) {
      console.error('[REQUEST-TRACER] Exception running diagnostics:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  /**
   * Get error code details
   */
  getErrorCodeDetails(code: string): typeof PROVISIONING_ERROR_CODES[string] | null {
    return PROVISIONING_ERROR_CODES[code] || null;
  }
  
  /**
   * Clear completed requests older than specified minutes
   */
  clearOldRequests(olderThanMinutes: number = 30): void {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    
    for (const [traceId, request] of this.pendingRequests.entries()) {
      if (request.completedAt && request.completedAt < cutoff) {
        this.pendingRequests.delete(traceId);
      }
    }
  }
}

// Singleton instance
export const RequestTracer = new RequestTracerClass();

// Export helper for creating traced fetch calls
export async function tracedProvisioningCall<T>(
  context: {
    campaignId?: string;
    recipientId?: string;
    brandId?: string;
    denomination?: number;
  },
  fetchFn: (traceId: string) => Promise<T>
): Promise<{ data: T | null; traceId: string; error?: { code?: string; message: string } }> {
  const request = RequestTracer.startRequest(context);
  
  try {
    const data = await fetchFn(request.traceId);
    RequestTracer.completeRequest(request.traceId);
    return { data, traceId: request.traceId };
  } catch (error: any) {
    const errorDetails = {
      code: error.errorCode,
      message: error.message || 'Unknown error',
      canRetry: error.canRetry,
      requiresCampaignEdit: error.requiresCampaignEdit,
    };
    RequestTracer.failRequest(request.traceId, errorDetails);
    return { data: null, traceId: request.traceId, error: errorDetails };
  }
}

export default RequestTracer;

