/**
 * NewMailDesigner Page
 * 
 * Professional AI-first mail piece designer with:
 * - AI Assistant / Elements tabs on left
 * - Canvas with bleed/safe zone visualization in center
 * - Dockable Properties/Layers panel on right
 * 
 * Inspired by MailCraft and Postalytics editors.
 */

import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Sparkles, Layers as LayersIcon, Settings, PanelRightClose, PanelRight } from 'lucide-react';
import { useToast } from '@shared/hooks';
import { useTenant } from '@/contexts/TenantContext';
import {
  DESIGNER_PRESETS,
  useDesignerState,
  useDesignerHistory,
  useDesignerAI,
  useDesignerExport,
  DesignerCanvas,
  BackgroundUploader,
  ElementLibrary,
  TokenInserter,
  PropertiesPanel,
  LayerPanel,
  executeDesignActions,
  DesignerContextProvider,
  LoadingOverlay,
  useDesignerContext,
} from '@/features/designer';
import { DesignerHeader, MAIL_FORMATS } from '@/features/designer/components/DesignerHeader';
import { AIAssistantPanel } from '@/features/designer/components/AIAssistantPanel';
import { FormatImporter } from '@/features/designer/components/FormatImporter';
import { TemplateGallery, type MailTemplate } from '@/features/designer/components/TemplateGallery';
import { PreviewModal } from '@/features/designer/components/PreviewModal';

function MailDesignerContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const context = useDesignerContext(); // Get campaign context

  // UI State
  const [leftTab, setLeftTab] = useState<'ai' | 'elements'>('ai');
  const [rightTab, setRightTab] = useState<'properties' | 'layers'>('properties');
  const [isRightPanelDocked, setIsRightPanelDocked] = useState(true);
  const [currentFormat, setCurrentFormat] = useState('postcard-6x4'); // Default to 6x4 LANDSCAPE
  const [currentSide, setCurrentSide] = useState<'front' | 'back' | number>('front');
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(100);

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

  // Get format config
  const formatConfig = MAIL_FORMATS.find(f => f.id === currentFormat) || MAIL_FORMATS[0];

  // Initialize designer with dynamic config based on format
  const config = {
    ...DESIGNER_PRESETS.mail,
    dimensions: {
      width: formatConfig.width,
      height: formatConfig.height,
    },
  };

  // Parse existing canvas state if available
  const initialState = mailPiece?.canvas_state
    ? JSON.parse(mailPiece.canvas_state)
    : undefined;

  // Designer state management
  const designerState = useDesignerState({
    config,
    initialState,
    autoSaveInterval: 30000,
    currentSide, // Pass current side to hook
    onAutoSave: (_state) => {
      localStorage.setItem('mail-designer-autosave', JSON.stringify(_state));
    },
  });

  // Keep hook in sync when side changes
  useEffect(() => {
    designerState.setCurrentSide(currentSide);
  }, [currentSide]);

  // History management
  const history = useDesignerHistory({
    initialState: designerState.canvasState,
    maxHistorySize: 50,
    enableKeyboardShortcuts: true,
  });

  // AI assistant - auto-apply suggestions
  const ai = useDesignerAI({
    designerType: 'mail',
    canvasState: designerState.canvasState,
    onSuggestion: (suggestion) => {
      if (suggestion.actions && suggestion.actions.length > 0) {
        console.log('[NewMailDesigner] Auto-applying AI suggestion:', suggestion);
        history.recordState(designerState.canvasState, 'AI suggestion');
        const result = executeDesignActions(suggestion.actions, designerState);
        
        if (result.executed > 0) {
          toast({
            title: '✨ Design Updated',
            description: `${result.executed} change(s) applied to your design.`,
          });
        }
      }
    },
  });

  // Export functionality
  const exporter = useDesignerExport({
    canvasState: designerState.canvasState,
    designerType: 'mail',
  });

  // Format change handler
  const handleFormatChange = useCallback((formatId: string) => {
    setCurrentFormat(formatId);
    const newFormat = MAIL_FORMATS.find(f => f.id === formatId);
    if (newFormat) {
      designerState.setCanvasSize(newFormat.width, newFormat.height);
    }
  }, [designerState]);

  // Add page handler (for letters)
  const handleAddPage = useCallback(() => {
    if (totalPages < 6) {
      setTotalPages(prev => prev + 1);
    }
  }, [totalPages]);

  /**
   * Save mail piece to database
   */
  const saveMutation = useMutation({
    mutationFn: async () => {
      const canvasStateJSON = JSON.stringify({
        ...designerState.canvasState,
        format: currentFormat,
        sides: currentSide,
      });

      if (id === 'new' || !mailPiece) {
        const { data, error } = await supabase
          .from('templates')
          .insert({
            name: 'Untitled Mail Piece',
            size: formatConfig.name,
            canvas_state: canvasStateJSON,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('templates')
          .update({
            canvas_state: canvasStateJSON,
            size: formatConfig.name,
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

  /**
   * Handle template selection
   */
  const handleTemplateSelect = useCallback((template: MailTemplate) => {
    // Set format
    setCurrentFormat(template.format);
    
    // Apply template canvas state
    if (template.canvasState) {
      designerState.setCanvasSize(
        template.canvasState.width || formatConfig.width,
        template.canvasState.height || formatConfig.height
      );
      
      if (template.canvasState.backgroundColor) {
        // Would need to add setBackgroundColor to state hook
      }
      
      // Add elements from template
      template.canvasState.elements?.forEach(element => {
        history.recordState(designerState.canvasState, 'Apply template');
        designerState.addElement(element);
      });
    }
    
    toast({
      title: 'Template Applied',
      description: `${template.name} has been loaded.`,
    });
  }, [designerState, formatConfig, history, toast]);

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
      <DesignerHeader
        format={currentFormat}
        onFormatChange={handleFormatChange}
        currentSide={currentSide}
        onSideChange={setCurrentSide}
        totalPages={totalPages}
        onAddPage={handleAddPage}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={history.undo}
        onRedo={history.redo}
        zoom={zoom}
        onZoomChange={setZoom}
        canSave={designerState.isDirty}
        isSaving={saveMutation.isPending}
        onSave={() => saveMutation.mutate()}
        isExporting={exporter.isExporting}
        onExport={handleExport}
        onBack={() => navigate('/mail')}
        templateName={mailPiece?.name}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ========== LEFT PANEL - AI Assistant / Elements ========== */}
        <div className="w-80 border-r bg-card flex flex-col">
          {/* Tab Toggle */}
          <div className="border-b p-1">
            <div className="flex bg-muted rounded-lg p-1">
              <button
                onClick={() => setLeftTab('ai')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  leftTab === 'ai'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                AI Assistant
              </button>
              <button
                onClick={() => setLeftTab('elements')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  leftTab === 'elements'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayersIcon className="h-4 w-4" />
                Elements
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {leftTab === 'ai' ? (
            <AIAssistantPanel
              messages={ai.messages}
              isGenerating={ai.isGenerating}
              error={ai.error}
              onSendMessage={ai.sendMessage}
              onClearConversation={ai.clearConversation}
              className="flex-1"
              // Reference image props - enable "Generate Similar" feature
              referenceImage={ai.referenceImage}
              onReferenceSelect={async (file) => {
                try {
                  await ai.analyzeReferenceImage(file);
                  toast({
                    title: '📸 Reference Analyzed',
                    description: 'Style extracted. Click "Generate Similar" to create matching background.',
                  });
                } catch (err) {
                  toast({
                    title: 'Analysis Failed',
                    description: err instanceof Error ? err.message : 'Could not analyze image',
                    variant: 'destructive',
                  });
                }
              }}
              onGenerateFromReference={async (analysis) => {
                try {
                  const imageUrl = await ai.generateFromReference(analysis);
                  if (imageUrl) {
                    // Apply the generated background to canvas
                    designerState.setBackgroundImage(imageUrl);
                    toast({
                      title: '✨ Background Generated',
                      description: 'New background applied matching your reference style.',
                    });
                  }
                } catch (err) {
                  toast({
                    title: 'Generation Failed',
                    description: err instanceof Error ? err.message : 'Could not generate image',
                    variant: 'destructive',
                  });
                }
              }}
              onClearReference={ai.clearReferenceImage}
              // Direct background generation for quick action buttons
              onGenerateBackground={async (prompt) => {
                try {
                  toast({ title: '🎨 Generating...', description: 'Creating background image...' });
                  const imageUrl = await ai.generateImage(prompt);
                  if (imageUrl) {
                    designerState.setBackgroundImage(imageUrl);
                    toast({ title: '✨ Background Applied!', description: 'Your new background is ready.' });
                  }
                } catch (err) {
                  toast({
                    title: 'Generation Failed',
                    description: err instanceof Error ? err.message : 'Could not generate image',
                    variant: 'destructive',
                  });
                }
              }}
            />
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                {/* Build Section */}
                <ElementLibrary
                  onAddElement={(type, template) => {
                    history.recordState(designerState.canvasState, `Add ${type}`);
                    designerState.addElement(template || { type });
                  }}
                  allowedElements={config.allowedElements}
                  className="border-0 shadow-none"
                />

                {/* Background Section */}
                <div className="border-t pt-4">
                  <BackgroundUploader
                    currentBackground={designerState.canvasState.backgroundImage}
                    onBackgroundSet={designerState.setBackgroundImage}
                    onBackgroundRemove={() => designerState.setBackgroundImage(null)}
                  />
                </div>

                {/* Tokens Quick Add */}
                <div className="border-t pt-4">
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
              </div>
            </ScrollArea>
          )}
        </div>

        {/* ========== CENTER - CANVAS ========== */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas Info Bar with Tools */}
          <div className="h-10 border-b bg-muted/50 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <FormatImporter
                onBackgroundSet={designerState.setBackgroundImage}
                onImportComplete={(result) => {
                  toast({
                    title: 'Import Complete',
                    description: `${result.type} imported successfully.`,
                  });
                }}
              />
              <TemplateGallery
                onSelectTemplate={handleTemplateSelect}
                currentFormat={currentFormat}
              />
            </div>
            
            <span className="text-xs text-muted-foreground">
              {formatConfig.name} • {formatConfig.bleed > 0 ? `${formatConfig.bleed}" bleed` : 'No bleed'}
            </span>
            
            <PreviewModal
              canvasState={designerState.canvasState}
              format={currentFormat}
              onExportPDF={async () => await exporter.downloadExport('pdf', 'mail-piece.pdf')}
              onExportPNG={async () => await exporter.downloadExport('png', 'mail-piece.png')}
              onExportJPG={async () => await exporter.downloadExport('jpg', 'mail-piece.jpg')}
              isExporting={exporter.isExporting}
            />
          </div>

          {/* Canvas Area */}
          <div className="flex-1 bg-muted/30 p-8 overflow-auto flex items-center justify-center">
            <div 
              className="shadow-2xl"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'center center',
              }}
            >
              <DesignerCanvas
                canvasState={designerState.canvasState}
                currentSide={currentSide}
                sideBackground={designerState.getBackgroundForSide(currentSide)}
                onElementSelect={designerState.selectElements}
                onElementUpdate={(id, updates) => {
                  history.recordState(designerState.canvasState, 'Update element');
                  designerState.updateElement(id, updates);
                }}
                onElementCreate={(element) => {
                  console.log('[NewMailDesigner] Element dropped:', element);
                  history.recordState(designerState.canvasState, `Add ${element.type}`);
                  designerState.addElement(element);
                }}
                toolMode="select"
                snapToGrid={designerState.canvasState.settings?.snapToGrid}
                gridSize={designerState.canvasState.settings?.gridSize}
                bleedInches={formatConfig.bleed}
                showBleed={formatConfig.bleed > 0}
                showSafeMargin={true}
                showPostageArea={formatConfig.type === 'postcard'}
              />
            </div>
          </div>
        </div>

        {/* ========== RIGHT PANEL - Properties/Layers (Dockable) ========== */}
        {isRightPanelDocked && (
          <div className="w-72 border-l bg-card flex flex-col">
            {/* Header with dock toggle */}
            <div className="h-10 border-b flex items-center justify-between px-3">
              <Tabs value={rightTab} onValueChange={(v) => setRightTab(v as 'properties' | 'layers')} className="flex-1">
                <TabsList className="grid w-full grid-cols-2 h-7">
                  <TabsTrigger value="properties" className="text-xs h-6">
                    <Settings className="h-3 w-3 mr-1" />
                    Properties
                  </TabsTrigger>
                  <TabsTrigger value="layers" className="text-xs h-6">
                    <LayersIcon className="h-3 w-3 mr-1" />
                    Layers
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 ml-2"
                onClick={() => setIsRightPanelDocked(false)}
                title="Undock panel"
              >
                <PanelRightClose className="h-4 w-4" />
              </Button>
            </div>

            {/* Panel Content */}
            <ScrollArea className="flex-1">
              {rightTab === 'properties' ? (
                <div className="p-4">
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
              ) : (
                <div className="p-4">
                  <LayerPanel
                    elements={designerState.getElementsForSide(currentSide)}
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
                    onReorderLayers={() => {}}
                  />
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Dock button when panel is hidden */}
        {!isRightPanelDocked && (
          <Button
            variant="outline"
            size="icon"
            className="absolute right-4 top-20 z-10"
            onClick={() => setIsRightPanelDocked(true)}
            title="Dock panel"
          >
            <PanelRight className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Loading Overlay - Context-aware loading during AI generation */}
      <LoadingOverlay
        isVisible={ai.isGenerating}
        context={context}
        error={ai.error}
        onRetry={() => ai.retryLastMessage()}
        onDismiss={() => {}}
      />
    </div>
  );
}

// Wrapper component with context provider
export default function NewMailDesigner() {
  const { currentClient } = useTenant();
  
  return (
    <DesignerContextProvider clientId={currentClient?.id}>
      <MailDesignerContent />
    </DesignerContextProvider>
  );
}
