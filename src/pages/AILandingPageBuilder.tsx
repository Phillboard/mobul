import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Image as ImageIcon, Globe, Smartphone, Monitor, Tablet } from "lucide-react";
import { generateLandingPage, analyzePosterCardImage, analyzeWebsite } from "@/lib/ai-page-generator";
import { toast } from "sonner";

export default function AILandingPageBuilder() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: 'Hi! I\'m your AI landing page designer. I can help you create beautiful landing pages for your campaigns. Upload a postcard image, share your website URL, or just describe what you need!',
    },
  ]);
  const [input, setInput] = useState('');
  const [generatedHTML, setGeneratedHTML] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [styleGuide, setStyleGuide] = useState<any>(null);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsGenerating(true);

    try {
      const result = await generateLandingPage({
        prompt: userMessage,
        styleGuide,
        includeForm: true,
        includeGiftCardRedemption: userMessage.toLowerCase().includes('gift card'),
      });

      if (result.success && result.html) {
        setGeneratedHTML(result.html);
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'I\'ve generated your landing page! You can see the preview on the right. Let me know if you\'d like any changes.',
          },
        ]);
      } else {
        throw new Error(result.error || 'Failed to generate page');
      }
    } catch (error: any) {
      toast.error(`Generation failed: ${error.message}`);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error.message}. Could you try rephrasing your request?`,
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    toast.info('Analyzing your postcard image...');
    
    try {
      const guide = await analyzePostcardImage(file);
      setStyleGuide(guide);
      toast.success('Image analyzed! I\'ve extracted your brand style.');
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `I've analyzed your postcard! I found your primary color (${guide.colors.primary}), fonts, and messaging. Ready to create a matching landing page!`,
        },
      ]);
    } catch (error: any) {
      toast.error('Failed to analyze image');
    }
  };

  const handleWebsiteAnalysis = async (url: string) => {
    toast.info('Analyzing your website...');
    
    try {
      const guide = await analyzeWebsite(url);
      setStyleGuide(guide);
      toast.success('Website analyzed! I\'ve learned your brand style.');
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `I've analyzed your website! I can now create landing pages that match your brand style.`,
        },
      ]);
    } catch (error: any) {
      toast.error('Failed to analyze website');
    }
  };

  const getDeviceWidth = () => {
    switch (device) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      case 'desktop': return '100%';
    }
  };

  return (
    <div className="h-screen flex flex-col md:flex-row">
      {/* Left: Chat Interface */}
      <div className="w-full md:w-1/2 flex flex-col border-r">
        {/* Header */}
        <div className="border-b p-4 bg-card">
          <h1 className="text-2xl font-bold">AI Landing Page Builder</h1>
          <p className="text-sm text-muted-foreground">Lovable-style AI page generation</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <Card className={`max-w-[80%] ${message.role === 'user' ? 'bg-primary text-primary-foreground' : ''}`}>
                <CardContent className="p-3">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </CardContent>
              </Card>
            </div>
          ))}
          
          {isGenerating && (
            <div className="flex justify-start">
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Generating your landing page...</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t p-4 space-y-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Upload Postcard
            </Button>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const url = prompt('Enter your website URL:');
                if (url) handleWebsiteAnalysis(url);
              }}
            >
              <Globe className="h-4 w-4 mr-2" />
              Analyze Website
            </Button>
          </div>

          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe the landing page you want to create..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={3}
            />
            <Button onClick={handleSend} disabled={!input.trim() || isGenerating}>
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setInput('Create a landing page for a roof inspection campaign with a $25 gift card offer')}>
              🏠 Roof Inspection
            </Button>
            <Button variant="outline" size="sm" onClick={() => setInput('Add a testimonials section')}>
              💬 Add Testimonials
            </Button>
            <Button variant="outline" size="sm" onClick={() => setInput('Make it more modern and colorful')}>
              🎨 Modernize
            </Button>
          </div>
        </div>
      </div>

      {/* Right: Live Preview */}
      <div className="w-full md:w-1/2 flex flex-col bg-muted">
        {/* Preview Toolbar */}
        <div className="border-b p-4 bg-card flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={device === 'mobile' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDevice('mobile')}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
            <Button
              variant={device === 'tablet' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDevice('tablet')}
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant={device === 'desktop' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDevice('desktop')}
            >
              <Monitor className="h-4 w-4" />
            </Button>
          </div>

          {generatedHTML && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                Edit in GrapesJS
              </Button>
              <Button size="sm">
                Publish
              </Button>
            </div>
          )}
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto flex items-start justify-center p-8">
          {generatedHTML ? (
            <div
              style={{ width: getDeviceWidth(), maxWidth: '100%' }}
              className="bg-white shadow-2xl rounded-lg overflow-hidden"
            >
              <iframe
                srcDoc={generatedHTML}
                className="w-full border-0"
                style={{ height: '800px' }}
                title="Landing Page Preview"
              />
            </div>
          ) : (
            <div className="text-center text-muted-foreground p-8">
              <p className="text-lg">Preview will appear here</p>
              <p className="text-sm">Start chatting to generate your landing page</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

