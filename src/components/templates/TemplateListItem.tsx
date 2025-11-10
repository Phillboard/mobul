import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Star, Palette, Copy, Trash2, Eye } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TemplateListItemProps {
  template: any;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  sizeLabels: Record<string, string>;
  industryLabels: Record<string, string>;
}

export function TemplateListItem({
  template,
  isSelected,
  onToggleSelect,
  sizeLabels,
  industryLabels,
}: TemplateListItemProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("templates")
        .update({ is_favorite: !template.is_favorite })
        .eq("id", template.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success(
        template.is_favorite ? "Removed from favorites" : "Added to favorites"
      );
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("templates").insert({
        name: `${template.name} (Copy)`,
        client_id: template.client_id,
        size: template.size,
        industry_vertical: template.industry_vertical,
        thumbnail_url: template.thumbnail_url,
        json_layers: template.json_layers,
        is_favorite: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template duplicated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (template.thumbnail_url) {
        const path = template.thumbnail_url.split("/").pop();
        if (path) {
          await supabase.storage.from("template-thumbnails").remove([path]);
        }
      }

      const { error } = await supabase
        .from("templates")
        .delete()
        .eq("id", template.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template deleted");
    },
  });

  return (
    <>
      <div className="group flex items-center gap-4 p-4 bg-card border rounded-lg hover:shadow-lg hover:border-primary/30 transition-all">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(template.id)}
        />
        
        <div 
          className="w-24 h-32 bg-muted rounded overflow-hidden flex-shrink-0 cursor-pointer"
          onClick={() => template.thumbnail_url && setPreviewOpen(true)}
        >
          {template.thumbnail_url ? (
            <img
              src={template.thumbnail_url}
              alt={template.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Palette className="h-8 w-8 text-muted-foreground opacity-30" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg mb-2 line-clamp-1">{template.name}</h3>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">{sizeLabels[template.size]}</Badge>
            {template.industry_vertical && (
              <Badge variant="outline">
                {industryLabels[template.industry_vertical]}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant={template.is_favorite ? "default" : "ghost"}
            onClick={() => toggleFavoriteMutation.mutate()}
          >
            <Star
              className={`h-4 w-4 ${template.is_favorite ? "fill-current" : ""}`}
            />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => template.thumbnail_url && setPreviewOpen(true)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => duplicateMutation.mutate()}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => deleteMutation.mutate()}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => navigate(`/template-builder/${template.id}`)}
          >
            <Palette className="mr-2 h-4 w-4" />
            Design
          </Button>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-xl">{template.name}</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            {template.thumbnail_url && (
              <div className="relative bg-muted rounded-lg overflow-hidden">
                <img
                  src={template.thumbnail_url}
                  alt={template.name}
                  className="w-full h-auto max-h-[70vh] object-contain animate-scale-in"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
