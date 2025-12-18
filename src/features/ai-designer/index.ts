/**
 * AI Designer Feature Module
 * 
 * AI-first landing page designer with code generation.
 * Exports all components, hooks, types, and utilities.
 */

// ============================================================================
// Types
// ============================================================================

export * from './types';

// ============================================================================
// Hooks
// ============================================================================

export { useAILandingPageWorkflow } from './hooks/useAILandingPageWorkflow';
export type { UseAILandingPageWorkflowOptions, UseAILandingPageWorkflowReturn } from './hooks/useAILandingPageWorkflow';

export { useClickToEdit } from './hooks/useClickToEdit';
export type { UseClickToEditOptions, UseClickToEditReturn } from './hooks/useClickToEdit';

// ============================================================================
// Components
// ============================================================================

export { AILandingPageChat, TEMPLATE_STARTERS } from './components/AILandingPageChat';
export { LiveCodePreview } from './components/LiveCodePreview';
export type { LiveCodePreviewRef } from './components/LiveCodePreview';
export { CodeEditorPanel } from './components/CodeEditorPanel';
export { TemplateGallery, TEMPLATES } from './components/TemplateGallery';
export { VersionHistory } from './components/VersionHistory';
export { ExportDialog } from './components/ExportDialog';

// ============================================================================
// Utilities
// ============================================================================

export {
  classifyError,
  validateHTML,
  sanitizeHTML,
  withRetry,
  getUserFriendlyError,
  logError,
} from './utils/errorHandling';

export type {
  AIDesignerErrorType,
  AIDesignerError,
  HTMLValidationResult,
  RetryConfig,
} from './utils/errorHandling';
