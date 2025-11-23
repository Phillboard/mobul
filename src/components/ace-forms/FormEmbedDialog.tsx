import { useState } from "react";
import { Copy, ExternalLink, Code2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface FormEmbedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
}

export function FormEmbedDialog({ open, onOpenChange, formId }: FormEmbedDialogProps) {
  const { toast } = useToast();
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [height, setHeight] = useState("600");

  const embedUrl = `${window.location.origin}/forms/${formId}?embed=true&primaryColor=${primaryColor.replace('#', '')}`;
  
  const iframeCode = `<iframe 
  src="${embedUrl}"
  width="100%" 
  height="${height}px" 
  frameborder="0"
  style="border: none; border-radius: 8px;"
></iframe>`;

  const scriptCode = `<div id="gift-card-form-${formId}"></div>
<script>
  (function() {
    var iframe = document.createElement('iframe');
    iframe.src = '${embedUrl}';
    iframe.width = '100%';
    iframe.height = '${height}px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    document.getElementById('gift-card-form-${formId}').appendChild(iframe);
  })();
</script>`;

  const handleCopy = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: `${type} embed code copied to clipboard`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Embed Your Form</DialogTitle>
          <DialogDescription>
            Copy and paste this code into your website to embed the gift card redemption form
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customization */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#6366f1"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height (px)</Label>
              <Input
                id="height"
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="600"
              />
            </div>
          </div>

          {/* Embed Code Tabs */}
          <Tabs defaultValue="iframe" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="iframe">
                <Code2 className="w-4 h-4 mr-2" />
                HTML (iframe)
              </TabsTrigger>
              <TabsTrigger value="script">
                <Code2 className="w-4 h-4 mr-2" />
                JavaScript
              </TabsTrigger>
            </TabsList>

            <TabsContent value="iframe" className="space-y-3">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{iframeCode}</code>
                </pre>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2"
                  onClick={() => handleCopy(iframeCode, "HTML")}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Simple iframe embed. Works on any website. Best for quick integration.
              </p>
            </TabsContent>

            <TabsContent value="script" className="space-y-3">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{scriptCode}</code>
                </pre>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2"
                  onClick={() => handleCopy(scriptCode, "JavaScript")}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                JavaScript embed. More control over placement and styling.
              </p>
            </TabsContent>
          </Tabs>

          {/* Preview Link */}
          <div className="space-y-2">
            <Label>Preview URL</Label>
            <div className="flex gap-2">
              <Input value={embedUrl} readOnly className="flex-1" />
              <Button
                variant="outline"
                onClick={() => window.open(embedUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Test
              </Button>
            </div>
          </div>

          {/* Features */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="font-medium text-sm">✨ Features Included:</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Secure code validation</li>
              <li>• 3D card flip animation</li>
              <li>• Cash App-style copy button</li>
              <li>• Mobile responsive</li>
              <li>• Brand color customization</li>
              <li>• Rate limiting protection</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
