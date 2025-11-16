import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Code, Check } from "lucide-react";
import { toast } from "sonner";

interface EmbedCodeGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

export function EmbedCodeGenerator({ open, onOpenChange, campaignId }: EmbedCodeGeneratorProps) {
  const [copied, setCopied] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [accentColor, setAccentColor] = useState("#10b981");

  const baseUrl = window.location.origin;
  const embedUrl = `${baseUrl}/embed/gift-card?primary=${encodeURIComponent(primaryColor)}&accent=${encodeURIComponent(accentColor)}`;

  const iframeCode = `<iframe 
  src="${embedUrl}"
  width="100%"
  height="600"
  frameborder="0"
  style="border: none; max-width: 500px; margin: 0 auto; display: block;"
  title="Gift Card Redemption"
></iframe>`;

  const scriptCode = `<!-- Gift Card Redemption Widget -->
<div id="gift-card-widget"></div>
<script>
  (function() {
    var iframe = document.createElement('iframe');
    iframe.src = '${embedUrl}';
    iframe.width = '100%';
    iframe.height = '600';
    iframe.frameBorder = '0';
    iframe.style.border = 'none';
    iframe.style.maxWidth = '500px';
    iframe.style.margin = '0 auto';
    iframe.style.display = 'block';
    iframe.title = 'Gift Card Redemption';
    document.getElementById('gift-card-widget').appendChild(iframe);
  })();
</script>`;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Get Embed Code
          </DialogTitle>
          <DialogDescription>
            Embed this gift card redemption form on any website. Users enter their gift card code to reveal their reward.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customization Options */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <Label htmlFor="primary">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1"
                  placeholder="#3b82f6"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="accent">Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  id="accent"
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1"
                  placeholder="#10b981"
                />
              </div>
            </div>
          </div>

          {/* Code Tabs */}
          <Tabs defaultValue="iframe" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="iframe">iFrame Embed</TabsTrigger>
              <TabsTrigger value="script">JavaScript Embed</TabsTrigger>
            </TabsList>
            <TabsContent value="iframe" className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Simple iframe embed - works on any platform that allows iframes
              </p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                  <code>{iframeCode}</code>
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => handleCopy(iframeCode)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="script" className="space-y-2">
              <p className="text-sm text-muted-foreground">
                JavaScript embed - dynamically creates the widget
              </p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                  <code>{scriptCode}</code>
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => handleCopy(scriptCode)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Preview Link */}
          <div className="p-4 bg-muted rounded-lg">
            <Label className="text-sm font-medium mb-2 block">Preview URL</Label>
            <div className="flex gap-2">
              <Input value={embedUrl} readOnly className="text-xs" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(embedUrl, "_blank")}
              >
                Test
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium">How to use:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Copy the embed code above (iFrame or JavaScript)</li>
              <li>Paste it into your landing page HTML, WordPress, Shopify, or any CMS</li>
              <li>Users enter their gift card code to claim their reward</li>
              <li>The widget validates the code and displays the gift card details</li>
            </ol>
            <p className="mt-3 text-xs">
              <strong>Note:</strong> Users need actual gift card codes from your gift card pool to redeem. Make sure you've purchased and uploaded gift cards first.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
