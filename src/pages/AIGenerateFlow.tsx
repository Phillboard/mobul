import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Sparkles, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { TextPromptForm } from "@/components/landing-pages/create/TextPromptForm";
import { ImageUploadForm } from "@/components/landing-pages/create/ImageUploadForm";
import { LinkAnalysisForm } from "@/components/landing-pages/create/LinkAnalysisForm";
import { GeneratePageRequest, GeneratePageResponse } from "@/types/landingPages";

type GenerationMode = 'text_prompt' | 'image_upload' | 'link_analysis';

export default function AIGenerateFlow() {
  const { mode } = useParams<{ mode: GenerationMode }>();
  const navigate = useNavigate();
  const { currentClient } = useTenant();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [generatedPageId, setGeneratedPageId] = useState<string | null>(null);

  if (!currentClient) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Please select a client</p>
        </div>
      </Layout>
    );
  }

  const handleGenerate = async (request: GeneratePageRequest) => {
    setIsGenerating(true);
    setGenerationProgress(10);
    setGenerationStep('Initializing AI...');

    try {
      // Call AI generation function
      setGenerationStep('Generating your landing page...');
      setGenerationProgress(30);

      const { data, error } = await supabase.functions.invoke('ai-landing-page-generate', {
        body: request,
      });

      if (error) throw error;

      const response: GeneratePageResponse = data;
      
      setGenerationStep('Creating database entry...');
      setGenerationProgress(70);

      // Save to database
      const { data: landingPage, error: saveError } = await supabase
        .from('landing_pages')
        .insert({
          client_id: currentClient.id,
          name: `AI Generated - ${new Date().toLocaleDateString()}`,
          slug: `ai-page-${Date.now()}`,
          source_type: mode,
          source_data: {
            prompt: request.prompt,
            pageType: request.pageType,
            industry: request.industry,
            imageUrl: request.imageUrl,
            sourceUrl: request.sourceUrl,
          },
          ai_provider: response.provider,
          ai_model: response.model,
          generation_tokens: response.tokensUsed,
          html_content: response.html,
          content_json: { html: response.html },
          editor_type: 'ai',
          published: false,
        })
        .select()
        .single();

      if (saveError) throw saveError;

      setGenerationStep('Complete!');
      setGenerationProgress(100);
      setPreviewHtml(response.html);
      setGeneratedPageId(landingPage.id);

      toast.success('Landing page generated successfully!');
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate landing page');
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const handleEditWithAI = () => {
    if (generatedPageId) {
      navigate(`/landing-pages/${generatedPageId}/editor?mode=chat`);
    }
  };

  const handleOpenVisualEditor = () => {
    if (generatedPageId) {
      navigate(`/landing-pages/${generatedPageId}/editor?mode=visual`);
    }
  };

  return (
    <Layout>
      <div className="container max-w-4xl py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/landing-pages/create')}
            disabled={isGenerating}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Generate with AI</h1>
            <p className="text-muted-foreground">
              {mode === 'text_prompt' && 'Describe your ideal landing page'}
              {mode === 'image_upload' && 'Upload your mailer image'}
              {mode === 'link_analysis' && 'Analyze an existing website'}
            </p>
          </div>
        </div>

        {!previewHtml ? (
          <Card>
            <CardContent className="pt-6">
              {mode === 'text_prompt' && (
                <TextPromptForm onGenerate={handleGenerate} isGenerating={isGenerating} />
              )}
              {mode === 'image_upload' && (
                <ImageUploadForm onGenerate={handleGenerate} isGenerating={isGenerating} />
              )}
              {mode === 'link_analysis' && (
                <LinkAnalysisForm onGenerate={handleGenerate} isGenerating={isGenerating} />
              )}

              {isGenerating && (
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{generationStep}</span>
                      <span className="font-medium">{generationProgress}%</span>
                    </div>
                    <Progress value={generationProgress} />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>This usually takes 10-20 seconds...</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Preview and Options */
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    Your Landing Page is Ready!
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preview */}
                <div className="border rounded-lg overflow-hidden" style={{ height: '400px' }}>
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-full"
                    title="Preview"
                    sandbox="allow-same-origin"
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleEditWithAI}
                    className="flex-1"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Edit with AI Chat
                  </Button>
                  <Button
                    onClick={handleOpenVisualEditor}
                    variant="outline"
                    className="flex-1"
                  >
                    Open Visual Editor
                  </Button>
                </div>

                <p className="text-sm text-center text-muted-foreground">
                  You can refine your page using AI chat or switch to the visual editor at any time
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}

