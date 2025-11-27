import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Copy, FileText } from "lucide-react";
import { useCallCenterScripts } from "@/hooks/useCallCenterScripts";
import { toast } from "sonner";

interface ScriptPanelProps {
  clientId?: string;
  campaignId?: string;
  currentStep?: 'code-entry' | 'contact-method' | 'condition-selection' | 'complete';
  recipientData?: {
    first_name?: string;
    last_name?: string;
    campaign_name?: string;
    gift_card_value?: number;
  };
}

const SCRIPT_TYPE_LABELS = {
  greeting: 'Greeting',
  verification: 'Verification',
  explanation: 'Gift Card Explanation',
  objection_handling: 'Objection Handling',
  closing: 'Closing',
  escalation: 'Escalation',
};

const STEP_SCRIPT_MAPPING = {
  'code-entry': ['greeting', 'verification'],
  'contact-method': ['verification', 'explanation'],
  'condition-selection': ['explanation'],
  'complete': ['closing'],
};

export function ScriptPanel({ clientId, campaignId, currentStep = 'code-entry', recipientData }: ScriptPanelProps) {
  const { scripts, isLoading } = useCallCenterScripts(clientId, campaignId);
  const [expandedScripts, setExpandedScripts] = useState<string[]>([]);

  const interpolateScript = (content: string) => {
    let interpolated = content;
    
    if (recipientData) {
      const customerName = recipientData.first_name 
        ? `${recipientData.first_name} ${recipientData.last_name || ''}`.trim()
        : 'the customer';
      
      interpolated = interpolated
        .replace(/\{\{customer_name\}\}/g, customerName)
        .replace(/\{\{campaign_name\}\}/g, recipientData.campaign_name || '[Campaign Name]')
        .replace(/\{\{gift_card_value\}\}/g, recipientData.gift_card_value ? `$${recipientData.gift_card_value}` : '[Value]');
    }
    
    return interpolated;
  };

  const toggleScript = (scriptId: string) => {
    setExpandedScripts(prev =>
      prev.includes(scriptId)
        ? prev.filter(id => id !== scriptId)
        : [...prev, scriptId]
    );
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Script copied to clipboard');
  };

  // Filter scripts based on current step
  const relevantScriptTypes = STEP_SCRIPT_MAPPING[currentStep] || [];
  const relevantScripts = scripts.filter(script => 
    relevantScriptTypes.includes(script.script_type)
  );

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Call Scripts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading scripts...</p>
        </CardContent>
      </Card>
    );
  }

  if (scripts.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Call Scripts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No scripts available. Ask your manager to create scripts.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Call Scripts
        </CardTitle>
        {relevantScripts.length < scripts.length && (
          <p className="text-xs text-muted-foreground mt-1">
            Showing {relevantScripts.length} relevant script{relevantScripts.length !== 1 ? 's' : ''} for this step
          </p>
        )}
      </CardHeader>
      <ScrollArea className="flex-1 px-6">
        <div className="space-y-2 pb-4">
          {relevantScripts.map((script) => {
            const isExpanded = expandedScripts.includes(script.id);
            const interpolatedContent = interpolateScript(script.script_content);

            return (
              <Collapsible
                key={script.id}
                open={isExpanded}
                onOpenChange={() => toggleScript(script.id)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between text-sm font-medium"
                  >
                    <span className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {script.script_name}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {SCRIPT_TYPE_LABELS[script.script_type]}
                    </Badge>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="bg-muted/50 rounded-md p-3 space-y-2">
                    <p className="text-sm whitespace-pre-wrap">
                      {interpolatedContent}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(interpolatedContent)}
                      className="w-full"
                    >
                      <Copy className="h-3 w-3 mr-2" />
                      Copy Script
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}
