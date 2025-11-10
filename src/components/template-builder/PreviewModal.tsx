import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: any;
  canvasData: any;
}

export function PreviewModal({
  open,
  onOpenChange,
  template,
  canvasData,
}: PreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: recipients = [] } = useQuery({
    queryKey: ["preview-recipients", template.client_id],
    queryFn: async () => {
      const { data: audiences } = await supabase
        .from("audiences")
        .select("id")
        .eq("client_id", template.client_id)
        .limit(1)
        .single();

      if (!audiences) return [];

      const { data } = await supabase
        .from("recipients")
        .select("*")
        .eq("audience_id", audiences.id)
        .limit(10);

      return data || [];
    },
    enabled: open,
  });

  const currentRecipient = recipients[currentIndex];

  const replaceMergeFields = (text: string, recipient: any) => {
    if (!recipient) return text;
    
    return text
      .replace(/\{\{first_name\}\}/g, recipient.first_name || "")
      .replace(/\{\{last_name\}\}/g, recipient.last_name || "")
      .replace(/\{\{full_name\}\}/g, `${recipient.first_name || ""} ${recipient.last_name || ""}`.trim())
      .replace(/\{\{company\}\}/g, recipient.company || "")
      .replace(/\{\{address1\}\}/g, recipient.address1 || "")
      .replace(/\{\{address2\}\}/g, recipient.address2 || "")
      .replace(/\{\{city\}\}/g, recipient.city || "")
      .replace(/\{\{state\}\}/g, recipient.state || "")
      .replace(/\{\{zip\}\}/g, recipient.zip || "")
      .replace(/\{\{phone\}\}/g, recipient.phone || "")
      .replace(/\{\{email\}\}/g, recipient.email || "")
      .replace(/\{\{purl\}\}/g, `https://example.com/p/${recipient.token}`)
      .replace(/\{\{qr_code\}\}/g, "[QR Code]");
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(recipients.length - 1, prev + 1));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Preview with Recipient Data</DialogTitle>
        </DialogHeader>

        {recipients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No recipients found. Add recipients to an audience to preview personalization.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm">
                Recipient {currentIndex + 1} of {recipients.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={currentIndex === recipients.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            <div className="border rounded-lg p-4 bg-muted/20">
              <h3 className="font-semibold mb-2">Recipient Data:</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Name: {currentRecipient?.first_name} {currentRecipient?.last_name}</div>
                <div>Company: {currentRecipient?.company || "N/A"}</div>
                <div>Address: {currentRecipient?.address1}</div>
                <div>City: {currentRecipient?.city}, {currentRecipient?.state} {currentRecipient?.zip}</div>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold">Preview:</h3>
              {canvasData?.layers?.map((layer: any) => (
                <div key={layer.id} className="text-sm">
                  {layer.type === "text" && (
                    <div>
                      <strong>Text Layer:</strong>{" "}
                      {replaceMergeFields(layer.text, currentRecipient)}
                    </div>
                  )}
                  {layer.type === "qr_code" && (
                    <div>
                      <strong>QR Code:</strong> Points to{" "}
                      {replaceMergeFields("{{purl}}", currentRecipient)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
