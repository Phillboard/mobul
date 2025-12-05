import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Zap, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ZapierConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateConnection: (connection: {
    connection_name: string;
    zap_webhook_url: string;
    description?: string;
    trigger_events: string[];
  }) => Promise<void>;
}

const AVAILABLE_EVENTS = [
  { id: "campaign.created", name: "Campaign Created", description: "When a new campaign is created" },
  { id: "campaign.launched", name: "Campaign Launched", description: "When a campaign is sent to production" },
  { id: "campaign.approved", name: "Campaign Approved", description: "When a campaign is approved" },
  { id: "campaign.completed", name: "Campaign Completed", description: "When all mail pieces are delivered" },
  { id: "audience.created", name: "Audience Created", description: "When a new audience is imported" },
  { id: "lead.submitted", name: "Lead Submitted", description: "When a form is submitted via landing page" },
  { id: "lead.qualified", name: "Lead Qualified", description: "When a lead is marked as qualified" },
  { id: "gift_card.redeemed", name: "Gift Card Redeemed", description: "When a recipient redeems a gift card" },
  { id: "gift_card.sent", name: "Gift Card Sent", description: "When a gift card is sent to a recipient" },
  { id: "call.completed", name: "Call Completed", description: "When call disposition is recorded" },
  { id: "call.answered", name: "Call Answered", description: "When recipient answers a call" },
  { id: "condition.met", name: "Condition Met", description: "When a campaign condition is met" },
  { id: "mail.delivered", name: "Mail Delivered", description: "When mail piece is delivered (QR scanned)" },
  { id: "purl.visited", name: "PURL Visited", description: "When PURL landing page is visited" },
];

export function ZapierConnectionDialog({
  open,
  onOpenChange,
  onCreateConnection,
}: ZapierConnectionDialogProps) {
  const [step, setStep] = useState(1);
  const [connectionName, setConnectionName] = useState("");
  const [description, setDescription] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleClose = () => {
    setStep(1);
    setConnectionName("");
    setDescription("");
    setWebhookUrl("");
    setSelectedEvents([]);
    setIsCreating(false);
    onOpenChange(false);
  };

  const handleCreate = async () => {
    if (!connectionName || !webhookUrl || selectedEvents.length === 0) return;

    setIsCreating(true);
    try {
      await onCreateConnection({
        connection_name: connectionName,
        zap_webhook_url: webhookUrl,
        description: description || undefined,
        trigger_events: selectedEvents,
      });
      handleClose();
    } catch (error) {
      console.error("Error creating connection:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const canProceed = () => {
    if (step === 1) return connectionName.trim().length > 0;
    if (step === 2) return webhookUrl.trim().length > 0 && webhookUrl.startsWith("http");
    if (step === 3) return selectedEvents.length > 0;
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Connect to Zapier
          </DialogTitle>
          <DialogDescription>
            Step {step} of 3: {step === 1 ? "Name Your Connection" : step === 2 ? "Configure Webhook" : "Choose Trigger Events"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Connection Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Send leads to Google Sheets"
                  value={connectionName}
                  onChange={(e) => setConnectionName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="What does this Zap do?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <p className="text-sm font-medium">How to get your Zapier Webhook URL:</p>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Go to Zapier and create a new Zap</li>
                      <li>Choose "Webhooks by Zapier" as the trigger</li>
                      <li>Select "Catch Hook" as the event</li>
                      <li>Copy the webhook URL provided by Zapier</li>
                      <li>Paste it below</li>
                    </ol>
                    <Button variant="link" size="sm" className="h-auto p-0" asChild>
                      <a href="https://zapier.com/app/zaps" target="_blank" rel="noopener noreferrer">
                        Open Zapier <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook">Zapier Webhook URL *</Label>
                <Input
                  id="webhook"
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                {webhookUrl && !webhookUrl.startsWith("http") && (
                  <p className="text-sm text-destructive">Please enter a valid URL</p>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Select Events to Trigger This Zap *</Label>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEvents(AVAILABLE_EVENTS.map(e => e.id))}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEvents([])}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-[400px] rounded-lg border p-4">
                <div className="space-y-4">
                  {AVAILABLE_EVENTS.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => toggleEvent(event.id)}
                    >
                      <Checkbox
                        id={event.id}
                        checked={selectedEvents.includes(event.id)}
                        onCheckedChange={() => toggleEvent(event.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 space-y-1">
                        <Label
                          htmlFor={event.id}
                          className="font-medium cursor-pointer"
                        >
                          {event.name}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {event.description}
                        </p>
                      </div>
                      {selectedEvents.includes(event.id) && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-sm text-muted-foreground">
                Selected {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between">
          <div>
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={isCreating}
              >
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isCreating}>
              Cancel
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Next
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={!canProceed() || isCreating}>
                {isCreating ? "Creating..." : "Create Connection"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
