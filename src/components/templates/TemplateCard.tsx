import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Star, Edit, Copy, Trash2, Palette, Check, Sparkles } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EditTemplateDialog } from "./EditTemplateDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface TemplateCardProps {
  template: any;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

const sizeLabels: Record<string, string> = {
  "4x6": "4×6 Postcard",
  "6x9": "6×9 Postcard",
  "6x11": "6×11 Postcard",
  letter: "Letter (#10)",
  trifold: "Tri-fold Self-Mailer",
};

const industryLabels: Record<string, string> = {
  roofing: "Roofing",
  rei: "Real Estate Investment",
  auto_service: "Auto Service",
  auto_warranty: "Auto Warranty",
  auto_buyback: "Auto Buyback",
};

export function TemplateCard({ template, isSelected, onToggleSelect }: TemplateCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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
    onError: (error) => {
      toast.error("Failed to update favorite status");
      console.error(error);
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
      toast.success("Template duplicated successfully");
    },
    onError: (error) => {
      toast.error("Failed to duplicate template");
      console.error(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Delete thumbnail from storage if exists
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
      toast.success("Template deleted successfully");
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to delete template");
      console.error(error);
    },
  });

  return (
    <>
      <Card className={`overflow-hidden group hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-2 border-border/50 hover:border-primary/30 animate-scale-in ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}>
        <div 
          className="relative aspect-[3/4] bg-muted overflow-hidden cursor-pointer"
          onClick={(e) => {
            if (e.shiftKey || e.ctrlKey || e.metaKey) {
              onToggleSelect(template.id);
            } else if (template.thumbnail_url) {
              setPreviewOpen(true);
            }
          }}
        >
          {/* Selection indicator */}
          <div
            className={`absolute top-3 left-3 z-10 w-6 h-6 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
              isSelected
                ? "bg-primary border-primary"
                : "bg-background/80 border-border opacity-0 group-hover:opacity-100"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(template.id);
            }}
          >
            {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
          </div>
          {template.thumbnail_url ? (
            <>
              <img
                src={template.thumbnail_url}
                alt={template.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="text-primary-foreground bg-primary/90 px-4 py-2 rounded-lg font-medium text-sm backdrop-blur-sm">
                  Click to preview
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-gradient-to-br from-muted to-muted/50">
              <div className="text-center space-y-2">
                <Palette className="h-12 w-12 mx-auto opacity-30" />
                <p className="text-sm">No preview</p>
              </div>
            </div>
          )}
          <div className="absolute top-3 right-3 flex gap-2">
            <Button
              size="icon"
              variant={template.is_favorite ? "default" : "secondary"}
              className={`transition-all duration-300 ${
                template.is_favorite 
                  ? "opacity-100 scale-100" 
                  : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100"
              } shadow-lg hover:scale-110`}
              onClick={() => toggleFavoriteMutation.mutate()}
            >
              <Star
                className={`h-4 w-4 transition-all ${
                  template.is_favorite ? "fill-current animate-pulse" : ""
                }`}
              />
            </Button>
          </div>
        </div>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                {template.name}
              </h3>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {sizeLabels[template.size]}
                </Badge>
                {template.industry_vertical && (
                  <Badge variant="outline" className="text-xs">
                    {industryLabels[template.industry_vertical]}
                  </Badge>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background z-50">
                <DropdownMenuItem onClick={() => navigate(`/templates/${template.id}/ai-editor`)}>
                  <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                  Edit with AI Chat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => duplicateMutation.mutate()}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button 
            className="w-full transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/20" 
            size="sm"
            onClick={() => navigate(`/template-builder/${template.id}`)}
          >
            <Palette className="mr-2 h-4 w-4" />
            Design Template
          </Button>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-xl">{template.name}</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            {template.thumbnail_url ? (
              <div className="relative bg-muted rounded-lg overflow-hidden">
                <img
                  src={template.thumbnail_url}
                  alt={template.name}
                  className="w-full h-auto max-h-[70vh] object-contain animate-scale-in"
                />
              </div>
            ) : (
              <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">No preview available</p>
              </div>
            )}
            <div className="flex gap-2 mt-4 flex-wrap">
              <Badge variant="secondary">{sizeLabels[template.size]}</Badge>
              {template.industry_vertical && (
                <Badge variant="outline">
                  {industryLabels[template.industry_vertical]}
                </Badge>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EditTemplateDialog
        template={template}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{template.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
