import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Layout } from "@/shared/components/layout/Layout";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { 
  ArrowLeft, 
  Save, 
  Download, 
  Loader2,
  Send,
  Sparkles,
  Paperclip,
  RotateCcw,
  Link2,
  Copy,
  ExternalLink,
  Globe
} from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/shared/components/ui/resizable";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function LandingPageEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id: pageId } = useParams();
  const { currentClient } = useTenant();
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const mode = searchParams.get('mode') || 'ai';
  
  const [pageName, setPageName] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [html, setHtml] = useState('');
  const [prompt, setPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [availableForms, setAvailableForms] = useState<any[]>([]);
  const [existingPageId, setExistingPageId] = useState<string | null>(pageId || null);

  useEffect(() => {
    if (currentClient) {
      loadForms();
      if (pageId) {
        loadExistingPage();
      }
    }
  }, [currentClient, pageId]);

  const loadExistingPage = async () => {
    if (!pageId) return;
    try {
      const { data, error } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('id', pageId)
        .single();

      if (error) throw error;
      if (data) {
        setPageName(data.name || '');
        setPageSlug(data.slug || '');
        setHtml(data.html_content || '');
        setIsPublished(data.published || false);
        setExistingPageId(data.id);
        if (data.content_json?.chatHistory) {
          setChatHistory(data.content_json.chatHistory);
        }
      }
    } catch (error) {
      console.error('Failed to load page:', error);
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const loadForms = async () => {
    try {
      const { data, error } = await supabase
        .from('ace_forms')
        .select('*')
        .eq('client_id', currentClient?.id)
        .eq('is_active', true);

      if (error) throw error;
      setAvailableForms(data || []);
    } catch (error) {
      console.error('Failed to load forms:', error);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe what you want');
      return;
    }

    const userMessage = prompt.trim();
    setPrompt('');
    
    // Add user message to chat immediately
    const newChatHistory: ChatMessage[] = [
      ...chatHistory,
      { role: 'user', content: userMessage }
    ];
    setChatHistory(newChatHistory);

    setIsGenerating(true);
    try {
      console.log('Calling AI...', { isEdit: html.length > 0 });
      
      const { data, error } = await supabase.functions.invoke('ai-landing-page-generate-simple', {
        body: {
          prompt: userMessage,
          currentHtml: html || undefined, // Send current HTML for edits
          chatHistory: newChatHistory.slice(-10), // Send last 10 messages for context
          clientId: currentClient?.id,
          availableForms: availableForms.map(f => ({ id: f.id, name: f.name, description: f.description })),
        },
      });

      console.log('Response:', { data, error });

      if (error) {
        throw new Error(data?.error || error.message || 'Failed to generate');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.html) {
        throw new Error('No HTML returned from AI');
      }

      setHtml(data.html);
      setChatHistory([
        ...newChatHistory,
        { role: 'assistant', content: data.message || 'Done! I updated your landing page.' }
      ]);
      toast.success(html ? 'Page updated!' : 'Page created!');
    } catch (error: any) {
      console.error('Generation error:', error);
      setChatHistory([
        ...newChatHistory,
        { role: 'assistant', content: `Sorry, there was an error: ${error.message}` }
      ]);
      toast.error(error.message || 'Failed to generate');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartOver = () => {
    setHtml('');
    setChatHistory([]);
    setPrompt('');
    toast.info('Started fresh!');
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleSave = async (publish = false) => {
    if (!pageName.trim()) {
      toast.error('Please enter a page name');
      return;
    }

    setIsSaving(true);
    try {
      const slug = pageSlug || generateSlug(pageName);
      const pageData = {
        client_id: currentClient?.id,
        name: pageName,
        slug,
        html_content: html,
        content_json: { html, chatHistory },
        editor_type: 'ai',
        published: publish || isPublished,
      };

      let result;
      if (existingPageId) {
        // Update existing page
        const { data, error } = await supabase
          .from('landing_pages')
          .update(pageData)
          .eq('id', existingPageId)
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        // Create new page
        const { data, error } = await supabase
          .from('landing_pages')
          .insert(pageData)
          .select()
          .single();
        if (error) throw error;
        result = data;
        setExistingPageId(result.id);
      }

      setPageSlug(result.slug);
      setIsPublished(result.published);
      toast.success(publish ? 'Page published!' : 'Page saved!');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Failed to save: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    await handleSave(true);
  };

  const getPublicUrl = () => {
    const clientSlug = currentClient?.slug || currentClient?.name?.toLowerCase().replace(/\s+/g, '-') || 'client';
    const slug = pageSlug || generateSlug(pageName);
    return `${window.location.origin}/${clientSlug}/p/${slug}`;
  };

  const copyPublicUrl = () => {
    navigator.clipboard.writeText(getPublicUrl());
    toast.success('URL copied to clipboard!');
  };

  if (!currentClient) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Please select a client</p>
        </div>
      </Layout>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <div className="border-b bg-card p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/landing-pages')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Input
            value={pageName}
            onChange={(e) => {
              setPageName(e.target.value);
              if (!existingPageId) {
                setPageSlug(generateSlug(e.target.value));
              }
            }}
            placeholder="Page name"
            className="w-48"
          />
          {pageName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              <Globe className="h-3 w-3" />
              <span className="max-w-[200px] truncate">/{currentClient?.slug || 'client'}/p/{pageSlug || generateSlug(pageName)}</span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={copyPublicUrl}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {existingPageId && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/landing-pages/${existingPageId}/canvas`)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Canvas Editor
            </Button>
          )}
          {html && (
            <Button variant="outline" size="sm" onClick={handleStartOver}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Start Over
            </Button>
          )}
          {isPublished && (
            <Button variant="outline" size="sm" onClick={() => window.open(getPublicUrl(), '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Live
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={isSaving || !pageName || !html}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button onClick={handlePublish} disabled={isSaving || !pageName || !html} className="bg-green-600 hover:bg-green-700">
            <Globe className="h-4 w-4 mr-2" />
            {isPublished ? 'Update Live' : 'Publish'}
          </Button>
        </div>
      </div>

      {/* Main Content - Replit Style */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel - AI Chat */}
        <ResizablePanel defaultSize={40} minSize={25}>
          <div className="h-full flex flex-col bg-muted/30">
            <div className="p-4 border-b bg-card flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                AI Assistant
              </h3>
              {chatHistory.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {chatHistory.length} messages
                </span>
              )}
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Describe your landing page</p>
                  <p className="text-sm mt-2 max-w-xs mx-auto">
                    Tell me what you want and I'll create it. Then keep chatting to refine it!
                  </p>
                  <div className="mt-6 space-y-2 text-left max-w-xs mx-auto">
                    <p className="text-xs font-medium text-muted-foreground">Try saying:</p>
                    <button 
                      onClick={() => setPrompt("Create a modern auto warranty landing page with dark theme")}
                      className="block w-full text-left text-sm p-2 rounded bg-card hover:bg-accent transition-colors"
                    >
                      "Create a modern auto warranty landing page"
                    </button>
                    <button 
                      onClick={() => setPrompt("Build a real estate cash offer page with urgency")}
                      className="block w-full text-left text-sm p-2 rounded bg-card hover:bg-accent transition-colors"
                    >
                      "Build a real estate cash offer page"
                    </button>
                  </div>
                </div>
              )}
              
              {chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-card border rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        {html ? 'Updating your page...' : 'Creating your page...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>
            
            {/* Input Area */}
            <div className="p-4 border-t bg-card space-y-3">
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                  <Paperclip className="h-4 w-4" />
                  <span className="flex-1 truncate">{selectedFile.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                    Remove
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="mailer-upload"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <Label htmlFor="mailer-upload" className="cursor-pointer">
                  <Button variant="outline" size="icon" type="button" asChild>
                    <div>
                      <Paperclip className="h-4 w-4" />
                    </div>
                  </Button>
                </Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={html 
                    ? "Tell me what to change... (e.g., 'make it more colorful', 'add testimonials')" 
                    : "Describe your landing page..."
                  }
                  className="resize-none min-h-[60px]"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                />
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  size="icon"
                  className="h-auto"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Press Enter to send • Shift+Enter for new line
              </p>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Right Panel - Live Preview */}
        <ResizablePanel defaultSize={60}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b bg-card flex items-center justify-between">
              <h3 className="font-semibold">Live Preview</h3>
              {html && (
                <span className="text-xs text-muted-foreground">
                  {(html.length / 1024).toFixed(1)} KB
                </span>
              )}
            </div>
            <div className="flex-1 bg-white">
              {html ? (
                <iframe
                  srcDoc={html}
                  className="w-full h-full border-0"
                  title="Preview"
                  sandbox="allow-same-origin allow-scripts"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground bg-gradient-to-br from-slate-50 to-slate-100">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center">
                      <Sparkles className="h-10 w-10 text-blue-500/50" />
                    </div>
                    <p className="font-medium">Your page will appear here</p>
                    <p className="text-sm mt-1">
                      Describe what you want in the chat
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
