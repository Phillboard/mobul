import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import grapesjs, { Editor } from "grapesjs";
import gjsBasicBlocks from "grapesjs-blocks-basic";
import { mailGrapesJSConfig } from "@/config/grapesjs-mail.config";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Eye, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MailDesigner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef<Editor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: mailPiece, isLoading } = useQuery({
    queryKey: ["mail", id],
    queryFn: async () => {
      if (id === "new") return null;
      
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ html, css, json_layers }: { html: string; css: string; json_layers: any }) => {
      if (!editorRef.current) return;

      // Skip thumbnail generation for now
      const dataUrl = "";

      if (id === "new" || !mailPiece) {
        const { data: newMail, error: insertError } = await supabase
          .from("templates")
          .insert({
            name: "Untitled Mail Piece",
            client_id: mailPiece?.client_id || "",
            size: "4x6",
            html_content: html,
            css_content: css,
            json_layers,
            thumbnail_url: dataUrl,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newMail;
      }

      const { error: updateError } = await supabase
        .from("templates")
        .update({
          html_content: html,
          css_content: css,
          json_layers,
          thumbnail_url: dataUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) throw updateError;
      return mailPiece;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["mail"] });
      queryClient.invalidateQueries({ queryKey: ["mail", id] });
      toast.success("Mail piece saved successfully");
      if (id === "new" && data) {
        navigate(`/mail-designer/${data.id}`, { replace: true });
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const handleSave = async () => {
    if (!editorRef.current) return;
    
    setIsSaving(true);
    try {
      const html = editorRef.current.getHtml();
      const css = editorRef.current.getCss();
      const json_layers = editorRef.current.getProjectData();
      
      await saveMutation.mutateAsync({ html, css, json_layers });
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!containerRef.current || editorRef.current) return;

    const editor = grapesjs.init({
      ...mailGrapesJSConfig,
      container: containerRef.current,
      plugins: [gjsBasicBlocks],
      storageManager: false,
    });

    if (mailPiece?.json_layers) {
      try {
        const projectData = typeof mailPiece.json_layers === 'string' 
          ? JSON.parse(mailPiece.json_layers)
          : mailPiece.json_layers;
        editor.loadProjectData(projectData);
      } catch (error) {
        console.error("Failed to load project data:", error);
      }
    }

    editorRef.current = editor;

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [mailPiece]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading mail designer...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <div className="border-b bg-card p-3 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/mail")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Mail Library
          </Button>
          <div className="text-sm font-medium">
            {mailPiece?.name || "New Mail Piece"}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* GrapesJS Editor */}
      <div ref={containerRef} className="flex-1" />
    </div>
  );
}
