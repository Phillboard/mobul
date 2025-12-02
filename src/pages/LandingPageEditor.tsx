import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Save, 
  Download, 
  Loader2,
  Send,
  Sparkles,
  Paperclip,
  RotateCcw
} from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
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
  const { currentClient } = useTenant();
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const mode = searchParams.get('mode') || 'ai';
  
  const [pageName, setPageName] = useState('');
  const [html, setHtml] = useState('');
  const [prompt, setPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [availableForms, setAvailableForms] = useState<any[]>([]);

  useEffect(() => {
    if (currentClient) {
      loadForms();
    }
  }, [currentClient]);

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

  const handleSave = async () => {
    if (!pageName.trim()) {
      toast.error('Please enter a page name');
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('landing_pages')
        .insert({
          client_id: currentClient?.id,
          name: pageName,
          slug: pageName.toLowerCase().replace(/\s+/g, '-'),
          html_content: html,
          content_json: { html, chatHistory },
          editor_type: 'ai',
          published: false,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Landing page saved!');
      navigate(`/landing-pages`);
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
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
            onChange={(e) => setPageName(e.target.value)}
            placeholder="Page name"
            className="w-64"
          />
        </div>
        <div className="flex items-center gap-2">
          {html && (
            <Button variant="outline" size="sm" onClick={handleStartOver}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Start Over
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !pageName || !html}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
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
