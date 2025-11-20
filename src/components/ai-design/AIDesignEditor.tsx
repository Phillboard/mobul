import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, Send, Sparkles, Save, ExternalLink, History, Undo } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

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

export function AIDesignEditor({ designType, designId, onSwitchToManual }: AIDesignEditorProps) {
  const navigate = useNavigate();
  
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
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
  const [versions, setVersions] = useState<any[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
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
    if (confirm(`Restore version from ${new Date(version.created_at).toLocaleString()}?`)) {
      const html = version.grapesjs_snapshot.pages[0].component;
      setCurrentHtml(html);
      
      const systemMessage: Message = {
        id: crypto.randomUUID(),
        role: 'system',
        content: `Restored to version: ${version.version_name}`,
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, systemMessage]);
      await saveToDatabase(html, [...messages, systemMessage]);
      toast.success('Version restored!');
    }
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
  
  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="border-b bg-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">AI Design Editor</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="outline" size="sm" onClick={onSwitchToManual}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Switch to Manual Editor
          </Button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
                >
                  <div className={`inline-block max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : message.role === 'assistant'
                      ? 'bg-muted'
                      : 'bg-accent text-accent-foreground'
                  }`}>
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
          
          <div className="p-3 border-t bg-muted/30">
            <div className="text-xs text-muted-foreground mb-2">Quick actions:</div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => handleQuickAction('Make the call-to-action button more prominent and compelling')}>
                Improve CTA
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleQuickAction('Add a testimonials section with 3 customer reviews')}>
                Add Testimonials
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleQuickAction('Optimize the design for mobile devices')}>
                Mobile Optimize
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleQuickAction('Improve the visual hierarchy and add more whitespace')}>
                Enhance Visuals
              </Button>
            </div>
          </div>
          
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Describe what you want to change... (Shift+Enter for new line)"
                className="resize-none"
                rows={3}
              />
              <Button 
                onClick={sendMessage} 
                disabled={!inputValue.trim() || isGenerating}
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="w-1/2 flex flex-col">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
            <TabsList className="m-4 mb-0">
              <TabsTrigger value="chat">Live Preview</TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                Version History ({versions.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="flex-1 p-4">
              <div className="h-full border rounded-lg overflow-hidden bg-background">
                <iframe
                  ref={iframeRef}
                  srcDoc={currentHtml}
                  className="w-full h-full"
                  title="Live Preview"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="history" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition"
                      onClick={() => restoreVersion(version)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium">{version.version_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(version.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs ${
                          version.change_type === 'ai_generation' ? 'bg-primary/10 text-primary' :
                          version.change_type === 'ai_refinement' ? 'bg-accent/10 text-accent' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {version.change_type.replace('_', ' ')}
                        </div>
                      </div>
                      
                      {version.ai_prompt && (
                        <div className="text-sm text-muted-foreground mb-2">
                          "{version.ai_prompt}"
                        </div>
                      )}
                      
                      <Button size="sm" variant="outline" className="w-full mt-2">
                        <Undo className="h-3 w-3 mr-2" />
                        Restore This Version
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
