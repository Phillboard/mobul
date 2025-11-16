import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import StudioEditor from "@grapesjs/studio-sdk/react";
import "@grapesjs/studio-sdk/style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";

export default function GrapesJSLandingPageEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentClient } = useTenant();
  const [pageName, setPageName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initialPages, setInitialPages] = useState<any[]>([]);
  const editorRef = useRef<any>(null);
  
  useEffect(() => {
    if (id !== "new") {
      loadPage();
    } else {
      setIsLoading(false);
      // Default empty page
      setInitialPages([{
        name: "Home",
        component: '<div style="padding: 60px 20px; text-align: center;"><h1>Start Building Your Landing Page</h1><p>Drag and drop blocks from the left to get started</p></div>'
      }]);
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
      setSlug(data.slug);
      
      // Load existing content
      if (data.content_json && typeof data.content_json === 'object' && !Array.isArray(data.content_json)) {
        const contentData = data.content_json as { html?: string; pages?: any[] };
        if (contentData.pages) {
          setInitialPages(contentData.pages);
        } else if (contentData.html) {
          setInitialPages([{
            name: "Home",
            component: contentData.html
          }]);
        }
      }
      
      setIsLoading(false);
    } catch (error: any) {
      console.error("Load error:", error);
      toast.error("Failed to load landing page");
      navigate("/landing-pages");
    }
  };
  
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };
  
  const handleNameChange = (value: string) => {
    setPageName(value);
    if (id === "new") {
      setSlug(generateSlug(value));
    }
  };
  
  const handleSave = async () => {
    if (!pageName.trim() || !currentClient || !editorRef.current) {
      toast.error("Please enter a page name");
      return;
    }
    
    setIsSaving(true);
    try {
      const editor = editorRef.current;
      
      // Get all pages and their content
      const pages = editor.Pages.getAll().map((page: any) => ({
        name: page.getName(),
        component: page.getMainComponent().toHTML()
      }));
      
      const pageData = {
        name: pageName,
        slug: slug || generateSlug(pageName),
        client_id: currentClient.id,
        editor_type: 'visual',
        content_json: {
          pages,
          html: pages[0]?.component || ''
        }
      };
      
      if (id && id !== "new") {
        const { error } = await supabase
          .from("landing_pages")
          .update(pageData)
          .eq("id", id);
        if (error) throw error;
        toast.success("Landing page updated!");
      } else {
        const { data, error } = await supabase
          .from("landing_pages")
          .insert([pageData])
          .select()
          .single();
        if (error) throw error;
        toast.success("Landing page created!");
        navigate(`/landing-pages/${data.id}/visual-editor`);
      }
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Failed to save landing page");
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading editor...</p>
      </div>
    );
  }
  
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <div className="border-b bg-card p-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/landing-pages")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Input
            value={pageName}
            onChange={(e) => handleNameChange(e.target.value)}
            className="max-w-md"
            placeholder="Page name"
          />
        </div>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
      
      {/* Studio Editor */}
      <div className="flex-1 overflow-hidden">
        <StudioEditor
          onEditor={(editor) => {
            editorRef.current = editor;
            
            // Add custom gift card blocks
            editor.Blocks.add('gift-card-hero', {
              label: '🎉 Gift Card Hero',
              category: 'Gift Card',
              content: `
                <section style="background: linear-gradient(135deg, #3b82f6, #f59e0b); padding: 80px 20px; text-align: center; color: white;">
                  <h1 style="font-size: 48px; font-weight: bold; margin-bottom: 16px;">Thank You!</h1>
                  <p style="font-size: 24px; margin-bottom: 32px; opacity: 0.9;">Here's Your $25 Gift Card Reward</p>
                  <div style="background: rgba(255,255,255,0.2); border-radius: 12px; padding: 24px; max-width: 400px; margin: 0 auto; backdrop-filter: blur(10px);">
                    <p style="font-size: 18px;">Your reward for taking action with us</p>
                  </div>
                </section>
              `
            });
            
            editor.Blocks.add('gift-card-form', {
              label: '🎁 Redemption Form',
              category: 'Gift Card',
              content: `
                <section style="padding: 60px 20px; background: #f9fafb;">
                  <div style="max-width: 500px; margin: 0 auto; text-align: center;">
                    <h2 style="font-size: 32px; font-weight: bold; margin-bottom: 24px; color: #1f2937;">Claim Your Reward</h2>
                    <div style="background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                      <input 
                        type="text" 
                        placeholder="Enter your gift card code" 
                        style="width: 100%; padding: 16px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 18px; margin-bottom: 16px;"
                      />
                      <button 
                        type="submit" 
                        style="width: 100%; padding: 16px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 18px; font-weight: 600; cursor: pointer;"
                      >
                        Redeem Now
                      </button>
                    </div>
                  </div>
                </section>
              `
            });
            
            editor.Blocks.add('benefits-grid', {
              label: '✨ Benefits Grid',
              category: 'Gift Card',
              content: `
                <section style="padding: 60px 20px; background: #ffffff;">
                  <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px;">
                    <div style="background: #f9fafb; padding: 32px; border-radius: 8px; text-align: center;">
                      <div style="font-size: 48px; margin-bottom: 16px;">🛡️</div>
                      <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px; color: #1f2937;">Protected</h3>
                      <p style="color: #6b7280;">Industry-leading security</p>
                    </div>
                    <div style="background: #f9fafb; padding: 32px; border-radius: 8px; text-align: center;">
                      <div style="font-size: 48px; margin-bottom: 16px;">⚡</div>
                      <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px; color: #1f2937;">Fast</h3>
                      <p style="color: #6b7280;">Instant delivery</p>
                    </div>
                    <div style="background: #f9fafb; padding: 32px; border-radius: 8px; text-align: center;">
                      <div style="font-size: 48px; margin-bottom: 16px;">💯</div>
                      <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px; color: #1f2937;">Trusted</h3>
                      <p style="color: #6b7280;">Thousands of happy customers</p>
                    </div>
                  </div>
                </section>
              `
            });
          }}
          options={{
            licenseKey: '', // Studio SDK requires a license key - get one at https://grapesjs.com/studio-sdk
            project: {
              type: 'web',
              default: {
                pages: initialPages
              }
            }
          }}
        />
      </div>
    </div>
  );
}
