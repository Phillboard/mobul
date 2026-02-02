import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { callEdgeFunction } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Save, FolderOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface DraftManagerProps {
  clientId: string;
  onLoadDraft: (draft: any) => void;
  currentFormData?: any;
  currentStep?: number;
}

export function DraftManager({
  clientId,
  onLoadDraft,
  currentFormData,
  currentStep,
}: DraftManagerProps) {
  const queryClient = useQueryClient();

  const { data: drafts, isLoading } = useQuery({
    queryKey: ["campaign-drafts", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_drafts")
        .select("*")
        .eq("client_id", clientId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const data = await callEdgeFunction(
        Endpoints.campaigns.saveDraft,
        {
          clientId,
          draftName: `Draft ${new Date().toLocaleDateString()}`,
          formData: currentFormData,
          currentStep: currentStep || 1,
        }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-drafts"] });
      toast.success("Draft saved successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save draft: ${error.message}`);
    },
  });

  const deleteDraftMutation = useMutation({
    mutationFn: async (draftId: string) => {
      const { error } = await supabase
        .from("campaign_drafts")
        .delete()
        .eq("id", draftId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-drafts"] });
      toast.success("Draft deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete draft: ${error.message}`);
    },
  });

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => saveDraftMutation.mutate()}
        disabled={saveDraftMutation.isPending || !currentFormData}
      >
        <Save className="h-4 w-4 mr-2" />
        Save Draft
      </Button>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <FolderOpen className="h-4 w-4 mr-2" />
            Load Draft
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Campaign Draft</DialogTitle>
            <DialogDescription>
              Select a draft to continue editing
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {isLoading && <p className="text-sm text-muted-foreground">Loading drafts...</p>}
            
            {drafts && drafts.length === 0 && (
              <p className="text-sm text-muted-foreground">No drafts found</p>
            )}

            {drafts?.map((draft) => (
              <div
                key={draft.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-all duration-200"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{draft.draft_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDistanceToNow(new Date(draft.updated_at))} ago
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Step {draft.current_step} of 2
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      onLoadDraft({
                        formData: draft.form_data_json,
                        step: draft.current_step,
                        draftId: draft.id,
                      });
                    }}
                  >
                    Load
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteDraftMutation.mutate(draft.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
