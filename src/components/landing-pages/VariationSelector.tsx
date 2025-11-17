import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface Variation {
  id: string;
  templateName: string;
  html: string;
}

interface VariationSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variations: Variation[];
  onSelect: (variationId: string) => void;
}

export function VariationSelector({ open, onOpenChange, variations, onSelect }: VariationSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose Your Design</DialogTitle>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {variations.map((variation, index) => (
            <div key={variation.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-[3/4] bg-muted relative">
                <iframe
                  srcDoc={variation.html}
                  className="w-full h-full pointer-events-none"
                  title={`Preview ${index + 1}`}
                />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{variation.templateName}</h3>
                  <Badge variant="secondary">Design {index + 1}</Badge>
                </div>
                <Button
                  onClick={() => onSelect(variation.id)}
                  className="w-full"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Select This Design
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
