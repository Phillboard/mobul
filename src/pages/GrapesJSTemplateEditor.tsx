import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import StudioEditor from "@grapesjs/studio-sdk/react";
import { 
  tableComponent, 
  fsLightboxComponent, 
  lightGalleryComponent, 
  swiperComponent, 
  iconifyComponent, 
  accordionComponent, 
  flexComponent, 
  rteProseMirror, 
  canvasFullSize, 
  canvasEmptyState, 
  canvasGridMode, 
  layoutSidebarButtons, 
  youtubeAssetProvider 
} from '@grapesjs/studio-sdk-plugins';
import "@grapesjs/studio-sdk/style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";

export default function GrapesJSTemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentClient } = useTenant();
  const [templateName, setTemplateName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [projectData, setProjectData] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  
  useEffect(() => {
    if (id !== "new") {
      loadTemplate();
    } else {
      setIsLoading(false);
      setProjectData({
        pages: [{
          name: "Front",
          component: '<div style="padding: 60px 20px; text-align: center;"><h1>Start Building Your Template</h1><p>Drag and drop blocks from the left to get started</p></div>'
        }]
      });
    }
  }, [id]);
  
  const loadTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      
      setTemplate(data);
      setTemplateName(data.name);
      
      if (data.json_layers && typeof data.json_layers === 'object') {
        const jsonData = data.json_layers as any;
        // Convert old json_layers format to GrapeJS format if needed
        if (jsonData.pages) {
          setProjectData({ pages: jsonData.pages });
        } else if (jsonData.html || jsonData.layers) {
          // Legacy format - create new page
          setProjectData({
            pages: [{
              name: "Front",
              component: jsonData.html || '<div style="padding: 40px;"><h1>Template Front</h1></div>'
            }]
          });
        } else {
          // Empty or unknown format
          setProjectData({
            pages: [{
              name: "Front",
              component: '<div style="padding: 40px;"><h1>Template Front</h1></div>'
            }]
          });
        }
      } else {
        // No existing data
        setProjectData({
          pages: [{
            name: "Front",
            component: '<div style="padding: 40px;"><h1>Template Front</h1></div>'
          }]
        });
      }
      
      setIsLoading(false);
    } catch (error: any) {
      console.error("Load error:", error);
      toast.error("Failed to load template");
      navigate("/templates");
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
          <Button variant="ghost" size="sm" onClick={() => navigate("/templates")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="max-w-md"
            placeholder="Template name"
          />
        </div>
      </div>
      
      {/* Studio Editor */}
      <div className="flex-1 overflow-hidden">
        <StudioEditor
          onEditor={(editor) => {
            // Add custom direct mail blocks
            editor.Blocks.add('postcard-hero', {
              label: '📬 Postcard Hero',
              category: 'Direct Mail',
              content: `
                <section style="background: linear-gradient(135deg, #3b82f6, #f59e0b); padding: 60px 40px; text-align: center; color: white;">
                  <h1 style="font-size: 42px; font-weight: bold; margin-bottom: 12px;">Special Offer Inside</h1>
                  <p style="font-size: 20px; margin-bottom: 24px; opacity: 0.95;">Act Now and Save Big!</p>
                  <div style="background: rgba(255,255,255,0.25); border-radius: 8px; padding: 20px; max-width: 350px; margin: 0 auto;">
                    <p style="font-size: 16px; font-weight: 600;">Limited Time Only</p>
                  </div>
                </section>
              `
            });
            
            editor.Blocks.add('offer-box', {
              label: '💰 Offer Box',
              category: 'Direct Mail',
              content: `
                <section style="padding: 50px 30px; background: #f9fafb;">
                  <div style="max-width: 450px; margin: 0 auto; text-align: center;">
                    <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 3px solid #3b82f6;">
                      <div style="background: #3b82f6; color: white; padding: 12px; border-radius: 8px; margin-bottom: 20px;">
                        <h2 style="font-size: 28px; font-weight: bold; margin: 0;">EXCLUSIVE OFFER</h2>
                      </div>
                      <p style="font-size: 20px; font-weight: 600; color: #1f2937; margin-bottom: 16px;">Get 25% Off Your First Order</p>
                      <p style="color: #6b7280; font-size: 16px;">Use code: WELCOME25</p>
                    </div>
                  </div>
                </section>
              `
            });
            
            editor.Blocks.add('coupon-code', {
              label: '🎟️ Coupon Code',
              category: 'Direct Mail',
              content: `
                <section style="padding: 40px 30px; background: #ffffff; text-align: center;">
                  <div style="max-width: 400px; margin: 0 auto; border: 3px dashed #f59e0b; border-radius: 12px; padding: 24px; background: #fffbeb;">
                    <p style="font-size: 14px; color: #92400e; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Promotional Code</p>
                    <div style="background: white; padding: 16px 24px; border-radius: 8px; border: 2px solid #f59e0b; margin-bottom: 12px;">
                      <p style="font-size: 32px; font-weight: bold; color: #1f2937; margin: 0; letter-spacing: 2px;">SAVE25</p>
                    </div>
                    <p style="font-size: 12px; color: #78716c;">Valid until {{expiration_date}}</p>
                  </div>
                </section>
              `
            });
            
            editor.Blocks.add('qr-code-section', {
              label: '📱 QR Code Section',
              category: 'Direct Mail',
              content: `
                <section style="padding: 50px 30px; background: #f3f4f6; text-align: center;">
                  <h3 style="font-size: 24px; font-weight: 600; margin-bottom: 16px; color: #1f2937;">Scan to Learn More</h3>
                  <div style="width: 200px; height: 200px; margin: 0 auto; background: white; border: 4px solid #e5e7eb; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                    <p style="color: #9ca3af; font-size: 14px;">QR Code Placeholder<br/>{{qr_code}}</p>
                  </div>
                  <p style="margin-top: 16px; color: #6b7280; font-size: 14px;">Or visit: {{website_url}}</p>
                </section>
              `
            });
            
            editor.Blocks.add('contact-cta', {
              label: '☎️ Contact CTA',
              category: 'Direct Mail',
              content: `
                <section style="padding: 50px 30px; background: #1f2937; color: white; text-align: center;">
                  <h2 style="font-size: 32px; font-weight: bold; margin-bottom: 16px;">Ready to Get Started?</h2>
                  <p style="font-size: 18px; margin-bottom: 24px; opacity: 0.9;">Contact us today for your free consultation</p>
                  <div style="display: flex; flex-direction: column; gap: 12px; align-items: center;">
                    <p style="font-size: 24px; font-weight: 600; color: #f59e0b;">📞 {{phone_number}}</p>
                    <p style="font-size: 18px; opacity: 0.8;">📧 {{email_address}}</p>
                  </div>
                </section>
              `
            });

            editor.Blocks.add('two-column-layout', {
              label: '📋 Two Columns',
              category: 'Direct Mail',
              content: `
                <section style="padding: 40px 30px; background: #ffffff;">
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; max-width: 800px; margin: 0 auto;">
                    <div style="padding: 24px; background: #f9fafb; border-radius: 8px;">
                      <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 12px; color: #1f2937;">Feature 1</h3>
                      <p style="color: #6b7280; line-height: 1.6;">Add your compelling feature description here.</p>
                    </div>
                    <div style="padding: 24px; background: #f9fafb; border-radius: 8px;">
                      <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 12px; color: #1f2937;">Feature 2</h3>
                      <p style="color: #6b7280; line-height: 1.6;">Add your compelling feature description here.</p>
                    </div>
                  </div>
                </section>
              `
            });
          }}
          options={{
            licenseKey: 'e51103aea79d4996862a09ca57bc474f1ec98090f4a546cca71856f08de9244f',
            theme: 'light',
            project: {
              type: 'web',
              default: projectData
            },
            storage: {
              type: 'self',
              onSave: async ({ project }) => {
                if (!templateName.trim() || !currentClient) {
                  toast.error("Please enter a template name");
                  return;
                }

                try {
                  // Generate thumbnail by taking screenshot of first page
                  let thumbnailUrl = template?.thumbnail_url;
                  
                  const templateData: any = {
                    name: templateName,
                    client_id: currentClient.id,
                    json_layers: project,
                    updated_at: new Date().toISOString()
                  };

                  // Preserve existing fields if updating
                  if (id && id !== "new" && template) {
                    templateData.size = template.size;
                    templateData.industry_vertical = template.industry_vertical;
                  } else {
                    // Default values for new templates
                    templateData.size = "4x6";
                    templateData.industry_vertical = "general";
                  }

                  if (id && id !== "new") {
                    const { error } = await supabase
                      .from("templates")
                      .update(templateData)
                      .eq("id", id);
                    if (error) throw error;
                    toast.success("Template saved!");
                  } else {
                    const { data, error } = await supabase
                      .from("templates")
                      .insert([templateData])
                      .select()
                      .single();
                    if (error) throw error;
                    toast.success("Template created!");
                    navigate(`/template-builder/${data.id}`, { replace: true });
                  }
                } catch (error: any) {
                  console.error("Save error:", error);
                  toast.error("Failed to save template");
                  throw error;
                }
              },
              onLoad: async () => {
                return { project: projectData };
              },
              autosaveChanges: 100,
              autosaveIntervalMs: 10000
            },
            plugins: [
              tableComponent.init({}),
              fsLightboxComponent.init({}),
              lightGalleryComponent.init({}),
              swiperComponent.init({}),
              iconifyComponent.init({}),
              accordionComponent.init({}),
              flexComponent.init({}),
              rteProseMirror.init({}),
              canvasFullSize.init({}),
              canvasEmptyState.init({}),
              canvasGridMode.init({}),
              layoutSidebarButtons.init({}),
              youtubeAssetProvider.init({})
            ]
          }}
        />
      </div>
    </div>
  );
}
