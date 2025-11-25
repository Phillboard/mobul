import { Button } from "@/components/ui/button";
import { Copy, Star, Trash2, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BulkActionsProps {
  selectedIds: string[];
  mailPieces: any[];
  onClearSelection: () => void;
}

export function BulkActions({ selectedIds, mailPieces, onClearSelection }: BulkActionsProps) {
  const queryClient = useQueryClient();

  const bulkFavoriteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("templates")
        .update({ is_favorite: true })
        .in("id", selectedIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mail"] });
      toast.success(`${selectedIds.length} mail pieces marked as favorite`);
      onClearSelection();
    },
    onError: () => {
      toast.error("Failed to update mail pieces");
    },
  });

  const bulkDuplicateMutation = useMutation({
    mutationFn: async () => {
      const mailToDuplicate = mailPieces.filter((t) => selectedIds.includes(t.id));
      
      const duplicates = mailToDuplicate.map((t) => ({
        name: `${t.name} (Copy)`,
        client_id: t.client_id,
        size: t.size,
        industry_vertical: t.industry_vertical,
        thumbnail_url: t.thumbnail_url,
        json_layers: t.json_layers,
        is_favorite: false,
      }));

      const { error } = await supabase.from("templates").insert(duplicates);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mail"] });
      toast.success(`${selectedIds.length} mail pieces duplicated`);
      onClearSelection();
    },
    onError: () => {
      toast.error("Failed to duplicate mail pieces");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("templates")
        .delete()
        .in("id", selectedIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mail"] });
      toast.success(`${selectedIds.length} mail pieces deleted`);
      onClearSelection();
    },
    onError: () => {
      toast.error("Failed to delete mail pieces");
    },
  });

  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border shadow-2xl rounded-lg p-4 flex items-center gap-4 animate-slide-up z-50">
      <div className="flex items-center gap-2">
        <span className="font-semibold">{selectedIds.length} selected</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="h-8 w-px bg-border" />
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => bulkFavoriteMutation.mutate()}
        >
          <Star className="mr-2 h-4 w-4" />
          Favorite
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => bulkDuplicateMutation.mutate()}
        >
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => bulkDeleteMutation.mutate()}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}
