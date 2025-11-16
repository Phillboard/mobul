import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Globe, Loader2, Sparkles, Code } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EditableText } from "@/components/landing-pages/EditableText";
import { CodeEntryForm } from "@/components/landing-pages/CodeEntryForm";
import { EmbedCodeGenerator } from "@/components/landing-pages/EmbedCodeGenerator";
import { useTenant } from "@/contexts/TenantContext";

export default function SimpleLandingPageEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentClient } = useTenant();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageName, setPageName] = useState("");
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [content, setContent] = useState<any>({
    hero: { heading: "", subheading: "", backgroundImage: "", backgroundColor: "" },
    benefits: [],
    steps: [],
    trustSection: null,
    sections: [],
  });

  useEffect(() => {
    if (id) {
      loadPage();
    }
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
      setContent(data.content_json || {
        hero: { heading: "Claim Your Gift Card", subheading: "Enter your code below", backgroundImage: "", backgroundColor: "" },
        benefits: [],
        steps: [],
        trustSection: null,
        sections: [
          { type: "text", content: "Thank you for your participation!" },
        ],
      });
    } catch (error: any) {
      console.error("Error loading page:", error);
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
      console.error("Error saving page:", error);
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
        {/* Top Toolbar */}
        <div className="border-b bg-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/landing-pages")}
            >
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEmbedDialogOpen(true)}
            >
              <Code className="h-4 w-4 mr-2" />
              Get Embed Code
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {/* Regenerate with AI */}}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/lp/${id}`, "_blank")}
            >
              <Globe className="h-4 w-4 mr-2" />
              Preview
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

        {/* Preview Area with Inline Editing */}
        <div className="flex-1 overflow-auto bg-muted/20 p-8">
          <div className="max-w-4xl mx-auto bg-background rounded-lg shadow-lg overflow-hidden">
            {/* Hero Section */}
            <div 
              className="relative p-12 text-center"
              style={{
                background: content.hero?.backgroundColor || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white"
              }}
            >
              {content.hero?.backgroundImage && (
                <div className="absolute inset-0 opacity-20">
                  <div className="text-xs text-white/50 p-2">Background: {content.hero.backgroundImage}</div>
                </div>
              )}
              <div className="relative z-10 space-y-4">
                <EditableText
                  value={content.hero?.heading || ""}
                  onSave={(value) => updateContent(["hero", "heading"], value)}
                  className="text-5xl font-bold drop-shadow-lg"
                  as="h1"
                />
                <EditableText
                  value={content.hero?.subheading || ""}
                  onSave={(value) => updateContent(["hero", "subheading"], value)}
                  className="text-xl opacity-90"
                  as="p"
                />
              </div>
            </div>

            {/* Benefits Section */}
            {content.benefits?.length > 0 && (
              <div className="p-12 bg-muted/30">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {content.benefits.map((benefit: any, index: number) => (
                    <div key={index} className="bg-background p-6 rounded-lg shadow-sm border">
                      <div className="text-4xl mb-3">{benefit.icon === "gift" ? "🎁" : benefit.icon === "check" ? "✓" : "⭐"}</div>
                      <EditableText
                        value={benefit.title}
                        onSave={(value) => updateContent(["benefits", String(index), "title"], value)}
                        className="text-lg font-semibold mb-2"
                        as="h3"
                      />
                      <EditableText
                        value={benefit.description}
                        onSave={(value) => updateContent(["benefits", String(index), "description"], value)}
                        className="text-sm text-muted-foreground"
                        as="p"
                        multiline
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Steps Section */}
            {content.steps?.length > 0 && (
              <div className="p-12">
                <h2 className="text-3xl font-bold text-center mb-10">How It Works</h2>
                <div className="space-y-6">
                  {content.steps.map((step: any, index: number) => (
                    <div key={index} className="flex gap-6 items-start">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                        {step.number}
                      </div>
                      <div className="flex-1">
                        <EditableText
                          value={step.title}
                          onSave={(value) => updateContent(["steps", String(index), "title"], value)}
                          className="text-xl font-semibold mb-2"
                          as="h3"
                        />
                        <EditableText
                          value={step.description}
                          onSave={(value) => updateContent(["steps", String(index), "description"], value)}
                          className="text-muted-foreground"
                          as="p"
                          multiline
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trust Section */}
            {content.trustSection && (
              <div className="p-8 bg-primary/5 border-y text-center">
                <EditableText
                  value={content.trustSection.title}
                  onSave={(value) => updateContent(["trustSection", "title"], value)}
                  className="text-2xl font-bold mb-2"
                  as="h3"
                />
                <EditableText
                  value={content.trustSection.content}
                  onSave={(value) => updateContent(["trustSection", "content"], value)}
                  className="text-muted-foreground"
                  as="p"
                />
              </div>
            )}

            {/* Body Sections */}
            {content.sections?.length > 0 && (
              <div className="p-12 space-y-6">
                {content.sections.map((section: any, index: number) => (
                  <EditableText
                    key={index}
                    value={section.content}
                    onSave={(value) => updateContent(["sections", String(index), "content"], value)}
                    className="text-lg leading-relaxed"
                    as="p"
                    multiline
                  />
                ))}
              </div>
            )}

            {/* Code Entry Form */}
            <div className="border-t p-12 bg-muted/10">
              <CodeEntryForm campaignId={id || ""} />
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
