/**
 * NewEmailDesigner Page
 * 
 * AI-first email template designer for notifications and campaigns.
 * 
 * Layout: AI on LEFT (primary), Canvas CENTER, Properties RIGHT
 * 
 * Features:
 * - Email-safe HTML export (inline styles, table-based)
 * - 600px width (standard email width)
 * - Template tokens for personalization
 * - AI-powered email content generation
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ArrowLeft, Save, Download, Mail, Undo, Redo, Layers, Settings, Tag } from 'lucide-react';
import { useToast } from '@shared/hooks';
import {
  DESIGNER_PRESETS,
  useDesignerState,
  useDesignerHistory,
  useDesignerAI,
  useDesignerExport,
  DesignerCanvas,
  DesignerAIChat,
  ElementLibrary,
  TokenInserter,
  PropertiesPanel,
  LayerPanel,
  executeDesignActions,
} from '@/features/designer';

export default function NewEmailDesigner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rightTab, setRightTab] = useState('properties');

  // Fetch existing email template
  const { data: emailTemplate, isLoading } = useQuery({
    queryKey: ['email-template', id],
    queryFn: async () => {
      if (id === 'new') return null;

      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Initialize designer with email preset
  const config = DESIGNER_PRESETS.email;

  const initialState = emailTemplate?.canvas_state
    ? JSON.parse(emailTemplate.canvas_state)
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
    designerType: 'email',
    canvasState: designerState.canvasState,
    onSuggestion: (suggestion) => {
      if (suggestion.actions && suggestion.actions.length > 0) {
        console.log('[NewEmailDesigner] Auto-applying AI suggestion:', suggestion);
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
    designerType: 'email',
  });

  /**
   * Save email template
   */
  const saveMutation = useMutation({
    mutationFn: async () => {
      const canvasStateJSON = JSON.stringify(designerState.canvasState);
      const htmlPreview = await exporter.exportToHTML({
        emailSafe: true,
        inlineStyles: true,
      });

      if (id === 'new' || !emailTemplate) {
        const { data, error } = await supabase
          .from('email_templates')
          .insert({
            name: 'Untitled Email Template',
            canvas_state: canvasStateJSON,
            html_content: htmlPreview,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('email_templates')
          .update({
            canvas_state: canvasStateJSON,
            html_content: htmlPreview,
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
      queryClient.invalidateQueries({ queryKey: ['email-template', id] });
      designerState.markClean();
      
      toast({
        title: 'Saved!',
        description: 'Your email template has been saved.',
      });

      if (id === 'new') {
        navigate(`/email-designer/${data.id}`);
      }
    },
  });

  const handleApplySuggestion = (suggestion: any) => {
    if (!suggestion.actions) return;

    history.recordState(designerState.canvasState, 'AI suggestion');
    executeDesignActions(suggestion.actions, designerState);
  };

  const handleExport = async () => {
    try {
      const html = await exporter.exportToHTML({
        emailSafe: true,
        inlineStyles: true,
      });
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'email-template.html';
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Exported!',
        description: 'Email-safe HTML has been downloaded.',
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
      <div className="h-14 border-b bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-orange-500" />
            <div>
              <h1 className="text-lg font-semibold">Email Designer</h1>
              <p className="text-xs text-muted-foreground">
                {emailTemplate?.name || 'New Email Template'}
              </p>
            </div>
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

          <div className="w-px h-6 bg-border mx-1" />

          <Button variant="outline" size="sm" onClick={handleExport}>
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
                designerType="email"
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
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* ========== CENTER - CANVAS (600px email width) ========== */}
        <ResizablePanel defaultSize={50} minSize={35}>
          <div className="h-full flex items-center justify-center p-8 bg-muted/30 overflow-auto">
            <div className="shadow-2xl bg-white" style={{ width: '600px' }}>
              <DesignerCanvas
                canvasState={designerState.canvasState}
                onElementSelect={designerState.selectElements}
                onElementUpdate={(id, updates) => {
                  history.recordState(designerState.canvasState, 'Update');
                  designerState.updateElement(id, updates);
                }}
                onElementCreate={(element) => {
                  console.log('[NewEmailDesigner] Element dropped:', element);
                  history.recordState(designerState.canvasState, `Add ${element.type}`);
                  designerState.addElement(element);
                }}
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
