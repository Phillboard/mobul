/**
 * AI Designer Types
 * 
 * TypeScript types for the AI-first landing page designer
 */

// ============================================================================
// Chat & Messages
// ============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    tokensUsed?: number;
    changesMade?: string[];
    error?: boolean;
  };
}

// ============================================================================
// Element Selection (Click-to-Edit)
// ============================================================================

export interface ElementContext {
  selector: string;
  tagName: string;
  textContent: string;
  className: string;
  id?: string;
  parentContext?: string;
}

// ============================================================================
// Version History
// ============================================================================

export interface Version {
  version: number;
  html: string;
  timestamp: string;
  changeDescription: string;
  tokensUsed: number;
  isManualEdit?: boolean;
}

// ============================================================================
// Templates
// ============================================================================

export type TemplateCategory = 
  | 'saas'
  | 'lead-gen'
  | 'gift-card'
  | 'thank-you'
  | 'event'
  | 'service'
  | 'product'
  | 'portfolio';

export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  thumbnail: string;
  prompt: string;
  tags: string[];
  isPopular?: boolean;
}

// ============================================================================
// Workflow State
// ============================================================================

export type ViewMode = 'desktop' | 'tablet' | 'mobile';

export type EditorMode = 'code-gen' | 'visual' | 'canvas';

export interface LandingPageMetadata {
  title: string;
  description: string;
  tokensUsed: number;
  lastSaved?: string;
  publishedUrl?: string;
}

export interface WorkflowState {
  // Current page state
  currentHTML: string;
  currentVersion: number;
  isDirty: boolean;
  
  // AI interaction
  chatHistory: ChatMessage[];
  isGenerating: boolean;
  selectedElement: ElementContext | null;
  
  // Metadata
  landingPageId: string | null;
  metadata: LandingPageMetadata;
  
  // Versions
  versions: Version[];
  
  // UI State
  viewMode: ViewMode;
  showCode: boolean;
  error: string | null;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface GenerateRequest {
  prompt: string;
  pageType?: 'product' | 'lead_gen' | 'thank_you' | 'event' | 'gift_card' | 'generic';
  industry?: 'real_estate' | 'automotive' | 'healthcare' | 'retail' | 'restaurant' | 'service' | 'generic';
  brandColors?: string[];
  brandFonts?: string[];
  targetAudience?: string;
  keyMessage?: string;
  callToAction?: string;
  includeForm?: boolean;
  includeTestimonials?: boolean;
  imageUrl?: string;
  sourceUrl?: string;
  provider?: 'openai' | 'anthropic';
}

export interface GenerateResponse {
  success: boolean;
  html: string;
  metadata: {
    title?: string;
    description?: string;
    sourceImage?: string;
    sourceAnalysis?: any;
  };
  tokensUsed: number;
  provider: string;
  model: string;
}

export interface ChatRequest {
  landingPageId: string;
  message: string;
  currentHtml: string;
  provider?: 'openai' | 'anthropic';
}

export interface ChatResponse {
  success: boolean;
  updatedHtml: string;
  explanation: string;
  changesMade: string[];
  tokensUsed: number;
  provider: string;
  model: string;
}

// ============================================================================
// Landing Page Database Record
// ============================================================================

export interface LandingPageRecord {
  id: string;
  client_id: string;
  slug: string;
  name: string;
  published: boolean;
  editor_type: EditorMode;
  generated_html?: string;
  visual_editor_state?: any;
  versions?: Version[];
  current_version?: number;
  ai_provider?: string;
  total_tokens_used?: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Export Types
// ============================================================================

export type ExportFormat = 'react' | 'static-html' | 'wordpress';

export interface ExportOptions {
  format: ExportFormat;
  componentName?: string;
  typescript?: boolean;
  includeComments?: boolean;
  minify?: boolean;
}

// ============================================================================
// Workflow Actions
// ============================================================================

export type WorkflowAction =
  | { type: 'SET_HTML'; html: string }
  | { type: 'SET_GENERATING'; isGenerating: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'ADD_MESSAGE'; message: ChatMessage }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SELECT_ELEMENT'; element: ElementContext | null }
  | { type: 'ADD_VERSION'; version: Version }
  | { type: 'RESTORE_VERSION'; versionNumber: number }
  | { type: 'SET_VIEW_MODE'; mode: ViewMode }
  | { type: 'TOGGLE_CODE' }
  | { type: 'MARK_DIRTY' }
  | { type: 'MARK_CLEAN' }
  | { type: 'SET_METADATA'; metadata: Partial<LandingPageMetadata> }
  | { type: 'SET_LANDING_PAGE_ID'; id: string }
  | { type: 'LOAD_PAGE'; page: LandingPageRecord };
