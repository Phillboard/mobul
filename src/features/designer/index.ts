/**
 * Designer Feature - Barrel Export
 * 
 * AI-first unified designer for mail pieces, landing pages, and email templates.
 * Replaces GrapesJS with a modern, token-aware design system.
 */

// Types
export * from './types/designer';

// Utils
export * from './utils/tokenParser';
export * from './utils/aiPrompts';
export * from './utils/aiActionExecutor';
export * from './utils/exportPDF';
export * from './utils/exportHTML';

// Hooks
export * from './hooks/useDesignerState';
export * from './hooks/useDesignerHistory';
export * from './hooks/useDesignerAI';
export * from './hooks/useDesignerExport';

// Components
export * from './components/DesignerCanvas';
export * from './components/DesignerAIChat';
export * from './components/BackgroundUploader';
export * from './components/ElementLibrary';
export * from './components/TokenInserter';
export * from './components/PropertiesPanel';
export * from './components/LayerPanel';
export * from './components/TemplateLibrary';
// export * from './components/DesignerSidebar';
// export * from './components/DesignerAIChat';
// export * from './components/BackgroundUploader';
// export * from './components/TokenInserter';
// export * from './components/ElementLibrary';
// export * from './components/LayerPanel';
// export * from './components/PropertiesPanel';

