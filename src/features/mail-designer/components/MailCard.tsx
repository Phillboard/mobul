import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { MoreVertical, Star, Edit, Copy, Trash2, Palette, Check } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { toast } from "sonner";
import { EditMailDialog } from "./EditMailDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";

interface MailCardProps {
  mailPiece: any;
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

export function MailCard({ mailPiece, isSelected, onToggleSelect }: MailCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("templates")
        .update({ is_favorite: !mailPiece.is_favorite })
        .eq("id", mailPiece.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mail"] });
      toast.success(
        mailPiece.is_favorite ? "Removed from favorites" : "Added to favorites"
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
        name: `${mailPiece.name} (Copy)`,
        client_id: mailPiece.client_id,
        size: mailPiece.size,
        industry_vertical: mailPiece.industry_vertical,
        thumbnail_url: mailPiece.thumbnail_url,
        json_layers: mailPiece.json_layers,
        is_favorite: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mail"] });
      toast.success("Mail piece duplicated successfully");
    },
    onError: (error) => {
      toast.error("Failed to duplicate mail piece");
      console.error(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Delete thumbnail from storage if exists
      if (mailPiece.thumbnail_url) {
        const path = mailPiece.thumbnail_url.split("/").pop();
        if (path) {
          await supabase.storage.from("template-thumbnails").remove([path]);
        }
      }

      const { error } = await supabase
        .from("templates")
        .delete()
        .eq("id", mailPiece.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mail"] });
      toast.success("Mail piece deleted successfully");
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to delete mail piece");
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
              onToggleSelect(mailPiece.id);
            } else if (mailPiece.thumbnail_url) {
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
              onToggleSelect(mailPiece.id);
            }}
          >
            {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
          </div>
          {mailPiece.thumbnail_url ? (
            <>
              <img
                src={mailPiece.thumbnail_url}
                alt={mailPiece.name}
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
              variant={mailPiece.is_favorite ? "default" : "secondary"}
              className={`transition-all duration-300 ${
                mailPiece.is_favorite 
                  ? "opacity-100 scale-100" 
                  : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100"
              } shadow-lg hover:scale-110`}
              onClick={() => toggleFavoriteMutation.mutate()}
            >
              <Star
                className={`h-4 w-4 transition-all ${
                  mailPiece.is_favorite ? "fill-current animate-pulse" : ""
                }`}
              />
            </Button>
          </div>
        </div>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                {mailPiece.name}
              </h3>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {sizeLabels[mailPiece.size]}
                </Badge>
                {mailPiece.industry_vertical && (
                  <Badge variant="outline" className="text-xs">
                    {industryLabels[mailPiece.industry_vertical]}
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
            onClick={() => navigate(`/mail-designer/${mailPiece.id}`)}
          >
            <Palette className="mr-2 h-4 w-4" />
            Design Mail Piece
          </Button>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-xl">{mailPiece.name}</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            {mailPiece.thumbnail_url ? (
              <div className="relative bg-muted rounded-lg overflow-hidden">
                <img
                  src={mailPiece.thumbnail_url}
                  alt={mailPiece.name}
                  className="w-full h-auto max-h-[70vh] object-contain animate-scale-in"
                />
              </div>
            ) : (
              <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">No preview available</p>
              </div>
            )}
            <div className="flex gap-2 mt-4 flex-wrap">
              <Badge variant="secondary">{sizeLabels[mailPiece.size]}</Badge>
              {mailPiece.industry_vertical && (
                <Badge variant="outline">
                  {industryLabels[mailPiece.industry_vertical]}
                </Badge>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EditMailDialog
        mailPiece={mailPiece}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Mail Piece</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{mailPiece.name}"? This action cannot be
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