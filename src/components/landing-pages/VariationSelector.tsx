import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface Variation {
  id: string;
  name: string;
  style: string;
  description: string;
  colors: string[];
}

interface VariationSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variations: Variation[];
  landingPageId: string;
  branding: any;
  onSelect: (variationId: string) => void;
}

export function VariationSelector({ 
  open, 
  onOpenChange, 
  variations, 
  branding,
  onSelect 
}: VariationSelectorProps) {
  
  const getStyleColor = (style: string) => {
    switch (style) {
      case 'minimalist': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'vibrant': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'professional': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-primary" />
            Choose Your Design
          </DialogTitle>
          {branding && (
            <p className="text-sm text-muted-foreground mt-2">
              3 unique designs generated for <span className="font-semibold">{branding.companyName}</span>
            </p>
          )}
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {variations.map((variation, index) => (
            <motion.div
              key={variation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <div className="border rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] bg-card">
                {/* Preview */}
                <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10" />
                  <div 
                    className="w-full h-full transform scale-[0.5] origin-top-left"
                    style={{ width: '200%', height: '200%' }}
                  >
                    {/* Simulated preview - in production, you'd render actual HTML */}
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-background to-muted">
                      <div className="text-center p-8">
                        <div 
                          className="w-24 h-24 rounded-full mx-auto mb-4"
                          style={{ 
                            background: `linear-gradient(135deg, ${variation.colors[0]}, ${variation.colors[1]})` 
                          }}
                        />
                        <div className="space-y-2">
                          <div className="h-8 bg-foreground/10 rounded w-48 mx-auto" />
                          <div className="h-4 bg-foreground/5 rounded w-32 mx-auto" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{variation.name}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {variation.description}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`${getStyleColor(variation.style)} shrink-0 ml-2`}
                    >
                      {variation.style}
                    </Badge>
                  </div>

                  {/* Color Palette */}
                  <div className="flex gap-2">
                    {variation.colors.slice(0, 3).map((color, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full border-2 border-background shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>

                  <Button
                    onClick={() => onSelect(variation.id)}
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    size="lg"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Select This Design
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-3 mt-6 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Start Over
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
