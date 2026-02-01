import { Layout } from "@/shared/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ZapierEventsTab } from "@/features/settings/components/api/ZapierEventsTab";

export default function APIDocumentation() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">API Documentation</h1>
          <p className="mt-1 text-muted-foreground">
            Complete reference for the Mobul REST API
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="authentication">Authentication</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="zapier">Zapier Events</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
                <CardDescription>
                  The Mobul API is organized around REST with JSON responses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Base URL</h4>
                  <code className="block rounded bg-muted p-3 text-sm">
                    https://api.mobul.com/v1
                  </code>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Response Format</h4>
                  <p className="text-sm text-muted-foreground">
                    All responses are returned in JSON format with appropriate HTTP status codes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="authentication" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>API Authentication</CardTitle>
                <CardDescription>
                  Authenticate your API requests using your API key
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Authentication Header</h4>
                  <code className="block rounded bg-muted p-3 text-sm">
                    Authorization: Bearer mobul_live_your_api_key_here
                  </code>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Example Request</h4>
                  <pre className="rounded bg-muted p-3 text-sm overflow-x-auto">
{`curl https://api.mobul.com/v1/campaigns \\
  -H "Authorization: Bearer mobul_live_..." \\
  -H "Content-Type: application/json"`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="endpoints" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Campaigns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Create Campaign</h4>
                  <code className="block rounded bg-muted p-2 text-sm mb-2">
                    POST /v1/campaigns
                  </code>
                  <pre className="rounded bg-muted p-3 text-sm overflow-x-auto">
{`{
  "name": "Summer Promotion",
  "size": "6x11",
  "audience_id": "uuid",
  "template_id": "uuid"
}`}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Get Campaign</h4>
                  <code className="block rounded bg-muted p-2 text-sm">
                    GET /v1/campaigns/:id
                  </code>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Audiences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Create Audience</h4>
                  <code className="block rounded bg-muted p-2 text-sm mb-2">
                    POST /v1/audiences
                  </code>
                  <pre className="rounded bg-muted p-3 text-sm overflow-x-auto">
{`{
  "name": "Target List Q4",
  "source": "api"
}`}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">List Audiences</h4>
                  <code className="block rounded bg-muted p-2 text-sm">
                    GET /v1/audiences
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Events</CardTitle>
                <CardDescription>
                  Real-time notifications for campaign and tracking events
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Webhook Payload</h4>
                  <pre className="rounded bg-muted p-3 text-sm overflow-x-auto">
{`{
  "event_type": "dm.qr_scanned",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "campaign_id": "uuid",
    "recipient_id": "uuid",
    "token": "abc123xyz"
  }
}`}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Signature Verification</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    All webhook payloads are signed with HMAC-SHA256. Verify the signature using the X-Mobul-Signature header.
                  </p>
                  <pre className="rounded bg-muted p-3 text-sm overflow-x-auto">
{`const crypto = require('crypto');

const signature = req.headers['x-mobul-signature'];
const payload = JSON.stringify(req.body);
const expectedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(payload)
  .digest('hex');

if (signature === expectedSignature) {
  // Valid webhook
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="zapier" className="space-y-4">
            <ZapierEventsTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
