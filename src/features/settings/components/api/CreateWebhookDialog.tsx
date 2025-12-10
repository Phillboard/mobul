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
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Webhook } from "lucide-react";

interface CreateWebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (webhook: { name: string; url: string; events: string[] }) => Promise<void>;
}

const WEBHOOK_EVENTS = [
  { id: "campaign.created", label: "Campaign Created", description: "When a new campaign is created" },
  { id: "campaign.status_changed", label: "Campaign Status Changed", description: "When campaign status changes" },
  { id: "campaign.mailed", label: "Campaign Mailed", description: "When a campaign is sent to mail" },
  { id: "recipient.created", label: "Recipient Created", description: "When a new recipient is added" },
  { id: "recipient.responded", label: "Recipient Responded", description: "When a recipient responds" },
  { id: "qr.scanned", label: "QR Code Scanned", description: "When a QR code is scanned" },
  { id: "purl.viewed", label: "PURL Viewed", description: "When a personalized URL is viewed" },
  { id: "form.submitted", label: "Form Submitted", description: "When a form is submitted" },
  { id: "gift_card.provisioned", label: "Gift Card Provisioned", description: "When a gift card is provisioned" },
  { id: "gift_card.delivered", label: "Gift Card Delivered", description: "When a gift card is delivered" },
];

export function CreateWebhookDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateWebhookDialogProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim() || selectedEvents.length === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ name, url, events: selectedEvents });
      handleClose();
    } catch (error) {
      console.error("Failed to create webhook:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName("");
    setUrl("");
    setSelectedEvents([]);
    onOpenChange(false);
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((e) => e !== eventId)
        : [...prev, eventId]
    );
  };

  const selectAllEvents = () => {
    setSelectedEvents(WEBHOOK_EVENTS.map((e) => e.id));
  };

  const clearAllEvents = () => {
    setSelectedEvents([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Create Webhook
          </DialogTitle>
          <DialogDescription>
            Configure a webhook to receive real-time event notifications.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-name">Webhook Name</Label>
              <Input
                id="webhook-name"
                placeholder="e.g., My CRM Integration"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-url">Endpoint URL</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://your-server.com/webhook"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Events to Subscribe</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAllEvents}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearAllEvents}
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer"
                    onClick={() => toggleEvent(event.id)}
                  >
                    <Checkbox
                      id={event.id}
                      checked={selectedEvents.includes(event.id)}
                      onCheckedChange={() => toggleEvent(event.id)}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={event.id}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {event.label}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {event.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedEvents.length} event(s) selected
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !name.trim() ||
                !url.trim() ||
                selectedEvents.length === 0 ||
                isSubmitting
              }
            >
              {isSubmitting ? "Creating..." : "Create Webhook"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

