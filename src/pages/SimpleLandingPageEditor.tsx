import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Code, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EditableText } from "@/components/landing-pages/EditableText";
import { CodeEntryForm } from "@/components/landing-pages/CodeEntryForm";
import { EmbedCodeGenerator } from "@/components/landing-pages/EmbedCodeGenerator";

export default function SimpleLandingPageEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageName, setPageName] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [pagePublished, setPagePublished] = useState(false);
  const [hasHtmlContent, setHasHtmlContent] = useState(false);
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [content, setContent] = useState<any>({
    hero: { heading: "", subheading: "" },
    benefits: [],
    _metadata: null,
  });

  useEffect(() => {
    if (id) loadPage();
  }, [id]);

  const loadPage = async () => {
    try {
      const { data, error } = await supabase
        .from("landing_pages")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setPageName(data.name);
      setPageSlug(data.slug);
      setPagePublished(data.published || false);
      setHasHtmlContent(!!data.html_content);
      setContent(data.content_json || {
        hero: { heading: "Claim Your Gift Card", subheading: "Enter your code below" },
        benefits: [],
        _metadata: null,
      });
    } catch (error: any) {
      toast.error("Failed to load landing page");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!pageName.trim()) {
      toast.error("Please enter a page name");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("landing_pages")
        .update({
          name: pageName,
          content_json: content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Landing page saved!");
    } catch (error: any) {
      toast.error("Failed to save landing page");
    } finally {
      setIsSaving(false);
    }
  };

  const updateContent = (path: string[], value: string) => {
    setContent((prev: any) => {
      const newContent = { ...prev };
      let current = newContent;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newContent;
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-full">
        <div className="border-b bg-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/landing-pages")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Input
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
              className="max-w-md"
              placeholder="Page name"
            />
          </div>
          <div className="flex items-center gap-2">
            {hasHtmlContent && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  if (!pagePublished) {
                    toast.info("This page is not published yet. Publish it to make it publicly accessible.");
                  }
                  window.open(`/p/${pageSlug}`, "_blank");
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Live Page
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setEmbedDialogOpen(true)}>
              <Code className="h-4 w-4 mr-2" />
              Embed Code
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-muted p-8">
          <div className="max-w-4xl mx-auto bg-background rounded-lg shadow-lg">
            {content._metadata?.company_name && (
              <div className="bg-card border-b px-8 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold" style={{ color: content._metadata.primary_color }}>
                      {content._metadata.company_name}
                    </h2>
                    <p className="text-sm text-muted-foreground">{content._metadata.industry}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Your Reward:</p>
                    <p className="text-lg font-bold" style={{ color: content._metadata.accent_color }}>
                      ${content._metadata.gift_card_value} {content._metadata.gift_card_brand}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div 
              className="relative p-12 text-center"
              style={{
                background: content._metadata?.primary_color 
                  ? `linear-gradient(135deg, ${content._metadata.primary_color} 0%, ${content._metadata.accent_color} 100%)`
                  : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%)',
              }}
            >
              <div className="relative z-10">
                <EditableText
                  value={content.hero?.heading || ""}
                  onSave={(value) => updateContent(["hero", "heading"], value)}
                  className="text-4xl font-bold text-white mb-4"
                  as="h1"
                />
                <EditableText
                  value={content.hero?.subheading || ""}
                  onSave={(value) => updateContent(["hero", "subheading"], value)}
                  className="text-xl text-white/90"
                  as="p"
                />
              </div>
            </div>

            {content.benefits?.length > 0 && (
              <div className="p-8 bg-muted/50">
                <h2 className="text-2xl font-bold text-center mb-8">
                  {content._metadata?.company_name ? `Why Choose ${content._metadata.company_name}` : "Benefits"}
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                  {content.benefits.map((benefit: any, idx: number) => (
                    <div 
                      key={idx} 
                      className="bg-card p-6 rounded-lg shadow-sm border-2" 
                      style={{ borderColor: content._metadata?.accent_color || 'hsl(var(--border))' }}
                    >
                      <div className="text-3xl mb-3">
                        {benefit.icon === "shield" ? "🛡️" : benefit.icon === "check" ? "✓" : benefit.icon === "star" ? "⭐" : benefit.icon === "zap" ? "⚡" : "✨"}
                      </div>
                      <EditableText 
                        value={benefit.title} 
                        onSave={(v) => {
                          const newBenefits = [...content.benefits];
                          newBenefits[idx] = { ...benefit, title: v };
                          setContent({ ...content, benefits: newBenefits });
                        }} 
                        className="font-semibold text-lg mb-2" 
                        as="h3" 
                      />
                      <EditableText 
                        value={benefit.description} 
                        onSave={(v) => {
                          const newBenefits = [...content.benefits];
                          newBenefits[idx] = { ...benefit, description: v };
                          setContent({ ...content, benefits: newBenefits });
                        }} 
                        className="text-muted-foreground" 
                        as="p" 
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-8">
              <h2 className="text-2xl font-bold text-center mb-6">Claim Your Reward</h2>
              <CodeEntryForm campaignId={id || ""} />
            </div>

            <div 
              className="p-6 text-center text-sm border-t"
              style={{ 
                backgroundColor: content._metadata?.primary_color ? content._metadata.primary_color + '10' : 'hsl(var(--muted))',
                borderTopColor: content._metadata?.primary_color || 'hsl(var(--border))'
              }}
            >
              <p className="font-semibold mb-2" style={{ color: content._metadata?.primary_color || 'inherit' }}>
                {content._metadata?.company_name ? `Powered by ${content._metadata.company_name}` : "Powered by Our Company"}
              </p>
              <p className="text-muted-foreground">
                © {new Date().getFullYear()} {content._metadata?.company_name || "Company"}. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>

      <EmbedCodeGenerator
        open={embedDialogOpen}
        onOpenChange={setEmbedDialogOpen}
        campaignId={id || ""}
      />
    </Layout>
  );
}
