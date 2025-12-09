/**
 * NewMailDesigner Page
 * 
 * AI-first mail piece designer using the new unified designer framework.
 * Replaces the GrapesJS-based MailDesigner.tsx
 * 
 * Features:
 * - Upload mail template as background
 * - AI-powered design conversation
 * - Drag-and-drop elements
 * - Template tokens for personalization
 * - Export to PDF (300 DPI print-ready)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ArrowLeft, Save, Download, Eye, Sparkles, Undo, Redo } from 'lucide-react';
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

export default function NewMailDesigner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('design');

  // Fetch existing mail piece
  const { data: mailPiece, isLoading } = useQuery({
    queryKey: ['mail-piece', id],
    queryFn: async () => {
      if (id === 'new') return null;

      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Initialize designer with mail preset
  const config = DESIGNER_PRESETS.mail;

  // Parse existing canvas state if available
  const initialState = mailPiece?.canvas_state
    ? JSON.parse(mailPiece.canvas_state)
    : undefined;

  // Designer state management
  const designerState = useDesignerState({
    config,
    initialState,
    autoSaveInterval: 30000, // Auto-save every 30 seconds
    onAutoSave: (state) => {
      console.log('Auto-saving...', state);
      // Could save to localStorage here
    },
  });

  // History management
  const history = useDesignerHistory({
    initialState: designerState.canvasState,
    maxHistorySize: 50,
    enableKeyboardShortcuts: true,
  });

  // AI assistant
  const ai = useDesignerAI({
    designerType: 'mail',
    canvasState: designerState.canvasState,
    onSuggestion: (suggestion) => {
      // AI suggestion ready - user can apply it
      console.log('AI suggestion:', suggestion);
    },
  });

  // Export functionality
  const exporter = useDesignerExport({
    canvasState: designerState.canvasState,
    designerType: 'mail',
  });

  /**
   * Save mail piece to database
   */
  const saveMutation = useMutation({
    mutationFn: async () => {
      const canvasStateJSON = JSON.stringify(designerState.canvasState);

      if (id === 'new' || !mailPiece) {
        // Create new
        const { data, error } = await supabase
          .from('templates')
          .insert({
            name: 'Untitled Mail Piece',
            size: '4x6',
            canvas_state: canvasStateJSON,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Update existing
        const { data, error } = await supabase
          .from('templates')
          .update({
            canvas_state: canvasStateJSON,
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
      queryClient.invalidateQueries({ queryKey: ['mail-piece', id] });
      designerState.markClean();
      
      toast({
        title: 'Saved!',
        description: 'Your mail piece has been saved.',
      });

      // Navigate to the saved design if it was new
      if (id === 'new') {
        navigate(`/mail-designer/${data.id}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Save failed',
        description: error.message || 'Failed to save mail piece',
        variant: 'destructive',
      });
    },
  });

  /**
   * Handle AI suggestion application
   */
  const handleApplySuggestion = (suggestion: any) => {
    if (!suggestion.actions || suggestion.actions.length === 0) return;

    // Record current state in history before applying
    history.recordState(designerState.canvasState, 'AI suggestion');

    // Execute actions
    const result = executeDesignActions(suggestion.actions, designerState);

    if (result.executed > 0) {
      toast({
        title: 'Applied!',
        description: `${result.executed} action(s) applied successfully.`,
      });
    }

    if (result.failed > 0) {
      toast({
        title: 'Partial success',
        description: `${result.failed} action(s) failed.`,
        variant: 'destructive',
      });
    }
  };

  /**
   * Handle export
   */
  const handleExport = async () => {
    try {
      await exporter.downloadExport('pdf', 'mail-piece.pdf');
      toast({
        title: 'Exported!',
        description: 'Your mail piece has been downloaded.',
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive',
      });
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
      <div className="border-b bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/mail')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Mail Designer</h1>
              <p className="text-xs text-muted-foreground">
                {mailPiece?.name || 'New Mail Piece'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
              disabled={exporter.isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
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
      </div>

      {/* Main Content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Sidebar */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <div className="h-full overflow-y-auto p-4 space-y-4">
            <BackgroundUploader
              currentBackground={designerState.canvasState.backgroundImage}
              onBackgroundSet={designerState.setBackgroundImage}
              onBackgroundRemove={() => designerState.setBackgroundImage(null)}
            />

            <ElementLibrary
              onAddElement={(type, template) => {
                history.recordState(designerState.canvasState, `Add ${type}`);
                designerState.addElement(template || { type });
              }}
              allowedElements={config.allowedElements}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Center Canvas */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex items-center justify-center p-8 bg-muted/30">
            <div className="shadow-2xl">
              <DesignerCanvas
                canvasState={designerState.canvasState}
                onElementSelect={designerState.selectElements}
                onElementUpdate={(id, updates) => {
                  history.recordState(designerState.canvasState, 'Update element');
                  designerState.updateElement(id, updates);
                }}
                toolMode="select"
                snapToGrid={designerState.canvasState.settings?.snapToGrid}
                gridSize={designerState.canvasState.settings?.gridSize}
              />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Right Sidebar */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="border-b px-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="design" className="text-xs">Design</TabsTrigger>
                <TabsTrigger value="layers" className="text-xs">Layers</TabsTrigger>
                <TabsTrigger value="tokens" className="text-xs">Tokens</TabsTrigger>
                <TabsTrigger value="ai" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="design" className="h-full m-0">
                <div className="h-full overflow-y-auto p-4">
                  <PropertiesPanel
                    selectedElements={designerState.selectedElements}
                    onUpdateElement={(id, updates) => {
                      history.recordState(designerState.canvasState, 'Update properties');
                      designerState.updateElement(id, updates);
                    }}
                    onDeleteElement={(id) => {
                      history.recordState(designerState.canvasState, 'Delete element');
                      designerState.deleteElement(id);
                    }}
                    onDuplicateElement={(id) => {
                      history.recordState(designerState.canvasState, 'Duplicate element');
                      designerState.duplicateElement(id);
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="layers" className="h-full m-0">
                <div className="h-full overflow-y-auto p-4">
                  <LayerPanel
                    elements={designerState.canvasState.elements}
                    selectedElementIds={designerState.canvasState.selectedElementIds}
                    onSelectElement={designerState.selectElement}
                    onUpdateElement={(id, updates) => {
                      history.recordState(designerState.canvasState, 'Update layer');
                      designerState.updateElement(id, updates);
                    }}
                    onDeleteElement={(id) => {
                      history.recordState(designerState.canvasState, 'Delete layer');
                      designerState.deleteElement(id);
                    }}
                    onReorderLayers={(from, to) => {
                      // TODO: Implement layer reordering
                      console.log('Reorder:', from, to);
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="tokens" className="h-full m-0">
                <div className="h-full overflow-y-auto p-4">
                  <TokenInserter
                    onTokenSelect={(token) => {
                      history.recordState(designerState.canvasState, 'Add token');
                      designerState.addElement({
                        type: 'template-token',
                        tokenContent: {
                          token,
                          fallback: '',
                          transform: 'none',
                        },
                        width: 200,
                        height: 40,
                        styles: {
                          fontSize: 16,
                          color: '#4F46E5',
                        },
                      });
                    }}
                    availableTokens={config.availableTokens}
                  />
                </div>
              </TabsContent>

              <TabsContent value="ai" className="h-full m-0">
                <DesignerAIChat
                  messages={ai.messages}
                  isGenerating={ai.isGenerating}
                  error={ai.error}
                  currentSuggestion={ai.currentSuggestion}
                  designerType="mail"
                  onSendMessage={ai.sendMessage}
                  onApplySuggestion={handleApplySuggestion}
                  onRejectSuggestion={() => {
                    toast({
                      title: 'Suggestion rejected',
                      description: 'The AI suggestion was not applied.',
                    });
                  }}
                  onClearConversation={ai.clearConversation}
                  onRetry={ai.retryLastMessage}
                  className="h-full"
                />
              </TabsContent>
            </div>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

