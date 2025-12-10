import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Zap } from "lucide-react";

const ZAPIER_EVENTS = [
  {
    name: "Campaign Created",
    trigger: "campaign.created",
    description: "Fires when a new campaign is created",
    data: ["campaign_id", "name", "status", "client_id", "created_at"],
  },
  {
    name: "Campaign Status Changed",
    trigger: "campaign.status_changed",
    description: "Fires when campaign status changes (draft, scheduled, mailed, completed)",
    data: ["campaign_id", "name", "old_status", "new_status", "updated_at"],
  },
  {
    name: "Recipient Added",
    trigger: "recipient.created",
    description: "Fires when a new recipient is added to a campaign",
    data: ["recipient_id", "campaign_id", "first_name", "last_name", "email", "unique_code"],
  },
  {
    name: "QR Code Scanned",
    trigger: "qr.scanned",
    description: "Fires when a recipient scans their QR code",
    data: ["recipient_id", "campaign_id", "unique_code", "scanned_at", "device_info"],
  },
  {
    name: "PURL Viewed",
    trigger: "purl.viewed",
    description: "Fires when a recipient visits their personalized URL",
    data: ["recipient_id", "campaign_id", "unique_code", "viewed_at", "landing_page_id"],
  },
  {
    name: "Form Submitted",
    trigger: "form.submitted",
    description: "Fires when a recipient submits a form",
    data: ["recipient_id", "campaign_id", "form_id", "form_data", "submitted_at"],
  },
  {
    name: "Gift Card Provisioned",
    trigger: "gift_card.provisioned",
    description: "Fires when a gift card is successfully provisioned",
    data: ["gift_card_id", "recipient_id", "brand", "denomination", "provisioned_at"],
  },
  {
    name: "Gift Card Delivered",
    trigger: "gift_card.delivered",
    description: "Fires when a gift card is delivered to recipient",
    data: ["gift_card_id", "recipient_id", "delivery_method", "delivered_at"],
  },
  {
    name: "Call Completed",
    trigger: "call.completed",
    description: "Fires when a call center call is completed",
    data: ["call_id", "recipient_id", "agent_id", "outcome", "duration", "completed_at"],
  },
  {
    name: "SMS Opt-In Received",
    trigger: "sms.opt_in",
    description: "Fires when a recipient opts in via SMS",
    data: ["recipient_id", "campaign_id", "phone_number", "opted_in_at"],
  },
];

export function ZapierEventsTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            <CardTitle>Zapier Events</CardTitle>
          </div>
          <CardDescription>
            These events are available as triggers in your Zapier integrations. Connect them to
            any of 5000+ apps to automate your workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ZAPIER_EVENTS.map((event) => (
              <div
                key={event.trigger}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold flex items-center gap-2">
                      {event.name}
                      <Badge variant="secondary" className="font-mono text-xs">
                        {event.trigger}
                      </Badge>
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {event.description}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-1">Payload fields:</p>
                  <div className="flex flex-wrap gap-1">
                    {event.data.map((field) => (
                      <code
                        key={field}
                        className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono"
                      >
                        {field}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Using Events in Zapier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">1. Connect Your Account</h4>
            <p className="text-sm text-muted-foreground">
              Search for "ACE Engage" in Zapier and connect using your API key.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">2. Select a Trigger</h4>
            <p className="text-sm text-muted-foreground">
              Choose one of the events above as your trigger to start your automation.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">3. Map Your Data</h4>
            <p className="text-sm text-muted-foreground">
              Use the payload fields to populate data in your connected apps.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

