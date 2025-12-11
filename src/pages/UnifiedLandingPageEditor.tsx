import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { 
  ArrowLeft, 
  Download, 
  Save, 
  Undo2, 
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  MessageSquare,
  Eye,
  Code,
  Loader2
} from "lucide-react";
import { supabase } from "@core/services/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { useVisualEditor } from "@/features/landing-pages/hooks";
import { ExportDialog } from "@/features/landing-pages/components/ExportDialog";
import { toast } from "sonner";

export default function UnifiedLandingPageEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentClient } = useTenant();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageName, setPageName] = useState('');
  const [slug, setSlug] = useState('');
  const [initialHtml, setInitialHtml] = useState('');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<'chat' | 'visual' | 'code'>(
    (searchParams.get('mode') as any) || 'visual'
  );

  // Chat state
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isChatting, setIsChatting] = useState(false);

  const {
    state,
    canUndo,
    canRedo,
    hasUnsavedChanges,
    undo,
    redo,
    updateHtml,
    setDevice,
    setZoom,
    markAsSaved,
  } = useVisualEditor(initialHtml);

  // Load landing page
  useEffect(() => {
    if (id && id !== 'new') {
      loadPage();
    } else {
      setIsLoading(false);
      setInitialHtml('<div class="min-h-screen flex items-center justify-center"><h1 class="text-4xl font-bold">Start editing your page</h1></div>');
    }
  }, [id]);

  const loadPage = async () => {
    try {
      const { data, error } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setPageName(data.name);
      setSlug(data.slug);
      setInitialHtml(data.html_content || '');
      setIsLoading(false);
    } catch (error: any) {
      console.error('Load error:', error);
      toast.error('Failed to load landing page');
      navigate('/landing-pages');
    }
  };

  const handleSave = async () => {
    if (!currentClient) return;

    setIsSaving(true);
    try {
      const pageData: any = {
        name: pageName,
        slug: slug || generateSlug(pageName),
        html_content: state.html,
        content_json: { html: state.html },
        updated_at: new Date().toISOString(),
      };

      if (id && id !== 'new') {
        const { error } = await supabase
          .from('landing_pages')
          .update(pageData)
          .eq('id', id);

        if (error) throw error;
        toast.success('Landing page saved!');
      } else {
        const { data, error } = await supabase
          .from('landing_pages')
          .insert([{
            ...pageData,
            client_id: currentClient.id,
            editor_type: 'ai',
            published: false,
          }])
          .select()
          .single();

        if (error) throw error;
        toast.success('Landing page created!');
        navigate(`/landing-pages/${data.id}/editor`, { replace: true });
      }

      markAsSaved();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Failed to save landing page');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChatSubmit = async () => {
    if (!chatMessage.trim() || isChatting || !id) return;

    setIsChatting(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-landing-page-chat', {
        body: {
          landingPageId: id,
          message: chatMessage,
          currentHtml: state.html,
        },
      });

      if (error) throw error;

      updateHtml(data.updatedHtml);
      setChatHistory([
        ...chatHistory,
        { role: 'user', content: chatMessage },
        { role: 'assistant', content: data.explanation },
      ]);
      setChatMessage('');
      toast.success('Changes applied!');
    } catch (error: any) {
      console.error('Chat error:', error);
      toast.error('Failed to apply changes');
    } finally {
      setIsChatting(false);
    }
  };

  const generateSlug = (text: string) => {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Toolbar */}
      <div className="border-b bg-card p-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/landing-pages')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="h-6 w-px bg-border" />
          <Input
            value={pageName}
            onChange={(e) => setPageName(e.target.value)}
            className="max-w-md"
            placeholder="Page name"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={redo} disabled={!canRedo}>
            <Redo2 className="h-4 w-4" />
          </Button>
          
          <div className="h-6 w-px bg-border" />

          <Button variant="ghost" size="sm" onClick={() => setDevice('desktop')}>
            <Monitor className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDevice('tablet')}>
            <Tablet className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDevice('mobile')}>
            <Smartphone className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-border" />

          <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button onClick={handleSave} disabled={isSaving || !pageName}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save *' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as any)} className="flex-1 flex flex-col">
          <div className="border-b px-4">
            <TabsList>
              <TabsTrigger value="chat">
                <MessageSquare className="h-4 w-4 mr-2" />
                AI Chat
              </TabsTrigger>
              <TabsTrigger value="visual">
                <Eye className="h-4 w-4 mr-2" />
                Visual
              </TabsTrigger>
              <TabsTrigger value="code">
                <Code className="h-4 w-4 mr-2" />
                Code
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Chat Mode */}
          <TabsContent value="chat" className="flex-1 flex overflow-hidden m-0">
            <div className="flex-1 grid grid-cols-2 gap-4 p-4">
              {/* Chat Panel */}
              <div className="flex flex-col border rounded-lg bg-card">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatHistory.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Chat with AI to refine your landing page</p>
                      <p className="text-sm mt-2">Try: "Make the heading bigger" or "Change the button color to blue"</p>
                    </div>
                  )}
                  {chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t p-4 flex gap-2">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                    placeholder="Describe what you want to change..."
                    disabled={isChatting}
                  />
                  <Button onClick={handleChatSubmit} disabled={isChatting || !chatMessage.trim()}>
                    {isChatting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
                  </Button>
                </div>
              </div>

              {/* Preview */}
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  srcDoc={state.html}
                  className="w-full h-full"
                  title="Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </TabsContent>

          {/* Visual Mode */}
          <TabsContent value="visual" className="flex-1 overflow-hidden m-0 p-4">
            <div className="h-full border rounded-lg overflow-hidden">
              <iframe
                srcDoc={state.html}
                className="w-full h-full"
                title="Visual Editor"
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
          </TabsContent>

          {/* Code Mode */}
          <TabsContent value="code" className="flex-1 overflow-hidden m-0 p-4">
            <textarea
              value={state.html}
              onChange={(e) => updateHtml(e.target.value)}
              className="w-full h-full font-mono text-sm p-4 border rounded-lg resize-none"
            />
          </TabsContent>
        </Tabs>
      </div>

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        landingPageId={id || ''}
        html={state.html}
        pageName={pageName}
      />
    </div>
  );
}

