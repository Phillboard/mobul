import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle } from "lucide-react";

interface GiftCardInstructionsProps {
  instructions?: string;
  restrictions?: string[];
}

export function GiftCardInstructions({ instructions, restrictions }: GiftCardInstructionsProps) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="instructions">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            How to Use & Important Notes
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 text-sm">
            {instructions && (
              <div>
                <h4 className="font-medium mb-2">How to Use:</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{instructions}</p>
              </div>
            )}

            {restrictions && restrictions.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Important Notes:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {restrictions.map((restriction, i) => (
                    <li key={i}>{restriction}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
