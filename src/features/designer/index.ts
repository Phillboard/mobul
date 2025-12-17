/**
 * Unified Designer - Export Index
 * Centralized exports for the designer system
 */

// ============================================================================
// EXISTING DESIGNER EXPORTS (backward compatibility)
// ============================================================================
export * from './types/designer';
export { useDesignerState } from './hooks/useDesignerState';
export { useDesignerHistory } from './hooks/useDesignerHistory';
export { useDesignerAI } from './hooks/useDesignerAI';
export { useDesignerExport } from './hooks/useDesignerExport';
export { DesignerCanvas } from './components/DesignerCanvas';
export { DesignerAIChat } from './components/DesignerAIChat';
export { ElementLibrary } from './components/ElementLibrary';
export { PropertiesPanel } from './components/PropertiesPanel';
export { LayerPanel } from './components/LayerPanel';
export { TokenInserter } from './components/TokenInserter';
export { executeDesignActions } from './utils/aiActionExecutor';
export { QuickActions } from './components/QuickActions';

// ============================================================================
// NEW UNIFIED DESIGNER EXPORTS
// ============================================================================

// Types
export * from './types/canvas';
export * from './types/context';
export * from './types/landingPage';

// Hooks
export { useCanvasConfig } from './hooks/useCanvasConfig';
export { useCampaignContext } from './hooks/useCampaignContext';

// Context
export { DesignerContextProvider, useDesignerContext } from './context/DesignerContextProvider';

// Canvas Components
export { ProportionalCanvas } from './components/Canvas/ProportionalCanvas';
export { SizeSelector } from './components/Canvas/SizeSelector';
export { OrientationSwitcher } from './components/Canvas/OrientationSwitcher';
export { SideTabs } from './components/Canvas/SideTabs';
export { LandingPageCanvas, DeviceSwitcher } from './components/Canvas/LandingPageCanvas';

// UI Components
export { LoadingOverlay } from './components/LoadingOverlay';
export { ContextAwareActions } from './components/QuickActions/ContextAwareActions';
export { LandingPageActions } from './components/QuickActions/LandingPageActions';
export { BackgroundUploader } from './components/BackgroundUploader';

// Templates
export { getFrontDesignPrompt } from './templates/frontPrompts';
export { getBackDesignPrompt } from './templates/backPrompts';
export { getBackgroundPrompt, getBrandBackgroundSuggestions } from './templates/backgroundPrompts';
export { getLandingPagePrompt, getLandingHeroPrompt, getLandingFormPrompt } from './templates/landingPagePrompts';

// Data
export { BRAND_STYLES, detectBrand, getBrandStyle } from './data/brandPresets';
export { INDUSTRY_STYLES, getIndustryStyle } from './data/industryPresets';

// Utils
export { getContextualMessage, useContextualLoadingMessage } from './utils/loadingMessages';
