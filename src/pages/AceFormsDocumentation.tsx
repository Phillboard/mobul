import { AceFormsLayout } from "@/features/ace-forms/components";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { AlertCircle, CheckCircle, Copy, Code, MessageSquare } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { toast } from "sonner";

export default function AceFormsDocumentation() {
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard!");
  };

  return (
    <AceFormsLayout>
      <div className="container mx-auto py-8 max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Ace Forms Documentation</h1>
          <p className="text-muted-foreground mt-2">
            Complete guide to using the Ace Forms gift card redemption system
          </p>
        </div>

        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle>What are Ace Forms?</CardTitle>
            <CardDescription>
              AI-powered forms for seamless gift card redemption
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Ace Forms is a specialized form builder designed for collecting customer information
              and automatically provisioning gift cards. When customers submit a form, they receive
              their gift card instantly with a beautiful 3D flip animation.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium">Instant Provisioning</div>
                  <div className="text-sm text-muted-foreground">
                    Gift cards are assigned immediately upon form submission
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium">Beautiful UI</div>
                  <div className="text-sm text-muted-foreground">
                    3D flip animation reveals the gift card
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium">Easy Embedding</div>
                  <div className="text-sm text-muted-foreground">
                    Embed on any website with iframe or JavaScript
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium">Analytics Included</div>
                  <div className="text-sm text-muted-foreground">
                    Track views, submissions, and conversions
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Getting Started */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Create your first form in 3 steps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  1
                </div>
                <div className="flex-1">
                  <div className="font-medium">Create a Gift Card Pool</div>
                  <div className="text-sm text-muted-foreground">
                    Go to Gift Cards → Pools and create a pool with available cards
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  2
                </div>
                <div className="flex-1">
                  <div className="font-medium">Build Your Form</div>
                  <div className="text-sm text-muted-foreground">
                    Click "Create Form", design your fields, and link to your gift card pool
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  3
                </div>
                <div className="flex-1">
                  <div className="font-medium">Embed & Share</div>
                  <div className="text-sm text-muted-foreground">
                    Get your embed code and add it to your website or landing page
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Embedding Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Embedding Your Form</CardTitle>
            <CardDescription>Two ways to add forms to your website</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* IFrame Method */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Code className="h-5 w-5" />
                <h3 className="font-semibold">Method 1: IFrame Embed</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Simple and secure. Just paste this code where you want the form to appear:
              </p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{`<iframe 
  src="https://yourdomain.com/forms/[FORM_ID]?primaryColor=6366f1" 
  width="100%" 
  height="600" 
  frameborder="0"
></iframe>`}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() =>
                    copyCode(
                      '<iframe src="https://yourdomain.com/forms/[FORM_ID]?primaryColor=6366f1" width="100%" height="600" frameborder="0"></iframe>'
                    )
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* JavaScript Method */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Code className="h-5 w-5" />
                <h3 className="font-semibold">Method 2: JavaScript Embed</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Dynamic loading with more control. Add this script to your page:
              </p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{`<div id="ace-form-container"></div>
<script>
  (function() {
    var iframe = document.createElement('iframe');
    iframe.src = 'https://yourdomain.com/forms/[FORM_ID]';
    iframe.width = '100%';
    iframe.height = '600';
    iframe.frameBorder = '0';
    document.getElementById('ace-form-container').appendChild(iframe);
  })();
</script>`}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() =>
                    copyCode(
                      `<div id="ace-form-container"></div>\n<script>\n  (function() {\n    var iframe = document.createElement('iframe');\n    iframe.src = 'https://yourdomain.com/forms/[FORM_ID]';\n    iframe.width = '100%';\n    iframe.height = '600';\n    iframe.frameBorder = '0';\n    document.getElementById('ace-form-container').appendChild(iframe);\n  })();\n</script>`
                    )
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Customization */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Customization Tip:</strong> You can customize the form's primary color by
                adding <code className="bg-muted px-1 py-0.5 rounded">?primaryColor=HEXCODE</code> to
                the URL (without the #).
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Best Practices */}
        <Card>
          <CardHeader>
            <CardTitle>Best Practices</CardTitle>
            <CardDescription>Tips for optimal form performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium">Keep Forms Simple</div>
                <div className="text-sm text-muted-foreground">
                  Only ask for essential information. Fewer fields = higher conversion rates.
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium">Monitor Your Pool</div>
                <div className="text-sm text-muted-foreground">
                  Always keep enough gift cards in your pool. Set low stock alerts.
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium">Test Before Launch</div>
                <div className="text-sm text-muted-foreground">
                  Use the preview feature to test the complete redemption flow.
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium">Review Analytics</div>
                <div className="text-sm text-muted-foreground">
                  Check submission rates and drop-off points to optimize your forms.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
            <CardDescription>We're here to assist you</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <MessageSquare className="h-8 w-8 text-primary" />
              <div>
                <div className="font-medium">Contact Support</div>
                <div className="text-sm text-muted-foreground">
                  If you have questions or encounter issues, reach out to our support team.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AceFormsLayout>
  );
}
