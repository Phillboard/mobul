import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import grapesjs from "grapesjs";
import gjsPresetWebpage from "grapesjs-preset-webpage";
import gjsBlocksBasic from "grapesjs-blocks-basic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Eye, Monitor, Tablet, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";

export default function GrapesJSLandingPageEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentClient } = useTenant();
  const editorRef = useRef<any>(null);
  const [pageName, setPageName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (id !== "new") {
      loadPage();
    } else {
      setIsLoading(false);
    }
    
    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
      }
    };
  }, [id]);
  
  useEffect(() => {
    if (!isLoading) {
      initializeEditor();
    }
  }, [isLoading]);
  
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
      setIsLoading(false);
    } catch (error: any) {
      toast.error("Failed to load landing page");
      navigate("/landing-pages");
    }
  };
  
  const initializeEditor = async () => {
    // Load existing content if editing
    let existingHtml = "";
    let existingCss = "";
    let existingComponents = null;
    
    if (id !== "new") {
      try {
        const { data } = await supabase
          .from("landing_pages")
          .select("content_json")
          .eq("id", id)
          .single();
        
        if (data?.content_json && typeof data.content_json === 'object' && !Array.isArray(data.content_json)) {
          const contentData = data.content_json as { html?: string; css?: string; components?: any };
          existingHtml = contentData.html || "";
          existingCss = contentData.css || "";
          existingComponents = contentData.components;
        }
      } catch (error) {
        console.error("Failed to load page content:", error);
      }
    }
    
    const editor = grapesjs.init({
      container: "#gjs",
      plugins: [gjsPresetWebpage, gjsBlocksBasic],
      pluginsOpts: {
        gjsPresetWebpage: {
          blocks: ['text', 'link', 'image', 'video', 'map']
        }
      },
      storageManager: false,
      canvas: {
        styles: [
          'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
        ]
      },
      // Disable default color theme
      colorPicker: {
        appendTo: 'parent',
        offset: { top: 26, left: -166 },
      },
      assetManager: {
        embedAsBase64: false,
      },
      blockManager: {
        appendTo: '.blocks-container',
      },
      styleManager: {
        appendTo: '.styles-container',
        sectors: [{
          name: 'General',
          open: true,
          properties: ['float', 'display', 'position', 'top', 'right', 'left', 'bottom']
        }, {
          name: 'Dimension',
          open: false,
          properties: ['width', 'height', 'max-width', 'min-height', 'margin', 'padding']
        }, {
          name: 'Typography',
          open: false,
          properties: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'color', 'line-height', 'text-align']
        }, {
          name: 'Decorations',
          open: false,
          properties: ['background-color', 'border-radius', 'border', 'box-shadow', 'background']
        }]
      },
      layerManager: {
        appendTo: '.layers-container'
      },
      deviceManager: {
        devices: [
          { id: 'desktop', name: 'Desktop', width: '' },
          { id: 'tablet', name: 'Tablet', width: '768px' },
          { id: 'mobile', name: 'Mobile', width: '375px' }
        ]
      },
      panels: {
        defaults: []
      }
    });
    
    // Add custom gift card form block
    editor.BlockManager.add('gift-card-form', {
      label: '🎁 Gift Card Form',
      content: `
        <section style="padding: 60px 20px; background: hsl(var(--card));">
          <div style="max-width: 500px; margin: 0 auto; text-align: center;">
            <h2 style="font-size: 32px; font-weight: bold; margin-bottom: 24px; color: hsl(var(--foreground));">Claim Your Reward</h2>
            <div style="background: hsl(var(--muted)); padding: 32px; border-radius: 12px;">
              <input 
                type="text" 
                placeholder="Enter your gift card code" 
                style="width: 100%; padding: 16px; border: 2px solid hsl(var(--border)); border-radius: 8px; font-size: 18px; margin-bottom: 16px; background: hsl(var(--background)); color: hsl(var(--foreground));"
              />
              <button 
                type="submit" 
                style="width: 100%; padding: 16px; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border: none; border-radius: 8px; font-size: 18px; font-weight: 600; cursor: pointer;"
              >
                Redeem Now
              </button>
            </div>
          </div>
        </section>
      `,
      category: 'Forms'
    });
    
    // Add hero section block
    editor.BlockManager.add('hero-gift-card', {
      label: '🎉 Gift Card Hero',
      content: `
        <section style="background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent))); padding: 80px 20px; text-align: center; color: white;">
          <h1 style="font-size: 48px; font-weight: bold; margin-bottom: 16px;">Thank You!</h1>
          <p style="font-size: 24px; margin-bottom: 32px; opacity: 0.9;">Here's Your $25 Gift Card Reward</p>
          <div style="background: rgba(255,255,255,0.2); border-radius: 12px; padding: 24px; max-width: 400px; margin: 0 auto; backdrop-filter: blur(10px);">
            <p style="font-size: 18px;">Your reward for taking action with us</p>
          </div>
        </section>
      `,
      category: 'Sections'
    });
    
    // Add benefits grid block
    editor.BlockManager.add('benefits-grid', {
      label: '✨ Benefits Grid',
      content: `
        <section style="padding: 60px 20px; background: hsl(var(--muted));">
          <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px;">
            <div style="background: hsl(var(--card)); padding: 32px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">🛡️</div>
              <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px; color: hsl(var(--foreground));">Protected</h3>
              <p style="color: hsl(var(--muted-foreground));">Industry-leading security</p>
            </div>
            <div style="background: hsl(var(--card)); padding: 32px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">⚡</div>
              <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px; color: hsl(var(--foreground));">Fast</h3>
              <p style="color: hsl(var(--muted-foreground));">Instant delivery</p>
            </div>
            <div style="background: hsl(var(--card)); padding: 32px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">💯</div>
              <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px; color: hsl(var(--foreground));">Trusted</h3>
              <p style="color: hsl(var(--muted-foreground));">Thousands of happy customers</p>
            </div>
          </div>
        </section>
      `,
      category: 'Sections'
    });
    
    // Load existing content if available
    if (existingComponents) {
      editor.setComponents(existingComponents);
      editor.setStyle(existingCss);
    }
    
    editorRef.current = editor;
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
      const html = editorRef.current.getHtml();
      const css = editorRef.current.getCss();
      const components = editorRef.current.getComponents();
      
      const pageData = {
        name: pageName,
        slug: slug || generateSlug(pageName),
        client_id: currentClient.id,
        editor_type: 'visual',
        content_json: {
          html,
          css,
          components: components.toJSON()
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
  
  const handlePreview = () => {
    if (editorRef.current) {
      editorRef.current.runCommand('preview');
    }
  };
  
  const setDevice = (device: string) => {
    if (editorRef.current) {
      editorRef.current.setDevice(device);
    }
  };
  
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading editor...</p>
      </div>
    );
  }
  
  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="border-b bg-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 mr-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setDevice('desktop')}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setDevice('tablet')}
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setDevice('mobile')}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
      
      {/* Editor Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Blocks */}
        <div className="w-64 border-r bg-card overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold mb-2">Blocks</h3>
            <div className="blocks-container"></div>
          </div>
        </div>
        
        {/* Center Canvas */}
        <div className="flex-1 overflow-hidden">
          <div id="gjs" className="h-full"></div>
        </div>
        
        {/* Right Sidebar - Styles & Layers */}
        <div className="w-80 border-l bg-card overflow-y-auto">
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-2">Styles</h3>
            <div className="styles-container"></div>
          </div>
          <div className="p-4">
            <h3 className="font-semibold mb-2">Layers</h3>
            <div className="layers-container"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
