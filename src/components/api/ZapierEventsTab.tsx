import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EventCategory {
  name: string;
  events: EventDefinition[];
}

interface EventDefinition {
  name: string;
  description: string;
  payload: Record<string, any>;
  useCases: string[];
}

const eventCategories: EventCategory[] = [
  {
    name: "Campaign Events",
    events: [
      {
        name: "campaign.created",
        description: "Triggered when a new campaign is created",
        payload: {
          campaign_id: "uuid",
          name: "string",
          size: "6x11 | 4x6 | etc",
          status: "draft | pending | launched",
          created_at: "ISO 8601 timestamp",
        },
        useCases: ["Notify team", "Create CRM task", "Log in spreadsheet"],
      },
      {
        name: "campaign.launched",
        description: "Triggered when a campaign is sent to production",
        payload: {
          campaign_id: "uuid",
          name: "string",
          audience_count: "number",
          mail_date: "ISO 8601 date",
          launched_at: "ISO 8601 timestamp",
        },
        useCases: ["Send Slack notification", "Update dashboard", "Email stakeholders"],
      },
      {
        name: "campaign.completed",
        description: "Triggered when all mail pieces are delivered",
        payload: {
          campaign_id: "uuid",
          name: "string",
          total_sent: "number",
          total_delivered: "number",
          completion_rate: "percentage",
          completed_at: "ISO 8601 timestamp",
        },
        useCases: ["Generate report", "Calculate ROI", "Archive campaign"],
      },
    ],
  },
  {
    name: "Lead Events",
    events: [
      {
        name: "lead.submitted",
        description: "Triggered when someone submits a lead form",
        payload: {
          lead_id: "uuid",
          campaign_id: "uuid",
          full_name: "string",
          email: "string",
          phone: "string | null",
          appointment_requested: "boolean",
          submitted_at: "ISO 8601 timestamp",
        },
        useCases: ["Create CRM lead", "Send to sales team", "Add to nurture sequence"],
      },
      {
        name: "lead.qualified",
        description: "Triggered when a lead is marked as qualified",
        payload: {
          lead_id: "uuid",
          qualification_score: "number",
          qualified_by: "user_id",
          qualified_at: "ISO 8601 timestamp",
        },
        useCases: ["Create deal", "Schedule appointment", "Assign to closer"],
      },
    ],
  },
  {
    name: "Gift Card Events",
    events: [
      {
        name: "gift_card.redeemed",
        description: "Triggered when a gift card is redeemed",
        payload: {
          gift_card_id: "uuid",
          card_code: "string",
          value: "number",
          provider: "string",
          redeemed_at: "ISO 8601 timestamp",
        },
        useCases: ["Send confirmation email", "Log redemption", "Track ROI"],
      },
      {
        name: "gift_card.sent",
        description: "Triggered when a gift card is sent to recipient",
        payload: {
          delivery_id: "uuid",
          recipient_id: "uuid",
          card_value: "number",
          delivery_method: "sms | email",
          sent_at: "ISO 8601 timestamp",
        },
        useCases: ["Track delivery", "Update inventory", "Send notification"],
      },
    ],
  },
  {
    name: "Call Events",
    events: [
      {
        name: "call.completed",
        description: "Triggered when a call is completed with disposition",
        payload: {
          call_session_id: "uuid",
          campaign_id: "uuid",
          recipient_id: "uuid",
          disposition: "interested | not_interested | callback | etc",
          notes: "string | null",
          completed_at: "ISO 8601 timestamp",
        },
        useCases: ["Update CRM", "Create follow-up task", "Calculate metrics"],
      },
      {
        name: "call.answered",
        description: "Triggered when recipient answers call",
        payload: {
          call_session_id: "uuid",
          recipient_id: "uuid",
          answered_at: "ISO 8601 timestamp",
        },
        useCases: ["Log interaction", "Start timer", "Update status"],
      },
    ],
  },
  {
    name: "Condition Events",
    events: [
      {
        name: "condition.met",
        description: "Triggered when a campaign condition is met",
        payload: {
          condition_id: "uuid",
          campaign_id: "uuid",
          recipient_id: "uuid",
          condition_number: "number",
          condition_name: "string",
          met_at: "ISO 8601 timestamp",
        },
        useCases: ["Trigger reward", "Send notification", "Update pipeline"],
      },
    ],
  },
  {
    name: "Tracking Events",
    events: [
      {
        name: "mail.delivered",
        description: "Triggered when mail piece is delivered (QR scanned)",
        payload: {
          recipient_id: "uuid",
          campaign_id: "uuid",
          delivered_at: "ISO 8601 timestamp",
          location: "city, state",
        },
        useCases: ["Track delivery", "Update status", "Calculate timing"],
      },
      {
        name: "purl.visited",
        description: "Triggered when PURL landing page is visited",
        payload: {
          recipient_id: "uuid",
          campaign_id: "uuid",
          visited_at: "ISO 8601 timestamp",
          user_agent: "string",
        },
        useCases: ["Track engagement", "Score lead", "Trigger follow-up"],
      },
    ],
  },
];

export function ZapierEventsTab() {
  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle>Zapier Event Catalog</CardTitle>
          <CardDescription>
            Complete reference of all events that can trigger Zapier automations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            These events are automatically sent to your connected Zapier webhooks. Each event includes
            a standardized payload with event metadata, client context, and event-specific data.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue={eventCategories[0].name} className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          {eventCategories.map((category) => (
            <TabsTrigger key={category.name} value={category.name}>
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {eventCategories.map((category) => (
          <TabsContent key={category.name} value={category.name} className="space-y-4">
            {category.events.map((event) => (
              <Card key={event.name}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {event.name}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {event.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">Payload Structure</h4>
                    <pre className="rounded bg-muted p-3 text-xs overflow-x-auto">
{JSON.stringify({
  event_id: "uuid",
  event_type: event.name,
  timestamp: "2025-01-17T15:45:00Z",
  client: {
    id: "uuid",
    name: "Client Name",
    industry: "string"
  },
  data: event.payload,
  meta: {
    ace_url: "https://app.aceengage.com/...",
    triggered_by: "user_id or system"
  }
}, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 text-sm">Common Use Cases</h4>
                    <ul className="space-y-1">
                      {event.useCases.map((useCase, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          • {useCase}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Event Standard Fields</CardTitle>
          <CardDescription>All events include these standard fields</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-3 gap-4 font-semibold border-b pb-2">
              <div>Field</div>
              <div>Type</div>
              <div>Description</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <code>event_id</code>
              <span className="text-muted-foreground">UUID</span>
              <span className="text-muted-foreground">Unique identifier for this event</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <code>event_type</code>
              <span className="text-muted-foreground">string</span>
              <span className="text-muted-foreground">Event type (e.g., "lead.submitted")</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <code>timestamp</code>
              <span className="text-muted-foreground">ISO 8601</span>
              <span className="text-muted-foreground">When the event occurred</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <code>client</code>
              <span className="text-muted-foreground">object</span>
              <span className="text-muted-foreground">Client context information</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <code>data</code>
              <span className="text-muted-foreground">object</span>
              <span className="text-muted-foreground">Event-specific payload</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <code>meta</code>
              <span className="text-muted-foreground">object</span>
              <span className="text-muted-foreground">Additional metadata</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
