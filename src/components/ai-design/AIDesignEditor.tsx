import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, Send, Sparkles, Save, ExternalLink, History, Undo, Monitor, Tablet, Smartphone, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useIsMobile } from '@/hooks/use-mobile';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    changesMade?: string[];
    beforeHtml?: string;
    afterHtml?: string;
  };
}

interface AIDesignEditorProps {
  designType: 'landing_page' | 'mailer' | 'template';
  designId?: string;
  onSwitchToManual?: () => void;
}

type PreviewMode = 'desktop' | 'tablet' | 'mobile';

export function AIDesignEditor({ designType, designId, onSwitchToManual }: AIDesignEditorProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const defaultStarterHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Landing Page</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .hero { text-align: center; padding: 100px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .hero h1 { font-size: 3rem; margin-bottom: 20px; }
    .hero p { font-size: 1.25rem; margin-bottom: 30px; }
    .cta-button { display: inline-block; background: white; color: #667eea; padding: 15px 40px; border-radius: 50px; text-decoration: none; font-weight: bold; transition: transform 0.3s; }
    .cta-button:hover { transform: scale(1.05); }
  </style>
</head>
<body>
  <section class="hero">
    <div class="container">
      <h1>Welcome to Your New Landing Page</h1>
      <p>Tell me what you'd like to create and I'll help you build it!</p>
      <a href="#" class="cta-button">Get Started</a>
    </div>
  </section>
</body>
</html>`;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentHtml, setCurrentHtml] = useState(designId ? '' : defaultStarterHtml);
  const [activeTab, setActiveTab] = useState<'preview' | 'history'>('preview');
  const [versions, setVersions] = useState<any[]>([]);
  
  // Resizable panel state with localStorage persistence
  const [leftPanelSize, setLeftPanelSize] = useState<number>(() => {
    const saved = localStorage.getItem(`aiDesignEditor_leftPanelSize_${designType}`);
    return saved ? parseFloat(saved) : 40;
  });
  
  const [rightPanelSize, setRightPanelSize] = useState<number>(() => {
    const saved = localStorage.getItem(`aiDesignEditor_rightPanelSize_${designType}`);
    return saved ? parseFloat(saved) : 60;
  });
  
  // Preview controls
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMobileView, setShowMobileView] = useState<'chat' | 'preview'>('preview');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Save panel sizes to localStorage
  useEffect(() => {
    localStorage.setItem(`aiDesignEditor_leftPanelSize_${designType}`, leftPanelSize.toString());
    localStorage.setItem(`aiDesignEditor_rightPanelSize_${designType}`, rightPanelSize.toString());
  }, [leftPanelSize, rightPanelSize, designType]);
  
  useEffect(() => {
    if (designId) {
      loadDesign();
      loadChatHistory();
      loadVersionHistory();
    } else {
      // For new designs, render the starter HTML immediately
      if (iframeRef.current) {
        const doc = iframeRef.current.contentDocument;
        if (doc) {
          doc.open();
          doc.write(currentHtml);
          doc.close();
        }
      }
    }
  }, [designId]);
  
  const loadDesign = async () => {
    if (!designId) return;
    
    const table = designType === 'landing_page' ? 'landing_pages' : 'templates';
    const { data, error } = await supabase
      .from(table as any)
      .select('*')
      .eq('id', designId)
      .single();
    
    if (error || !data) {
      toast.error('Failed to load design');
      return;
    }
    
    const grapesjs = (data as any).grapesjs_project;
    if (grapesjs?.pages?.[0]?.component) {
      setCurrentHtml(grapesjs.pages[0].component);
    } else if (designType === 'landing_page') {
      const contentJson = (data as any).content_json;
      const htmlContent = (data as any).html_content;
      if (contentJson?.html) {
        setCurrentHtml(contentJson.html);
      } else if (htmlContent) {
        setCurrentHtml(htmlContent);
      }
    }
  };
  
  const loadChatHistory = async () => {
    const table = designType === 'landing_page' ? 'landing_pages' : 'templates';
    const { data } = await supabase
      .from(table as any)
      .select('ai_chat_history')
      .eq('id', designId)
      .single();
    
    if (data) {
      const history = (data as any).ai_chat_history;
      if (history && Array.isArray(history)) {
        setMessages(history as Message[]);
      }
    }
  };
  
  const loadVersionHistory = async () => {
    const { data } = await supabase
      .from('design_versions')
      .select('*')
      .eq('design_type', designType)
      .eq('design_id', designId)
      .order('version_number', { ascending: false });
    
    if (data) {
      setVersions(data);
    }
  };
  
  const sendMessage = async () => {
    if (!inputValue.trim() || isGenerating) return;
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-design-chat', {
        body: {
          designType,
          designId,
          currentHtml,
          userMessage: inputValue.trim(),
          chatHistory: messages.slice(-10),
        },
      });
      
      if (error) throw error;
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
        metadata: {
          changesMade: data.changesMade,
          beforeHtml: currentHtml,
          afterHtml: data.updatedHtml,
        },
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setCurrentHtml(data.updatedHtml);
      
      await saveToDatabase(data.updatedHtml, [...messages, userMessage, assistantMessage]);
      
    } catch (error: any) {
      console.error('AI chat error:', error);
      toast.error(error.message || 'Failed to process your request');
      
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'system',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const saveToDatabase = async (html: string, chatHistory: Message[]) => {
    if (!designId) {
      console.warn('No designId, skipping database save');
      return;
    }

    const table = designType === 'landing_page' ? 'landing_pages' : 'templates';
    
    await supabase
      .from(table as any)
      .update({
        ai_chat_history: chatHistory as any,
        grapesjs_project: {
          pages: [{ name: 'Home', component: html }],
        },
        design_iterations: chatHistory.filter(m => m.role === 'user').length,
        last_ai_edit_at: new Date().toISOString(),
      })
      .eq('id', designId);
    
    await supabase
      .from('design_versions')
      .insert({
        design_type: designType,
        design_id: designId,
        version_number: versions.length + 1,
        version_name: `AI Edit #${versions.length + 1}`,
        grapesjs_snapshot: { pages: [{ name: 'Home', component: html }] } as any,
        change_type: 'ai_refinement',
        ai_prompt: chatHistory[chatHistory.length - 2]?.content,
      });
    
    loadVersionHistory();
  };
  
  const handleQuickAction = (prompt: string) => {
    setInputValue(prompt);
    setTimeout(() => sendMessage(), 100);
  };
  
  const handleSave = async () => {
    toast.success('Design saved successfully!');
  };
  
  const restoreVersion = async (version: any) => {
    const confirmRestore = window.confirm(
      `Restore version ${version.version_number} from ${new Date(version.created_at).toLocaleString()}?`
    );
    
    if (!confirmRestore) return;
    
    const html = version.grapesjs_snapshot?.pages?.[0]?.component || version.html_content || '';
    setCurrentHtml(html);
    
    toast.success('Version restored');
  };
  
  const getPreviewWidth = () => {
    switch (previewMode) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      case 'desktop': return '100%';
    }
  };
  
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoom(100);
  
  const handlePanelResize = (sizes: number[]) => {
    setLeftPanelSize(sizes[0]);
    setRightPanelSize(sizes[1]);
  };
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  useEffect(() => {
    if (iframeRef.current && currentHtml) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(currentHtml);
        doc.close();
      }
    }
  }, [currentHtml]);
  
  // Mobile layout toggle
  if (isMobile) {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Mobile Toggle Tabs */}
        <div className="border-b bg-card p-2">
          <div className="flex gap-2">
            <Button
              variant={showMobileView === 'chat' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowMobileView('chat')}
              className="flex-1"
            >
              Chat
            </Button>
            <Button
              variant={showMobileView === 'preview' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowMobileView('preview')}
              className="flex-1"
            >
              Preview
            </Button>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden">
          {showMobileView === 'chat' ? (
            <div className="h-full flex flex-col">
              <ScrollArea className="flex-1 p-4">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
                    >
                      <div
                        className={`inline-block max-w-[85%] rounded-lg px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        {message.metadata?.changesMade && (
                          <div className="mt-2 text-xs opacity-75">
                            Changes: {message.metadata.changesMade.join(', ')}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </ScrollArea>

              <div className="border-t p-4 bg-card">
                <div className="flex gap-2 mb-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => handleQuickAction('Make it more modern')}>
                    Modern
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleQuickAction('Add animations')}>
                    Animations
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleQuickAction('Improve colors')}>
                    Colors
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Describe what you want to change..."
                    className="min-h-[80px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={isGenerating || !inputValue.trim()}
                    size="icon"
                    className="h-[80px] w-[80px]"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col bg-muted">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
                <TabsList className="mx-4 mt-4">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="flex-1 m-0 p-4">
                  <div className="h-full bg-white rounded-lg overflow-auto">
                    <iframe
                      ref={iframeRef}
                      className="w-full h-full border-0"
                      title="Preview"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="history" className="flex-1 m-0">
                  <ScrollArea className="h-full p-4">
                    {versions.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No version history yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {versions.map((version) => (
                          <div key={version.id} className="p-4 border rounded-lg bg-card">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium text-sm">Version {version.version_number}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(version.created_at).toLocaleString()}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => restoreVersion(version)}
                              >
                                <Undo className="h-3 w-3 mr-1" />
                                Restore
                              </Button>
                            </div>
                            {version.change_description && (
                              <p className="text-xs text-muted-foreground mt-2">
                                {version.change_description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Main Content Split - Desktop with Resizable Panels */}
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1"
        onLayout={handlePanelResize}
      >
        {/* Left Panel - Chat Interface */}
        <ResizablePanel
          defaultSize={leftPanelSize}
          minSize={25}
          maxSize={75}
        >
          <div className="h-full border-r bg-card flex flex-col">
            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-6">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
                  >
                    <div
                      className={`inline-block max-w-[80%] p-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : message.role === 'assistant'
                          ? 'bg-muted'
                          : 'bg-accent text-accent-foreground'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">{message.content}</div>

                      {message.metadata?.changesMade && (
                        <div className="mt-2 pt-2 border-t border-primary/30">
                          <div className="text-xs opacity-75">Changes made:</div>
                          <ul className="text-xs mt-1 space-y-1">
                            {message.metadata.changesMade.map((change, i) => (
                              <li key={i}>• {change}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm">AI is thinking...</span>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t p-6 bg-card">
              <div className="flex gap-2 mb-4 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickAction('Make it more modern and visually striking')}
                >
                  <Sparkles className="h-3 w-3 mr-2" />
                  Modern Look
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickAction('Add smooth animations and transitions')}
                >
                  Add Animations
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickAction('Improve the color scheme and contrast')}
                >
                  Better Colors
                </Button>
              </div>

              <div className="flex gap-3">
                <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Describe what you want to change..."
                  className="min-h-[100px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Button
                  onClick={sendMessage}
                  disabled={isGenerating || !inputValue.trim()}
                  size="icon"
                  className="h-[100px] w-[100px] shrink-0"
                >
                  {isGenerating ? (
                    <div className="animate-spin h-6 w-6 border-2 border-current border-t-transparent rounded-full" />
                  ) : (
                    <Send className="h-6 w-6" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </ResizablePanel>

        {/* Resizable Handle */}
        <ResizableHandle withHandle />

        {/* Right Panel - Preview & History */}
        <ResizablePanel
          defaultSize={rightPanelSize}
          minSize={25}
          maxSize={75}
        >
          <div className="h-full flex flex-col bg-muted">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
              <div className="flex items-center justify-between px-6 pt-6 pb-2">
                <TabsList>
                  <TabsTrigger value="preview">Live Preview</TabsTrigger>
                  <TabsTrigger value="history">Version History</TabsTrigger>
                </TabsList>

                {/* Preview Controls */}
                {activeTab === 'preview' && (
                  <div className="flex items-center gap-2">
                    {/* Device Mode Selector */}
                    <div className="flex items-center gap-1 border rounded-md p-1">
                      <Button
                        size="sm"
                        variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                        onClick={() => setPreviewMode('desktop')}
                        className="h-7 w-7 p-0"
                      >
                        <Monitor className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={previewMode === 'tablet' ? 'default' : 'ghost'}
                        onClick={() => setPreviewMode('tablet')}
                        className="h-7 w-7 p-0"
                      >
                        <Tablet className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                        onClick={() => setPreviewMode('mobile')}
                        className="h-7 w-7 p-0"
                      >
                        <Smartphone className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1 border rounded-md p-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleZoomOut}
                        disabled={zoom <= 50}
                        className="h-7 w-7 p-0"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleResetZoom}
                        className="h-7 px-2 text-xs"
                      >
                        {zoom}%
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleZoomIn}
                        disabled={zoom >= 200}
                        className="h-7 w-7 p-0"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Fullscreen */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className="h-7 w-7 p-0"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <TabsContent value="preview" className="flex-1 m-0 mt-2 mx-6 mb-6">
                <div className="h-full flex items-center justify-center bg-muted/30 rounded-lg overflow-auto p-4">
                  <div
                    style={{
                      width: getPreviewWidth(),
                      height: '100%',
                      transform: `scale(${zoom / 100})`,
                      transformOrigin: 'top center',
                      transition: 'all 0.3s ease',
                    }}
                    className="bg-white rounded-lg shadow-lg overflow-auto"
                  >
                    <iframe
                      ref={iframeRef}
                      className="w-full h-full border-0"
                      title="Design Preview"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="history" className="flex-1 m-0 mt-2 mx-6 mb-6 overflow-auto">
                <ScrollArea className="h-full">
                  {versions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                      <History className="h-16 w-16 mb-4 opacity-50" />
                      <p className="text-lg">No version history yet</p>
                      <p className="text-sm">Versions will appear here as you make changes</p>
                    </div>
                  ) : (
                    <div className="space-y-4 pb-4">
                      {versions.map((version) => (
                        <div
                          key={version.id}
                          className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-sm">Version {version.version_number}</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(version.created_at).toLocaleString()}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => restoreVersion(version)}
                            >
                              <Undo className="h-3 w-3 mr-2" />
                              Restore
                            </Button>
                          </div>

                          {version.change_description && (
                            <p className="text-sm text-muted-foreground mt-2 p-3 bg-muted rounded">
                              {version.change_description}
                            </p>
                          )}

                          {version.ai_prompt && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              <span className="font-medium">Prompt:</span> {version.ai_prompt}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
