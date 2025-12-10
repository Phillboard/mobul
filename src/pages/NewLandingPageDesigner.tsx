/**
 * NewLandingPageDesigner Page
 * 
 * AI-first landing page designer for campaign PURLs.
 * 
 * Layout: AI on LEFT (primary), Canvas CENTER, Properties RIGHT
 * 
 * Features:
 * - Responsive design previews
 * - Form fields and buttons
 * - Template tokens
 * - AI-powered layout generation
 * - Export to HTML
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ArrowLeft, Save, Download, Globe, Undo, Redo, Layers, Settings, Tag, Monitor, Tablet, Smartphone } from 'lucide-react';
import { useToast } from '@shared/hooks';
import {
  DESIGNER_PRESETS,
  useDesignerState,
  useDesignerHistory,
  useDesignerAI,
  useDesignerExport,
  DesignerCanvas,
  DesignerAIChat,
  BackgroundUploader,
  ElementLibrary,
  TokenInserter,
  PropertiesPanel,
  LayerPanel,
  executeDesignActions,
} from '@/features/designer';

export default function NewLandingPageDesigner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rightTab, setRightTab] = useState('properties');
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Fetch existing landing page
  const { data: landingPage, isLoading } = useQuery({
    queryKey: ['landing-page', id],
    queryFn: async () => {
      if (id === 'new') return null;

      const { data, error } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Initialize designer with landing page preset
  const config = DESIGNER_PRESETS['landing-page'];

  const initialState = landingPage?.visual_editor_state
    ? (typeof landingPage.visual_editor_state === 'string' 
        ? JSON.parse(landingPage.visual_editor_state) 
        : landingPage.visual_editor_state)
    : undefined;

  const designerState = useDesignerState({
    config,
    initialState,
    autoSaveInterval: 30000,
  });

  const history = useDesignerHistory({
    initialState: designerState.canvasState,
    maxHistorySize: 50,
    enableKeyboardShortcuts: true,
  });

  // AI assistant - auto-apply suggestions
  const ai = useDesignerAI({
    designerType: 'landing-page',
    canvasState: designerState.canvasState,
    onSuggestion: (suggestion) => {
      if (suggestion.actions && suggestion.actions.length > 0) {
        console.log('[NewLandingPageDesigner] Auto-applying AI suggestion:', suggestion);
        history.recordState(designerState.canvasState, 'AI suggestion');
        const result = executeDesignActions(suggestion.actions, designerState);
        
        if (result.executed > 0) {
          toast({
            title: '✨ AI Applied',
            description: `${result.executed} change(s) made to your design.`,
          });
        }
      }
    },
  });

  const exporter = useDesignerExport({
    canvasState: designerState.canvasState,
    designerType: 'landing-page',
  });

  /**
   * Save landing page
   */
  const saveMutation = useMutation({
    mutationFn: async () => {
      const visualEditorState = designerState.canvasState;

      if (id === 'new' || !landingPage) {
        const { data, error } = await supabase
          .from('landing_pages')
          .insert({
            name: 'Untitled Landing Page',
            visual_editor_state: visualEditorState,
            editor_type: 'canvas',
            published: false,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('landing_pages')
          .update({
            visual_editor_state: visualEditorState,
            editor_type: 'canvas',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['landing-page', id] });
      designerState.markClean();
      
      toast({
        title: 'Saved!',
        description: 'Your landing page has been saved.',
      });

      if (id === 'new') {
        navigate(`/landing-pages/${data.id}/canvas`);
      }
    },
  });

  const handleApplySuggestion = (suggestion: any) => {
    if (!suggestion.actions) return;

    history.recordState(designerState.canvasState, 'AI suggestion');
    const result = executeDesignActions(suggestion.actions, designerState);

    if (result.executed > 0) {
      toast({
        title: 'Applied!',
        description: `${result.executed} action(s) applied.`,
      });
    }
  };

  const handleExport = async () => {
    try {
      const html = await exporter.exportToHTML({ responsive: true });
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'landing-page.html';
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Exported!',
        description: 'Landing page HTML has been downloaded.',
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // View mode sizes
  const getViewModeWidth = () => {
    switch (viewMode) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      default: return 'auto';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading designer...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="h-14 border-b bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/landing-pages')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            <div>
              <h1 className="text-lg font-semibold">Landing Page Designer</h1>
              <p className="text-xs text-muted-foreground">
                {landingPage?.name || 'New Landing Page'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              size="sm"
              variant={viewMode === 'desktop' ? 'default' : 'ghost'}
              onClick={() => setViewMode('desktop')}
              className="h-7 px-2"
              title="Desktop view"
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'tablet' ? 'default' : 'ghost'}
              onClick={() => setViewMode('tablet')}
              className="h-7 px-2"
              title="Tablet view"
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'mobile' ? 'default' : 'ghost'}
              onClick={() => setViewMode('mobile')}
              className="h-7 px-2"
              title="Mobile view"
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => history.undo()}
            disabled={!history.canUndo}
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => history.redo()}
            disabled={!history.canRedo}
          >
            <Redo className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export HTML
          </Button>

          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !designerState.isDirty}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Main Content - AI on LEFT */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        
        {/* ========== LEFT PANEL - AI FIRST ========== */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <div className="h-full flex flex-col bg-card">
            {/* AI Chat - PRIMARY */}
            <div className="flex-1 min-h-0">
              <DesignerAIChat
                messages={ai.messages}
                isGenerating={ai.isGenerating}
                error={ai.error}
                currentSuggestion={ai.currentSuggestion}
                designerType="landing-page"
                onSendMessage={ai.sendMessage}
                onApplySuggestion={handleApplySuggestion}
                onRejectSuggestion={() => {}}
                onClearConversation={ai.clearConversation}
                onRetry={ai.retryLastMessage}
                className="h-full"
              />
            </div>

            {/* Quick Add Elements */}
            <div className="border-t p-3">
              <ElementLibrary
                onAddElement={(type, template) => {
                  history.recordState(designerState.canvasState, `Add ${type}`);
                  designerState.addElement(template || { type });
                }}
                allowedElements={config.allowedElements}
                className="border-0 shadow-none"
              />
            </div>

            {/* Background Upload */}
            <div className="border-t p-3">
              <BackgroundUploader
                currentBackground={designerState.canvasState.backgroundImage}
                onBackgroundSet={designerState.setBackgroundImage}
                onBackgroundRemove={() => designerState.setBackgroundImage(null)}
              />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* ========== CENTER - CANVAS ========== */}
        <ResizablePanel defaultSize={50} minSize={35}>
          <div className="h-full flex items-center justify-center p-8 bg-muted/30 overflow-auto">
            <div className="shadow-2xl transition-all duration-300" style={{ width: getViewModeWidth() }}>
              <DesignerCanvas
                canvasState={designerState.canvasState}
                onElementSelect={designerState.selectElements}
                onElementUpdate={(id, updates) => {
                  history.recordState(designerState.canvasState, 'Update element');
                  designerState.updateElement(id, updates);
                }}
                onElementCreate={(element) => {
                  console.log('[NewLandingPageDesigner] Element dropped:', element);
                  history.recordState(designerState.canvasState, `Add ${element.type}`);
                  designerState.addElement(element);
                }}
                toolMode="select"
                snapToGrid={designerState.canvasState.settings?.snapToGrid}
              />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* ========== RIGHT PANEL - PROPERTIES ========== */}
        <ResizablePanel defaultSize={25} minSize={18} maxSize={35}>
          <Tabs value={rightTab} onValueChange={setRightTab} className="h-full flex flex-col">
            <div className="border-b px-2 py-1">
              <TabsList className="grid w-full grid-cols-3 h-8">
                <TabsTrigger value="properties" className="text-xs h-7">
                  <Settings className="h-3 w-3 mr-1" />
                  Properties
                </TabsTrigger>
                <TabsTrigger value="layers" className="text-xs h-7">
                  <Layers className="h-3 w-3 mr-1" />
                  Layers
                </TabsTrigger>
                <TabsTrigger value="tokens" className="text-xs h-7">
                  <Tag className="h-3 w-3 mr-1" />
                  Tokens
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="properties" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <PropertiesPanel
                      selectedElements={designerState.selectedElements}
                      onUpdateElement={(id, updates) => {
                        history.recordState(designerState.canvasState, 'Update');
                        designerState.updateElement(id, updates);
                      }}
                      onDeleteElement={(id) => {
                        history.recordState(designerState.canvasState, 'Delete');
                        designerState.deleteElement(id);
                      }}
                      onDuplicateElement={(id) => {
                        history.recordState(designerState.canvasState, 'Duplicate');
                        designerState.duplicateElement(id);
                      }}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="layers" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <LayerPanel
                      elements={designerState.canvasState.elements}
                      selectedElementIds={designerState.canvasState.selectedElementIds}
                      onSelectElement={designerState.selectElement}
                      onUpdateElement={(id, updates) => {
                        history.recordState(designerState.canvasState, 'Update');
                        designerState.updateElement(id, updates);
                      }}
                      onDeleteElement={(id) => {
                        history.recordState(designerState.canvasState, 'Delete');
                        designerState.deleteElement(id);
                      }}
                      onReorderLayers={() => {}}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="tokens" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <TokenInserter
                      onTokenSelect={(token) => {
                        history.recordState(designerState.canvasState, 'Add token');
                        designerState.addElement({
                          type: 'template-token',
                          tokenContent: { token, fallback: '', transform: 'none' },
                          width: 200,
                          height: 40,
                          styles: { fontSize: 16, color: '#4F46E5' },
                        });
                      }}
                      availableTokens={config.availableTokens}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
