import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Monitor, Smartphone } from "lucide-react";
import { FormConfig } from "@/types/aceForms";
import { cn } from "@/lib/utils";

interface FormPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: FormConfig;
  formId: string;
}

export function FormPreview({ open, onOpenChange, config, formId }: FormPreviewProps) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  
  const previewUrl = `${window.location.origin}/forms/${formId}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Form Preview</DialogTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={viewMode === "desktop" ? "default" : "outline"}
                onClick={() => setViewMode("desktop")}
              >
                <Monitor className="w-4 h-4 mr-2" />
                Desktop
              </Button>
              <Button
                size="sm"
                variant={viewMode === "mobile" ? "default" : "outline"}
                onClick={() => setViewMode("mobile")}
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Mobile
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden">
          <div
            className={cn(
              "bg-background rounded-lg shadow-lg overflow-hidden transition-all",
              viewMode === "desktop" ? "w-full h-full" : "w-[375px] h-[667px]"
            )}
          >
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title="Form Preview"
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Preview URL: <code className="text-xs bg-muted px-2 py-1 rounded">{previewUrl}</code>
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
