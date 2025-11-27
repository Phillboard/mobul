import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, ChevronLeft, Copy, FileText } from "lucide-react";
import { useCallCenterScripts } from "@/hooks/useCallCenterScripts";
import { toast } from "sonner";

type WorkflowStep = "code" | "contact" | "condition" | "complete";

interface ScriptPanelProps {
  clientId?: string;
  campaignId?: string;
  currentStep: WorkflowStep;
  recipientData?: RecipientData;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface RecipientData {
  first_name?: string;
  last_name?: string;
  campaign?: {
    name?: string;
  };
  gift_card_value?: number;
}

// Map script types to display labels
const SCRIPT_TYPE_LABELS: Record<string, string> = {
  greeting: "Opening / Greeting",
  verification: "Identity Verification",
  explanation: "Gift Card Explanation",
  objection_handling: "Objection Handling",
  closing: "Closing / Thank You",
  escalation: "Escalation",
};

// Map workflow steps to relevant script types
const STEP_SCRIPT_MAPPING: Record<WorkflowStep, string[]> = {
  code: ["greeting", "verification"],
  contact: ["explanation"],
  condition: ["explanation", "objection_handling"],
  complete: ["closing"],
};

export function ScriptPanel({
  clientId,
  campaignId,
  currentStep,
  recipientData,
  isCollapsed = false,
  onToggleCollapse,
}: ScriptPanelProps) {
  const { scripts, isLoading } = useCallCenterScripts(clientId, campaignId);
  const [expandedScripts, setExpandedScripts] = useState<Set<string>>(new Set());

  // Interpolate script content with recipient data
  const interpolateScript = (content: string): string => {
    if (!recipientData) return content;

    let result = content;
    result = result.replace(/\{\{customer_name\}\}/g, `${recipientData.first_name} ${recipientData.last_name}`);
    result = result.replace(/\{\{first_name\}\}/g, recipientData.first_name || "");
    result = result.replace(/\{\{campaign_name\}\}/g, recipientData.campaign?.name || "");
    result = result.replace(/\{\{gift_card_value\}\}/g, String(recipientData.gift_card_value || ""));

    return result;
  };

  const toggleScript = (scriptId: string) => {
    setExpandedScripts((prev) => {
      const next = new Set(prev);
      if (next.has(scriptId)) {
        next.delete(scriptId);
      } else {
        next.add(scriptId);
      }
      return next;
    });
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(interpolateScript(content));
    toast.success("Script copied to clipboard");
  };

  // Filter scripts based on current step
  const relevantScriptTypes = STEP_SCRIPT_MAPPING[currentStep] || [];
  const relevantScripts = scripts.filter((script) =>
    relevantScriptTypes.includes(script.script_type)
  );

  if (isCollapsed) {
    return (
      <Card className="w-14 flex-shrink-0">
        <CardContent className="p-2 flex flex-col items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <FileText className="h-4 w-4 text-muted-foreground rotate-90" />
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="w-80 flex-shrink-0">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Loading scripts...</div>
        </CardContent>
      </Card>
    );
  }

  if (relevantScripts.length === 0) {
    return (
      <Card className="w-80 flex-shrink-0">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">No scripts available for this step</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-80 flex-shrink-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Call Scripts
          </CardTitle>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {relevantScripts.map((script) => {
          const isExpanded = expandedScripts.has(script.id);

          return (
            <div key={script.id} className="border rounded-lg">
              <button
                onClick={() => toggleScript(script.id)}
                className="w-full p-3 flex items-center justify-between hover:bg-accent rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">{script.script_name}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {SCRIPT_TYPE_LABELS[script.script_type] || script.script_type}
                </Badge>
              </button>

              {isExpanded && (
                <div className="p-3 pt-0 space-y-2">
                  <div className="text-sm whitespace-pre-wrap text-muted-foreground border-l-2 border-primary pl-3">
                    {interpolateScript(script.script_content)}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => copyToClipboard(script.script_content)}
                  >
                    <Copy className="h-3 w-3 mr-2" />
                    Copy to Clipboard
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
