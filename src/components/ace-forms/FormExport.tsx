import { useState } from "react";
import { Copy, Check, Code, FileCode, Globe } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface FormExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
}

export function FormExport({ open, onOpenChange, formId }: FormExportProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [embedDomain, setEmbedDomain] = useState("example.com");

  const baseUrl = window.location.origin;
  const formUrl = `${baseUrl}/forms/${formId}`;

  const iframeCode = `<iframe 
  src="${formUrl}" 
  width="100%" 
  height="600" 
  frameborder="0"
  style="border: none; border-radius: 8px;"
></iframe>`;

  const jsCode = `<div id="ace-form-${formId}"></div>
<script>
  (function() {
    var iframe = document.createElement('iframe');
    iframe.src = '${formUrl}';
    iframe.width = '100%';
    iframe.height = '600';
    iframe.frameBorder = '0';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    document.getElementById('ace-form-${formId}').appendChild(iframe);
  })();
</script>`;

  const reactCode = `import React from 'react';

export function AceForm() {
  return (
    <iframe
      src="${formUrl}"
      width="100%"
      height="600"
      frameBorder="0"
      style={{ border: 'none', borderRadius: '8px' }}
      title="ACE Form"
    />
  );
}`;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard",
    });
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Export & Embed Form</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="iframe" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="iframe">
              <Code className="w-4 h-4 mr-2" />
              iFrame
            </TabsTrigger>
            <TabsTrigger value="javascript">
              <FileCode className="w-4 h-4 mr-2" />
              JavaScript
            </TabsTrigger>
            <TabsTrigger value="react">
              <Globe className="w-4 h-4 mr-2" />
              React
            </TabsTrigger>
            <TabsTrigger value="url">
              <Globe className="w-4 h-4 mr-2" />
              Direct URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="iframe" className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">iFrame Embed Code</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Copy this code and paste it into your website HTML
              </p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                  <code>{iframeCode}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(iframeCode, "iframe")}
                >
                  {copied === "iframe" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="javascript" className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">JavaScript Embed</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Place this code where you want the form to appear
              </p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                  <code>{jsCode}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(jsCode, "js")}
                >
                  {copied === "js" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="react" className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">React Component</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Use this component in your React application
              </p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                  <code>{reactCode}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(reactCode, "react")}
                >
                  {copied === "react" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Direct URL</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Share this URL directly or use it in emails and social media
              </p>
              <div className="flex gap-2">
                <Input value={formUrl} readOnly className="font-mono text-sm" />
                <Button onClick={() => copyToClipboard(formUrl, "url")}>
                  {copied === "url" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">URL Parameters</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li><code className="bg-muted px-1 rounded">?embedMode=true</code> - Hide header/footer</li>
                <li><code className="bg-muted px-1 rounded">?primaryColor=FF0000</code> - Custom primary color</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
