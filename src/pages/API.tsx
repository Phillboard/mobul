import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code2, Webhook, Book, Key } from "lucide-react";

export default function API() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">API & Webhooks</h1>
          <p className="mt-1 text-muted-foreground">
            Integrate ACE Engage with your existing systems via REST API
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-primary" />
                REST API
              </CardTitle>
              <CardDescription>
                Full OpenAPI 3.0 specification with idempotent endpoints
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-muted p-4 font-mono text-sm">
                <div className="text-success">POST</div>
                <div className="text-muted-foreground">/v1/campaigns</div>
              </div>
              <div className="rounded-lg bg-muted p-4 font-mono text-sm">
                <div className="text-primary">GET</div>
                <div className="text-muted-foreground">/v1/audiences/{'{'}{'{'}id{'}'}</div>
              </div>
              <Button variant="outline" className="w-full">
                <Book className="mr-2 h-4 w-4" />
                View API Documentation
              </Button>
            </CardContent>
          </Card>

          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-accent" />
                Webhooks
              </CardTitle>
              <CardDescription>
                Real-time event notifications for campaign status and attribution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-lg border border-border p-2.5">
                  <span className="text-muted-foreground">mail.batch_status.changed</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-2.5">
                  <span className="text-muted-foreground">dm.qr_scanned</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-2.5">
                  <span className="text-muted-foreground">dm.conversion.recorded</span>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                Configure Webhooks
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </CardTitle>
            <CardDescription>
              Manage your API credentials and access tokens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Production Key</p>
                    <p className="text-sm text-muted-foreground">
                      ace_live_••••••••••••••••3x7k
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Regenerate
                  </Button>
                </div>
              </div>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Create New API Key
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
          <CardHeader>
            <CardTitle>SDKs & Libraries</CardTitle>
            <CardDescription>
              Official client libraries for Node.js and Python
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-4">
                <h4 className="font-semibold text-foreground">Node.js / TypeScript</h4>
                <code className="mt-2 block rounded bg-muted p-2 text-sm">
                  npm install @ace-engage/sdk
                </code>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <h4 className="font-semibold text-foreground">Python</h4>
                <code className="mt-2 block rounded bg-muted p-2 text-sm">
                  pip install ace-engage
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
