import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { callEdgeFunction } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Share2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface SharePreviewDialogProps {
  campaignId: string;
}

export function SharePreviewDialog({ campaignId }: SharePreviewDialogProps) {
  const [password, setPassword] = useState("");
  const [expiresInHours, setExpiresInHours] = useState(168); // 7 days
  const [maxViews, setMaxViews] = useState<number | undefined>();
  const [previewUrl, setPreviewUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const createPreviewMutation = useMutation({
    mutationFn: async () => {
      const data = await callEdgeFunction<{ url: string }>(
        Endpoints.campaign.createPreviewLink,
        {
          campaignId,
          password: password || undefined,
          expiresInHours,
          maxViews,
        }
      );

      return data;
    },
    onSuccess: (data) => {
      setPreviewUrl(data.url);
      toast.success("Preview link created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create preview link: ${error.message}`);
    },
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(previewUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied to clipboard");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share Preview
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Campaign Preview</DialogTitle>
          <DialogDescription>
            Create a secure, shareable preview link
          </DialogDescription>
        </DialogHeader>

        {!previewUrl ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password (optional)</Label>
              <Input
                id="password"
                type="password"
                placeholder="Leave empty for no password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires">Expires in (hours)</Label>
              <Input
                id="expires"
                type="number"
                min={1}
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Default: 168 hours (7 days)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxViews">Max views (optional)</Label>
              <Input
                id="maxViews"
                type="number"
                min={1}
                placeholder="Unlimited"
                value={maxViews || ""}
                onChange={(e) =>
                  setMaxViews(e.target.value ? parseInt(e.target.value) : undefined)
                }
              />
            </div>

            <Button
              className="w-full"
              onClick={() => createPreviewMutation.mutate()}
              disabled={createPreviewMutation.isPending}
            >
              {createPreviewMutation.isPending
                ? "Creating..."
                : "Generate Preview Link"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Preview URL</Label>
              <div className="flex gap-2">
                <Input value={previewUrl} readOnly />
                <Button size="icon" onClick={copyToClipboard}>
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {password && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Password:</strong> {password}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Make sure to share this password separately
                </p>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setPreviewUrl("");
                setPassword("");
              }}
            >
              Create Another Link
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
