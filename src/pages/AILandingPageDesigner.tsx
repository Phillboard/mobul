/**
 * AILandingPageDesigner Page
 * 
 * AI-first landing page designer with code generation.
 * Chat-driven interface for marketers with optional code editing.
 * 
 * Layout: Chat LEFT (30%) | Preview CENTER (50%) | Properties RIGHT (20%)
 */

import { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Download,
  Globe,
  Undo,
  Redo,
  History,
  Code2,
  Settings,
  LayoutGrid,
  Loader2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/shared/components/ui/resizable';
import { useToast } from '@shared/hooks';
import {
  useAILandingPageWorkflow,
  AILandingPageChat,
  LiveCodePreview,
  CodeEditorPanel,
  TemplateGallery,
  VersionHistory,
  ExportDialog,
} from '@/features/ai-designer';
import type { LiveCodePreviewRef, Template, ElementContext } from '@/features/ai-designer';

// ============================================================================
// Main Component
// ============================================================================

export default function AILandingPageDesigner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const previewRef = useRef<LiveCodePreviewRef>(null);

  // Workflow state management
  const workflow = useAILandingPageWorkflow({ landingPageId: id });

  // UI State
  const [rightTab, setRightTab] = useState<'properties' | 'history' | 'code'>('properties');
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Determine if this is a new page
  const isNewPage = !id || id === 'new';
  const hasContent = !!workflow.state.currentHTML;

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleSendMessage = useCallback(async (message: string) => {
    if (!hasContent) {
      // First message - generate new page
      await workflow.generateFromPrompt(message);
    } else {
      // Edit existing page
      await workflow.sendChatMessage(message);
    }
  }, [hasContent, workflow]);

  const handleGenerateFromTemplate = useCallback(async (template: Template) => {
    setShowTemplateGallery(false);
    await workflow.generateFromTemplate(template);
  }, [workflow]);

  const handleElementClick = useCallback((element: ElementContext) => {
    workflow.selectElement(element);
  }, [workflow]);

  const handleSave = useCallback(async () => {
    const pageId = await workflow.save();
    if (pageId && isNewPage) {
      navigate(`/landing-pages-ai/${pageId}`, { replace: true });
    }
  }, [workflow, isNewPage, navigate]);

  const handlePublish = useCallback(async () => {
    const slug = await workflow.publish();
    if (slug) {
      toast({
        title: 'Published!',
        description: `Your landing page is now live.`,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/p/${slug}`, '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View
          </Button>
        ),
      });
    }
  }, [workflow, toast]);

  const handleExportReact = useCallback(async (componentName: string) => {
    setIsExporting(true);
    try {
      await workflow.exportAsReact(componentName);
    } finally {
      setIsExporting(false);
    }
  }, [workflow]);

  const handleExportStatic = useCallback(async (filename: string) => {
    setIsExporting(true);
    try {
      await workflow.exportAsStatic(filename);
    } finally {
      setIsExporting(false);
    }
  }, [workflow]);

  // ============================================================================
  // Loading State
  // ============================================================================

  if (workflow.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading designer...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background">
        {/* ============ Header ============ */}
        <header className="h-14 border-b bg-card flex items-center justify-between px-4 flex-shrink-0">
          {/* Left Section */}
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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold">
                    {workflow.state.metadata.title}
                  </h1>
                  {workflow.state.isDirty && (
                    <Badge variant="outline" className="text-[10px]">
                      Unsaved
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  AI Landing Page Designer
                </p>
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Token counter */}
            {workflow.state.metadata.tokensUsed > 0 && (
              <Badge variant="secondary" className="text-xs">
                {workflow.state.metadata.tokensUsed.toLocaleString()} tokens
              </Badge>
            )}

            <div className="w-px h-6 bg-border mx-1" />

            {/* Template Gallery Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplateGallery(true)}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Templates
                </Button>
              </TooltipTrigger>
              <TooltipContent>Browse template gallery</TooltipContent>
            </Tooltip>

            {/* Export Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExportDialog(true)}
                  disabled={!hasContent}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export landing page</TooltipContent>
            </Tooltip>

            {/* Save Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={workflow.isSaving || !workflow.state.isDirty}
            >
              {workflow.isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>

            {/* Publish Button */}
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={workflow.isSaving || !hasContent}
            >
              <Globe className="h-4 w-4 mr-2" />
              Publish
            </Button>
          </div>
        </header>

        {/* ============ Main Content ============ */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          
          {/* ============ LEFT PANEL - AI Chat ============ */}
          <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
            <AILandingPageChat
              messages={workflow.state.chatHistory}
              isGenerating={workflow.state.isGenerating}
              selectedElement={workflow.state.selectedElement}
              hasContent={hasContent}
              onSendMessage={handleSendMessage}
              onGenerateFromTemplate={handleGenerateFromTemplate}
              onClearChat={workflow.clearChat}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* ============ CENTER - Live Preview ============ */}
          <ResizablePanel defaultSize={50} minSize={35}>
            <LiveCodePreview
              ref={previewRef}
              html={workflow.state.currentHTML}
              viewMode={workflow.state.viewMode}
              isLoading={workflow.state.isGenerating}
              error={workflow.state.error}
              onElementClick={handleElementClick}
              onViewModeChange={workflow.setViewMode}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* ============ RIGHT PANEL - Properties/History/Code ============ */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
            <Tabs value={rightTab} onValueChange={(v) => setRightTab(v as typeof rightTab)} className="h-full flex flex-col">
              <div className="flex-shrink-0 border-b px-2 py-1">
                <TabsList className="grid w-full grid-cols-3 h-8">
                  <TabsTrigger value="properties" className="text-xs h-7">
                    <Settings className="h-3 w-3 mr-1" />
                    Props
                  </TabsTrigger>
                  <TabsTrigger value="history" className="text-xs h-7">
                    <History className="h-3 w-3 mr-1" />
                    History
                  </TabsTrigger>
                  <TabsTrigger value="code" className="text-xs h-7">
                    <Code2 className="h-3 w-3 mr-1" />
                    Code
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-hidden">
                {/* Properties Tab */}
                <TabsContent value="properties" className="h-full m-0">
                  <div className="p-4 space-y-4">
                    {workflow.state.selectedElement ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">
                            Selected Element
                          </label>
                          <div className="p-3 rounded-lg bg-muted">
                            <p className="text-sm font-medium">
                              {workflow.state.selectedElement.tagName.toLowerCase()}
                            </p>
                            {workflow.state.selectedElement.textContent && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                "{workflow.state.selectedElement.textContent.substring(0, 50)}..."
                              </p>
                            )}
                            {workflow.state.selectedElement.className && (
                              <p className="text-xs text-muted-foreground mt-1 font-mono">
                                .{workflow.state.selectedElement.className.split(' ')[0]}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => workflow.selectElement(null)}
                        >
                          Clear Selection
                        </Button>
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Settings className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Click an element in the preview to select it</p>
                      </div>
                    )}

                    {/* Page Settings */}
                    <div className="pt-4 border-t space-y-3">
                      <label className="text-xs font-medium text-muted-foreground">
                        Page Info
                      </label>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Version</span>
                          <span>{workflow.state.currentVersion || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tokens Used</span>
                          <span>{workflow.state.metadata.tokensUsed.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">View Mode</span>
                          <span className="capitalize">{workflow.state.viewMode}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="h-full m-0">
                  <VersionHistory
                    versions={workflow.state.versions}
                    currentVersion={workflow.state.currentVersion}
                    onRestoreVersion={workflow.restoreVersion}
                  />
                </TabsContent>

                {/* Code Tab */}
                <TabsContent value="code" className="h-full m-0">
                  <CodeEditorPanel
                    html={workflow.state.currentHTML}
                    onHTMLChange={workflow.updateHTML}
                    isModified={workflow.state.isDirty}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* ============ Dialogs ============ */}
        <TemplateGallery
          open={showTemplateGallery}
          onClose={() => setShowTemplateGallery(false)}
          onSelectTemplate={handleGenerateFromTemplate}
          isLoading={workflow.state.isGenerating}
        />

        <ExportDialog
          open={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          onExportReact={handleExportReact}
          onExportStatic={handleExportStatic}
          isExporting={isExporting}
        />
      </div>
    </TooltipProvider>
  );
}
