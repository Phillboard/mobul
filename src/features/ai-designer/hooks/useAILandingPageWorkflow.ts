/**
 * useAILandingPageWorkflow Hook
 * 
 * Core state management for the AI landing page designer.
 * Handles AI generation, chat history, version control, and persistence.
 */

import { useState, useCallback, useReducer, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { callEdgeFunction } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';
import { useToast } from '@shared/hooks';
import { useTenant } from '@/contexts/TenantContext';
import { exportToReact } from '@/features/landing-pages/utils/exporters/react-exporter';
import { exportToStaticHTML, downloadExport } from '@/features/landing-pages/utils/exporters/static-exporter';
import type {
  WorkflowState,
  WorkflowAction,
  ChatMessage,
  Version,
  GenerateRequest,
  GenerateResponse,
  ChatResponse,
  ElementContext,
  LandingPageRecord,
  LandingPageMetadata,
  ViewMode,
  Template,
} from '../types';

// ============================================================================
// Initial State
// ============================================================================

const initialState: WorkflowState = {
  currentHTML: '',
  currentVersion: 0,
  isDirty: false,
  chatHistory: [],
  isGenerating: false,
  selectedElement: null,
  landingPageId: null,
  metadata: {
    title: 'Untitled Landing Page',
    description: '',
    tokensUsed: 0,
  },
  versions: [],
  viewMode: 'desktop',
  showCode: false,
  error: null,
};

// ============================================================================
// Reducer
// ============================================================================

function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  switch (action.type) {
    case 'SET_HTML':
      return { ...state, currentHTML: action.html, isDirty: true };
    
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.isGenerating, error: null };
    
    case 'SET_ERROR':
      return { ...state, error: action.error, isGenerating: false };
    
    case 'ADD_MESSAGE':
      return { 
        ...state, 
        chatHistory: [...state.chatHistory, action.message] 
      };
    
    case 'CLEAR_MESSAGES':
      return { ...state, chatHistory: [] };
    
    case 'SELECT_ELEMENT':
      return { ...state, selectedElement: action.element };
    
    case 'ADD_VERSION': {
      const newVersions = [...state.versions, action.version];
      return { 
        ...state, 
        versions: newVersions,
        currentVersion: action.version.version,
        metadata: {
          ...state.metadata,
          tokensUsed: state.metadata.tokensUsed + (action.version.tokensUsed || 0),
        },
      };
    }
    
    case 'RESTORE_VERSION': {
      const version = state.versions.find(v => v.version === action.versionNumber);
      if (!version) return state;
      return {
        ...state,
        currentHTML: version.html,
        currentVersion: version.version,
        isDirty: true,
      };
    }
    
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.mode };
    
    case 'TOGGLE_CODE':
      return { ...state, showCode: !state.showCode };
    
    case 'MARK_DIRTY':
      return { ...state, isDirty: true };
    
    case 'MARK_CLEAN':
      return { ...state, isDirty: false };
    
    case 'SET_METADATA':
      return { 
        ...state, 
        metadata: { ...state.metadata, ...action.metadata } 
      };
    
    case 'SET_LANDING_PAGE_ID':
      return { ...state, landingPageId: action.id };
    
    case 'LOAD_PAGE': {
      const page = action.page;
      return {
        ...state,
        landingPageId: page.id,
        currentHTML: page.generated_html || '',
        versions: page.versions || [],
        currentVersion: page.current_version || 0,
        metadata: {
          title: page.name,
          description: '',
          tokensUsed: page.total_tokens_used || 0,
          lastSaved: page.updated_at,
        },
        isDirty: false,
      };
    }
    
    default:
      return state;
  }
}

// ============================================================================
// Hook
// ============================================================================

export interface UseAILandingPageWorkflowOptions {
  landingPageId?: string;
}

export interface UseAILandingPageWorkflowReturn {
  // State
  state: WorkflowState;
  
  // Generation
  generateFromPrompt: (prompt: string, options?: Partial<GenerateRequest>) => Promise<void>;
  generateFromTemplate: (template: Template) => Promise<void>;
  
  // Chat / Editing
  sendChatMessage: (message: string) => Promise<void>;
  editElement: (element: ElementContext, instruction: string) => Promise<void>;
  
  // Version History
  restoreVersion: (versionNumber: number) => void;
  
  // Element Selection
  selectElement: (element: ElementContext | null) => void;
  
  // View Controls
  setViewMode: (mode: ViewMode) => void;
  toggleCode: () => void;
  
  // Export
  exportAsReact: (componentName?: string) => Promise<void>;
  exportAsStatic: (filename?: string) => Promise<void>;
  
  // Persistence
  save: (name?: string) => Promise<string | null>;
  publish: () => Promise<string | null>;
  
  // Utilities
  clearChat: () => void;
  updateHTML: (html: string) => void;
  setError: (error: string | null) => void;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
}

export function useAILandingPageWorkflow(
  options: UseAILandingPageWorkflowOptions = {}
): UseAILandingPageWorkflowReturn {
  const { landingPageId } = options;
  const [state, dispatch] = useReducer(workflowReducer, initialState);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentClient } = useTenant();

  // ============================================================================
  // Load Existing Page
  // ============================================================================

  const { isLoading } = useQuery({
    queryKey: ['ai-landing-page', landingPageId],
    queryFn: async () => {
      if (!landingPageId || landingPageId === 'new') return null;

      const { data, error } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('id', landingPageId)
        .single();

      if (error) throw error;
      return data as LandingPageRecord;
    },
    enabled: !!landingPageId && landingPageId !== 'new',
  });

  // Load page data into state when query completes
  useEffect(() => {
    if (landingPageId && landingPageId !== 'new') {
      const pageData = queryClient.getQueryData<LandingPageRecord>(['ai-landing-page', landingPageId]);
      if (pageData) {
        dispatch({ 
          type: 'LOAD_PAGE', 
          page: pageData 
        });
      }
    }
  }, [landingPageId, queryClient]);

  // ============================================================================
  // Generate from Prompt
  // ============================================================================

  const generateFromPrompt = useCallback(async (
    prompt: string, 
    options: Partial<GenerateRequest> = {}
  ) => {
    dispatch({ type: 'SET_GENERATING', isGenerating: true });
    
    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };
    dispatch({ type: 'ADD_MESSAGE', message: userMessage });

    try {
      const data = await callEdgeFunction<GenerateResponse>(
        Endpoints.ai.landingPageGenerate,
        {
          prompt,
          ...options,
        }
      );

      if (!data?.success || !data.html) throw new Error('Failed to generate landing page');

      // Update HTML
      dispatch({ type: 'SET_HTML', html: data.html });

      // Add version
      const version: Version = {
        version: state.currentVersion + 1,
        html: data.html,
        timestamp: new Date().toISOString(),
        changeDescription: `Initial generation: ${prompt.substring(0, 50)}...`,
        tokensUsed: data.tokensUsed || 0,
      };
      dispatch({ type: 'ADD_VERSION', version });

      // Update metadata
      if (data.metadata) {
        dispatch({ 
          type: 'SET_METADATA', 
          metadata: {
            title: data.metadata.title || state.metadata.title,
            description: data.metadata.description || '',
          }
        });
      }

      // Add AI response message
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: 'Your landing page has been generated! Click on any element to edit it, or describe additional changes you\'d like to make.',
        timestamp: new Date(),
        metadata: {
          tokensUsed: data.tokensUsed,
        },
      };
      dispatch({ type: 'ADD_MESSAGE', message: aiMessage });

      toast({
        title: 'Landing page generated!',
        description: `Used ${data.tokensUsed} tokens with ${data.model}`,
      });

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate landing page';
      dispatch({ type: 'SET_ERROR', error: errorMessage });
      
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `Sorry, I couldn't generate your landing page: ${errorMessage}`,
        timestamp: new Date(),
        metadata: { error: true },
      };
      dispatch({ type: 'ADD_MESSAGE', message: errorMsg });

      toast({
        title: 'Generation failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      dispatch({ type: 'SET_GENERATING', isGenerating: false });
    }
  }, [state.currentVersion, state.metadata.title, toast]);

  // ============================================================================
  // Generate from Template
  // ============================================================================

  const generateFromTemplate = useCallback(async (template: Template) => {
    await generateFromPrompt(template.prompt, {
      pageType: template.category === 'lead-gen' ? 'lead_gen' : 
                template.category === 'gift-card' ? 'gift_card' :
                template.category === 'thank-you' ? 'thank_you' : 
                'generic',
    });
  }, [generateFromPrompt]);

  // ============================================================================
  // Send Chat Message (Iterative Editing)
  // ============================================================================

  const sendChatMessage = useCallback(async (message: string) => {
    if (!state.currentHTML) {
      toast({
        title: 'No page to edit',
        description: 'Generate a landing page first before making edits.',
        variant: 'destructive',
      });
      return;
    }

    dispatch({ type: 'SET_GENERATING', isGenerating: true });

    // Add user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    dispatch({ type: 'ADD_MESSAGE', message: userMessage });

    try {
      const data = await callEdgeFunction<ChatResponse>(
        Endpoints.ai.landingPageChat,
        {
          landingPageId: state.landingPageId || 'temp',
          message,
          currentHtml: state.currentHTML,
        }
      );

      if (!data?.success) throw new Error('Failed to update landing page');

      // Update HTML
      dispatch({ type: 'SET_HTML', html: data.updatedHtml });

      // Add version
      const version: Version = {
        version: state.currentVersion + 1,
        html: data.updatedHtml,
        timestamp: new Date().toISOString(),
        changeDescription: data.explanation || message.substring(0, 50),
        tokensUsed: data.tokensUsed || 0,
      };
      dispatch({ type: 'ADD_VERSION', version });

      // Add AI response
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: data.explanation || 'Changes applied successfully!',
        timestamp: new Date(),
        metadata: {
          tokensUsed: data.tokensUsed,
          changesMade: data.changesMade,
        },
      };
      dispatch({ type: 'ADD_MESSAGE', message: aiMessage });

      // Clear element selection after edit
      dispatch({ type: 'SELECT_ELEMENT', element: null });

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update landing page';
      dispatch({ type: 'SET_ERROR', error: errorMessage });
      
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `Sorry, I couldn't make that change: ${errorMessage}`,
        timestamp: new Date(),
        metadata: { error: true },
      };
      dispatch({ type: 'ADD_MESSAGE', message: errorMsg });

      toast({
        title: 'Edit failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      dispatch({ type: 'SET_GENERATING', isGenerating: false });
    }
  }, [state.currentHTML, state.landingPageId, state.currentVersion, toast]);

  // ============================================================================
  // Edit Element (Click-to-Edit)
  // ============================================================================

  const editElement = useCallback(async (element: ElementContext, instruction: string) => {
    const contextualMessage = `Edit the ${element.tagName.toLowerCase()} element${
      element.textContent ? ` that says "${element.textContent.substring(0, 30)}..."` : ''
    }${element.className ? ` with class "${element.className}"` : ''}: ${instruction}`;
    
    await sendChatMessage(contextualMessage);
  }, [sendChatMessage]);

  // ============================================================================
  // Version History
  // ============================================================================

  const restoreVersion = useCallback((versionNumber: number) => {
    dispatch({ type: 'RESTORE_VERSION', versionNumber });
    toast({
      title: 'Version restored',
      description: `Restored to version ${versionNumber}`,
    });
  }, [toast]);

  // ============================================================================
  // Element Selection
  // ============================================================================

  const selectElement = useCallback((element: ElementContext | null) => {
    dispatch({ type: 'SELECT_ELEMENT', element });
  }, []);

  // ============================================================================
  // View Controls
  // ============================================================================

  const setViewMode = useCallback((mode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', mode });
  }, []);

  const toggleCode = useCallback(() => {
    dispatch({ type: 'TOGGLE_CODE' });
  }, []);

  // ============================================================================
  // Export
  // ============================================================================

  const exportAsReact = useCallback(async (componentName = 'LandingPage') => {
    if (!state.currentHTML) {
      toast({
        title: 'Nothing to export',
        description: 'Generate a landing page first.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const blob = await exportToReact(state.currentHTML, {
        componentName,
        typescript: true,
      });
      
      downloadExport(blob, `${componentName.toLowerCase()}-react.zip`);
      
      toast({
        title: 'Export complete!',
        description: 'React component downloaded successfully.',
      });
    } catch (err: any) {
      toast({
        title: 'Export failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  }, [state.currentHTML, toast]);

  const exportAsStatic = useCallback(async (filename = 'landing-page') => {
    if (!state.currentHTML) {
      toast({
        title: 'Nothing to export',
        description: 'Generate a landing page first.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const blob = await exportToStaticHTML(state.currentHTML, {
        minify: true,
        filename: 'index.html',
      });
      
      downloadExport(blob, `${filename}-static.zip`);
      
      toast({
        title: 'Export complete!',
        description: 'Static HTML downloaded successfully.',
      });
    } catch (err: any) {
      toast({
        title: 'Export failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  }, [state.currentHTML, toast]);

  // ============================================================================
  // Save Mutation
  // ============================================================================

  const saveMutation = useMutation({
    mutationFn: async (name?: string) => {
      if (!currentClient?.id) throw new Error('No client selected');

      const payload = {
        name: name || state.metadata.title,
        generated_html: state.currentHTML,
        versions: state.versions,
        current_version: state.currentVersion,
        total_tokens_used: state.metadata.tokensUsed,
        editor_type: 'code-gen' as const,
        updated_at: new Date().toISOString(),
      };

      if (state.landingPageId) {
        // Update existing
        const { data, error } = await supabase
          .from('landing_pages')
          .update(payload)
          .eq('id', state.landingPageId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const slug = `lp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const { data, error } = await supabase
          .from('landing_pages')
          .insert({
            ...payload,
            client_id: currentClient.id,
            slug,
            published: false,
          })
          .select()
          .single();

        if (error) throw error;
        dispatch({ type: 'SET_LANDING_PAGE_ID', id: data.id });
        return data;
      }
    },
    onSuccess: (data) => {
      dispatch({ type: 'MARK_CLEAN' });
      queryClient.invalidateQueries({ queryKey: ['ai-landing-page', data.id] });
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      
      toast({
        title: 'Saved!',
        description: 'Your landing page has been saved.',
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Save failed',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const save = useCallback(async (name?: string): Promise<string | null> => {
    const result = await saveMutation.mutateAsync(name);
    return result?.id || null;
  }, [saveMutation]);

  // ============================================================================
  // Publish Mutation
  // ============================================================================

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!state.landingPageId) {
        // Save first if not saved
        const saved = await saveMutation.mutateAsync();
        if (!saved) throw new Error('Failed to save before publishing');
      }

      const pageId = state.landingPageId || (await saveMutation.mutateAsync())?.id;
      if (!pageId) throw new Error('No page ID');

      const { data, error } = await supabase
        .from('landing_pages')
        .update({ published: true })
        .eq('id', pageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      dispatch({ 
        type: 'SET_METADATA', 
        metadata: { publishedUrl: `/p/${data.slug}` } 
      });
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      
      toast({
        title: 'Published!',
        description: `Your landing page is now live at /p/${data.slug}`,
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Publish failed',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const publish = useCallback(async (): Promise<string | null> => {
    const result = await publishMutation.mutateAsync();
    return result?.slug || null;
  }, [publishMutation]);

  // ============================================================================
  // Utilities
  // ============================================================================

  const clearChat = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  }, []);

  const updateHTML = useCallback((html: string) => {
    dispatch({ type: 'SET_HTML', html });
    
    // Add manual edit version
    const version: Version = {
      version: state.currentVersion + 1,
      html,
      timestamp: new Date().toISOString(),
      changeDescription: 'Manual code edit',
      tokensUsed: 0,
      isManualEdit: true,
    };
    dispatch({ type: 'ADD_VERSION', version });
  }, [state.currentVersion]);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', error });
  }, []);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    state,
    generateFromPrompt,
    generateFromTemplate,
    sendChatMessage,
    editElement,
    restoreVersion,
    selectElement,
    setViewMode,
    toggleCode,
    exportAsReact,
    exportAsStatic,
    save,
    publish,
    clearChat,
    updateHTML,
    setError,
    isLoading,
    isSaving: saveMutation.isPending || publishMutation.isPending,
  };
}
