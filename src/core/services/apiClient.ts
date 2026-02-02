/**
 * @deprecated This module is deprecated. Import from '@core/api/client' instead.
 * 
 * This file re-exports from the canonical API client for backward compatibility.
 * All functionality has been moved to src/core/api/client.ts which provides:
 * - Retry logic with exponential backoff
 * - Request/response/error interceptors
 * - Request ID tracking for debugging
 * - Enhanced error codes
 * 
 * Migration:
 * ```typescript
 * // Old (deprecated):
 * import { callEdgeFunction } from '@core/services/apiClient';
 * 
 * // New (recommended):
 * import { callEdgeFunction } from '@core/api/client';
 * ```
 */

// Re-export everything from the canonical client
export {
  // Error class
  EdgeFunctionError,
  
  // Types
  type RequestConfig,
  type EdgeFunctionOptions, // Deprecated alias for RequestConfig
  
  // Main functions
  callEdgeFunction,
  callPublicEdgeFunction,
  
  // TanStack Query helpers
  createEdgeFunctionMutation,
  createEdgeFunctionQuery,
  
  // Interceptors
  addRequestInterceptor,
  addResponseInterceptor,
  addErrorInterceptor,
} from '@core/api/client';
