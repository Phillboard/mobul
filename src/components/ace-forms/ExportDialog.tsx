import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check } from "lucide-react";
import { FormConfig, ExportFormat } from "@/types/aceForms";
import { generateHTMLExport, generateJavaScriptEmbed, generateIframeEmbed, generateReactComponent } from "@/lib/export/aceFormExport";
import { useToast } from "@/hooks/use-toast";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  config: FormConfig;
}

export function ExportDialog({ open, onOpenChange, formId, config }: ExportDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<ExportFormat | null>(null);

  const handleCopy = (format: ExportFormat, code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(format);
    toast({
      title: "Copied to clipboard",
      description: "The code has been copied to your clipboard",
    });
    setTimeout(() => setCopied(null), 2000);
  };

  const htmlCode = generateHTMLExport(formId, config, { format: "html", includeStyles: true });
  const jsCode = generateJavaScriptEmbed(formId, { format: "javascript", includeStyles: true });
  const iframeCode = generateIframeEmbed(formId, { format: "iframe", includeStyles: true });
  const reactCode = generateReactComponent(formId, config);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Form</DialogTitle>
          <DialogDescription>
            Choose an export format and copy the code to embed your form
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="html" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="html">HTML</TabsTrigger>
            <TabsTrigger value="javascript">JavaScript</TabsTrigger>
            <TabsTrigger value="iframe">iFrame</TabsTrigger>
            <TabsTrigger value="react">React</TabsTrigger>
          </TabsList>

          <TabsContent value="html" className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Self-contained HTML file with inline CSS and JavaScript
              </p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-96">
                  {htmlCode}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => handleCopy("html", htmlCode)}
                >
                  {copied === "html" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="javascript" className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                JavaScript embed snippet to add to your website
              </p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                  {jsCode}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => handleCopy("javascript", jsCode)}
                >
                  {copied === "javascript" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="iframe" className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                iFrame embed code for quick integration
              </p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                  {iframeCode}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => handleCopy("iframe", iframeCode)}
                >
                  {copied === "iframe" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="react" className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                React component with TypeScript support
              </p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-96">
                  {reactCode}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => handleCopy("react", reactCode)}
                >
                  {copied === "react" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
