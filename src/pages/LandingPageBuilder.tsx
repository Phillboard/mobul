import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Eye, Settings, ArrowLeft, Monitor, Tablet, Smartphone, Globe } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useLandingPages } from "@/hooks/useLandingPages";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPageBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentClient } = useTenant();
  const { createPage, updatePage } = useLandingPages(currentClient?.id);
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [viewportMode, setViewportMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [blocks, setBlocks] = useState<any[]>([]);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  useEffect(() => {
    if (id && id !== "new") {
      loadPage();
    }
  }, [id]);

  const loadPage = async () => {
    if (!id || id === "new") return;

    const { data, error } = await supabase
      .from("landing_pages")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load landing page",
        variant: "destructive",
      });
      return;
    }

    setName(data.name);
    setSlug(data.slug);
    const contentJson = data.content_json as { blocks?: any[] } | null;
    setBlocks(contentJson?.blocks || []);
    setMetaTitle(data.meta_title || "");
    setMetaDescription(data.meta_description || "");
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!id || id === "new") {
      setSlug(generateSlug(value));
    }
  };

  const handleSave = async () => {
    if (!currentClient) return;

    const pageData = {
      name,
      slug,
      client_id: currentClient.id,
      content_json: { version: "1.0", blocks },
      meta_title: metaTitle,
      meta_description: metaDescription,
    };

    if (id && id !== "new") {
      updatePage.mutate({ id, updates: pageData });
    } else {
      createPage.mutate(pageData, {
        onSuccess: (data) => {
          navigate(`/landing-pages/${data.id}/edit`);
        },
      });
    }
  };

  const viewportWidths = {
    desktop: "100%",
    tablet: "768px",
    mobile: "375px",
  };

  return (
    <Layout>
      <div className="space-y-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/landing-pages")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Page name"
                className="font-semibold text-lg h-auto border-0 px-0"
              />
              <div className="text-sm text-muted-foreground">/{slug}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewportMode === "desktop" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewportMode("desktop")}
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={viewportMode === "tablet" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewportMode("tablet")}
              >
                <Tablet className="h-4 w-4" />
              </Button>
              <Button
                variant={viewportMode === "mobile" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewportMode("mobile")}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={() => window.open(`/lp/${slug}`, "_blank")}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-4">
          {/* Left Sidebar - Blocks */}
          <div className="col-span-3">
            <Card>
              <CardContent className="p-4">
                <Tabs defaultValue="blocks">
                  <TabsList className="w-full">
                    <TabsTrigger value="blocks" className="flex-1">Blocks</TabsTrigger>
                    <TabsTrigger value="settings" className="flex-1">
                      <Settings className="h-4 w-4" />
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="blocks" className="space-y-2 mt-4">
                    <div className="text-sm font-semibold mb-2">Available Blocks</div>
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      📝 Text Block
                    </Button>
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      🖼️ Image Block
                    </Button>
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      🔘 Button
                    </Button>
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      📋 Code Entry Form
                    </Button>
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      🎁 Gift Card Display
                    </Button>
                  </TabsContent>
                  <TabsContent value="settings" className="space-y-4 mt-4">
                    <div>
                      <Label>Page Title (SEO)</Label>
                      <Input
                        value={metaTitle}
                        onChange={(e) => setMetaTitle(e.target.value)}
                        placeholder="Enter page title"
                      />
                    </div>
                    <div>
                      <Label>Meta Description</Label>
                      <Input
                        value={metaDescription}
                        onChange={(e) => setMetaDescription(e.target.value)}
                        placeholder="Enter description"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Center - Canvas */}
          <div className="col-span-9 bg-muted/30 rounded-lg p-8 flex justify-center">
            <div
              style={{ width: viewportWidths[viewportMode], maxWidth: "100%" }}
              className="bg-background rounded-lg shadow-lg min-h-[600px] p-8 transition-all duration-300"
            >
              {blocks.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Drag blocks here to start building</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {blocks.map((block, index) => (
                    <div key={index} className="border rounded p-4">
                      Block {index + 1}: {block.type}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
