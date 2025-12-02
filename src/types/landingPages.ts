/**
 * Landing Page Types - Extended with AI features
 */

import { Database } from '@/integrations/supabase/types';

export type LandingPage = Database['public']['Tables']['landing_pages']['Row'];
export type LandingPageInsert = Database['public']['Tables']['landing_pages']['Insert'];
export type LandingPageUpdate = Database['public']['Tables']['landing_pages']['Update'];

export type AIProvider = 'openai' | 'anthropic' | 'manual';
export type SourceType = 'text_prompt' | 'image_upload' | 'link_analysis' | 'manual';
export type ExportFormat = 'static' | 'react' | 'wordpress' | 'hosted';

export interface LandingPageSourceData {
  prompt?: string;
  imageUrl?: string;
  sourceUrl?: string;
  pageType?: string;
  industry?: string;
  brandColors?: string[];
  brandFonts?: string[];
}

export interface LandingPageMetadata {
  title?: string;
  description?: string;
  colors?: string[];
  fonts?: string[];
}

export interface VisualEditorElement {
  id: string;
  type: string;
  tagName: string;
  attributes: Record<string, string>;
  styles: Record<string, string>;
  content?: string;
  children?: VisualEditorElement[];
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface VisualEditorState {
  elements: VisualEditorElement[];
  selectedElementId?: string;
  zoom: number;
  device: 'desktop' | 'tablet' | 'mobile';
  gridEnabled: boolean;
}

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface LandingPageExport {
  id: string;
  landing_page_id: string;
  export_format: ExportFormat;
  export_url?: string;
  configuration: Record<string, any>;
  created_at: string;
}

export interface GeneratePageRequest {
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
  provider?: AIProvider;
}

export interface GeneratePageResponse {
  success: boolean;
  html: string;
  metadata?: LandingPageMetadata;
  tokensUsed: number;
  provider: AIProvider;
  model: string;
}

export interface ChatRequest {
  landingPageId: string;
  message: string;
  currentHtml: string;
  provider?: AIProvider;
}

export interface ChatResponse {
  success: boolean;
  updatedHtml: string;
  explanation: string;
  changesMade: string[];
  tokensUsed: number;
  provider: AIProvider;
  model: string;
}

export interface ExportConfig {
  format: ExportFormat;
  options: {
    // Static export
    includeComments?: boolean;
    minify?: boolean;
    
    // React export
    componentName?: string;
    typescript?: boolean;
    cssModules?: boolean;
    
    // WordPress export
    pluginName?: string;
    shortcodePrefix?: string;
    
    // Hosted export
    customDomain?: string;
    sslEnabled?: boolean;
  };
}

