import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';

interface DeleteCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onConfirm: () => void;
}

export function DeleteCampaignDialog({
  open,
  onOpenChange,
  campaignId,
  onConfirm,
}: DeleteCampaignDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch campaign details
  const { data: campaign } = useQuery({
    queryKey: ["campaign-delete", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          *,
          audiences (
            name,
            valid_count
          )
        `)
        .eq("id", campaignId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && !!campaignId,
  });

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      setConfirmText("");
      onOpenChange(false);
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const canDelete = campaign?.name && confirmText === campaign.name;
  const isDraft = campaign?.status === 'draft';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Delete Campaign</DialogTitle>
              <DialogDescription>
                This action cannot be undone
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {campaign && (
          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> Deleting this campaign will permanently remove:
                <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                  <li>Campaign configuration and settings</li>
                  <li>All reward conditions ({campaign.status === 'draft' ? 'if configured' : 'active'})</li>
                  {campaign.audiences && (
                    <li>
                      Associated audience data ({campaign.audiences.valid_count || 0} recipients)
                    </li>
                  )}
                  <li>Call logs and analytics data</li>
                  <li>Gift card assignments and redemption history</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Campaign Name:</span>
                <span className="font-medium">{campaign.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium capitalize">{campaign.status}</span>
              </div>
              {campaign.audiences && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Recipients:</span>
                  <span className="font-medium">{campaign.audiences.valid_count || 0}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-name">
                Type <strong>{campaign.name}</strong> to confirm deletion
              </Label>
              <Input
                id="confirm-name"
                placeholder={campaign.name}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setConfirmText("");
              onOpenChange(false);
            }}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canDelete || isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

