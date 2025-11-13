import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const AVAILABLE_EVENTS = [
  { id: "mail.batch_status.changed", label: "Mail Batch Status Changed" },
  { id: "mail.delivered", label: "Mail Delivered" },
  { id: "mail.failed", label: "Mail Failed" },
  { id: "dm.qr_scanned", label: "QR Code Scanned" },
  { id: "dm.purl_visited", label: "PURL Visited" },
  { id: "dm.conversion.recorded", label: "Conversion Recorded" },
  { id: "dm.lead_submitted", label: "Lead Submitted" },
];

interface CreateWebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateWebhook: (webhook: {
    name: string;
    url: string;
    events: string[];
  }) => Promise<void>;
}

export function CreateWebhookDialog({
  open,
  onOpenChange,
  onCreateWebhook,
}: CreateWebhookDialogProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !url.trim() || selectedEvents.length === 0) return;

    setIsCreating(true);
    try {
      await onCreateWebhook({ name, url, events: selectedEvents });
      handleClose();
    } finally {
      setIsCreating(false);
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
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Webhook</DialogTitle>
          <DialogDescription>
            Configure a webhook endpoint to receive real-time event notifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-name">Webhook Name</Label>
            <Input
              id="webhook-name"
              placeholder="e.g., Production Webhook"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook-url">Endpoint URL</Label>
            <Input
              id="webhook-url"
              placeholder="https://your-domain.com/webhooks/ace"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Events to Subscribe</Label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {AVAILABLE_EVENTS.map((event) => (
                <div key={event.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={event.id}
                    checked={selectedEvents.includes(event.id)}
                    onCheckedChange={() => toggleEvent(event.id)}
                  />
                  <label
                    htmlFor={event.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {event.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || !url.trim() || selectedEvents.length === 0 || isCreating}
          >
            {isCreating ? "Creating..." : "Create Webhook"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
