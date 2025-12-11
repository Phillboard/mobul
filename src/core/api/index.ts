/**
 * API Client barrel export
 * Central access point for all API functionality
 */

// Core client
export {
  callEdgeFunction,
  callPublicEdgeFunction,
  EdgeFunctionError,
  createEdgeFunctionMutation,
  createEdgeFunctionQuery,
  addRequestInterceptor,
  addResponseInterceptor,
  addErrorInterceptor,
} from './client';

// Endpoints registry
export { Endpoints, createTypedEndpoint, getAllEndpoints, isValidEndpoint } from './endpoints';

// Re-export types
export type { RequestConfig } from './client';
