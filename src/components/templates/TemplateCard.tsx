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
import { MoreVertical, Star, Edit, Copy, Trash2, Palette } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

interface TemplateCardProps {
  template: any;
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

export function TemplateCard({ template }: TemplateCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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
      <Card className="overflow-hidden group hover:shadow-lg transition-shadow">
        <div className="relative aspect-[3/4] bg-muted">
          {template.thumbnail_url ? (
            <img
              src={template.thumbnail_url}
              alt={template.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No preview
            </div>
          )}
          <Button
            size="icon"
            variant={template.is_favorite ? "default" : "secondary"}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => toggleFavoriteMutation.mutate()}
          >
            <Star
              className={`h-4 w-4 ${template.is_favorite ? "fill-current" : ""}`}
            />
          </Button>
        </div>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold line-clamp-1">{template.name}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background z-50">
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
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">{sizeLabels[template.size]}</Badge>
              {template.industry_vertical && (
                <Badge variant="outline">
                  {industryLabels[template.industry_vertical]}
                </Badge>
              )}
            </div>
            <Button 
              className="w-full" 
              size="sm"
              onClick={() => navigate(`/template-builder/${template.id}`)}
            >
              <Palette className="mr-2 h-4 w-4" />
              Design Template
            </Button>
          </div>
        </CardContent>
      </Card>

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
