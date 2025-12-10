import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { useToast } from '@/shared/hooks';
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save, Eye, Code, Columns } from "lucide-react";
import { MarkdownRenderer } from "@/features/documentation/components/MarkdownRenderer";
import { MarkdownToolbar } from "@/features/documentation/components/MarkdownToolbar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/shared/components/ui/resizable";
import { Skeleton } from "@/shared/components/ui/skeleton";

type ViewMode = "edit" | "split" | "preview";

export default function DocEditorPage() {
  const { category, slug } = useParams<{ category: string; slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("split");

  useEffect(() => {
    loadDocument();
  }, [category, slug]);

  const loadDocument = async () => {
    if (!category || !slug) return;
    
    setIsLoading(true);
    try {
      // First try to load from database
      const { data: dbDoc, error: dbError } = await supabase
        .from("documentation_pages")
        .select("content, title")
        .eq("category", category)
        .eq("slug", slug)
        .single();

      if (!dbError && dbDoc?.content) {
        setContent(dbDoc.content);
        setTitle(dbDoc.title || "Documentation");
        setIsLoading(false);
        return;
      }

      // Fall back to file system
      const categoryFolderMap: Record<string, string> = {
        "getting-started": "1-GETTING-STARTED",
        "architecture": "2-ARCHITECTURE",
        "features": "3-FEATURES",
        "developer-guide": "4-DEVELOPER-GUIDE",
        "api-reference": "5-API-REFERENCE",
        "user-guides": "6-USER-GUIDES",
      };

      const slugFileMap: Record<string, string> = {
        "quickstart": "QUICKSTART",
        "overview": "OVERVIEW",
        "first-campaign": "FIRST_CAMPAIGN",
        "terminology": "TERMINOLOGY",
        "architecture-overview": "OVERVIEW",
        "data-model": "DATA_MODEL",
        "security": "SECURITY",
        "scalability": "SCALABILITY",
        "campaigns": "CAMPAIGNS",
        "campaign-lifecycle": "CAMPAIGN_LIFECYCLE",
        "audiences": "AUDIENCES",
        "gift-cards": "GIFT_CARDS",
        "purl-qr-codes": "PURL_QR_CODES",
        "landing-pages": "LANDING_PAGES",
        "analytics": "ANALYTICS",
        "lead-marketplace": "LEAD_MARKETPLACE",
        "setup": "SETUP",
        "edge-functions": "EDGE_FUNCTIONS",
        "database": "DATABASE",
        "event-tracking": "EVENT_TRACKING",
        "rest-api": "REST_API",
        "webhooks": "WEBHOOKS",
        "authentication": "AUTHENTICATION",
        "examples": "EXAMPLES",
        "admin-guide": "ADMIN_GUIDE",
        "agency-guide": "AGENCY_GUIDE",
        "client-guide": "CLIENT_GUIDE",
        "call-center-guide": "CALL_CENTER_GUIDE",
      };

      const folderName = categoryFolderMap[category];
      const fileName = slugFileMap[slug];
      
      if (!folderName || !fileName) {
        throw new Error("Documentation page not found");
      }

      const path = `/docs/${folderName}/${fileName}.md`;
      const response = await fetch(path);
      
      if (!response.ok) {
        throw new Error(`Failed to load documentation: ${response.status}`);
      }
      
      const text = await response.text();
      setContent(text);
      
      // Extract title from markdown
      const match = text.match(/^#\s+(.+)$/m);
      setTitle(match ? match[1] : "Documentation");
      
    } catch (error) {
      console.error("Error loading markdown:", error);
      toast({
        title: "Error",
        description: "Failed to load document for editing",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!category || !slug) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("documentation_pages")
        .upsert({
          category,
          slug,
          title,
          content,
          file_path: `/docs/${category}/${slug}.md`,
        }, {
          onConflict: "category,slug"
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Documentation saved successfully",
      });
      
      // Navigate back to the document view
      navigate(`/docs/${category}/${slug}`);
    } catch (error) {
      console.error("Error saving document:", error);
      toast({
        title: "Error",
        description: "Failed to save document",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInsert = (before: string, after?: string) => {
    const textarea = document.querySelector("textarea");
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = before + selectedText + (after || "");
    const newContent = content.substring(0, start) + newText + content.substring(end);
    
    setContent(newContent);
    
    // Set cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + before.length + selectedText.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col">
        <div className="border-b border-border bg-background p-4">
          <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background p-4">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/docs/${category}/${slug}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Document
            </Button>
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center border border-border rounded-lg">
              <Button
                variant={viewMode === "edit" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("edit")}
                className="rounded-r-none"
              >
                <Code className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "split" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("split")}
                className="rounded-none border-x border-border"
              >
                <Columns className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "preview" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("preview")}
                className="rounded-l-none"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>

            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "edit" && (
          <div className="h-full flex flex-col">
            <div className="border-b border-border p-4 bg-muted/30">
              <MarkdownToolbar onInsert={handleInsert} />
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0"
              placeholder="Write your markdown here..."
            />
          </div>
        )}

        {viewMode === "preview" && (
          <div className="h-full overflow-auto p-8 bg-muted/30">
            <div className="max-w-4xl mx-auto prose prose-slate dark:prose-invert">
              <MarkdownRenderer content={content} />
            </div>
          </div>
        )}

        {viewMode === "split" && (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full flex flex-col">
                <div className="border-b border-border p-4 bg-muted/30">
                  <MarkdownToolbar onInsert={handleInsert} />
                </div>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="flex-1 resize-none border-0 rounded-none font-mono text-sm focus-visible:ring-0"
                  placeholder="Write your markdown here..."
                />
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full overflow-auto p-8 bg-muted/30">
                <div className="max-w-4xl mx-auto prose prose-slate dark:prose-invert">
                  <MarkdownRenderer content={content} />
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
}
