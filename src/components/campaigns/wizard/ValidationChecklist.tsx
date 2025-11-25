import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ValidationCheck {
  label: string;
  status: 'success' | 'warning' | 'error';
  message?: string;
}

interface ValidationChecklistProps {
  checks: ValidationCheck[];
}

export function ValidationChecklist({ checks }: ValidationChecklistProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Validation Checklist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {checks.map((check, index) => {
          const Icon = check.status === 'success' 
            ? CheckCircle2 
            : check.status === 'warning' 
            ? AlertCircle 
            : XCircle;

          return (
            <div
              key={index}
              className={cn(
                "flex items-start gap-2 text-sm p-2 rounded-md",
                check.status === 'success' && "text-green-700 dark:text-green-400",
                check.status === 'warning' && "text-amber-700 dark:text-amber-400",
                check.status === 'error' && "text-red-700 dark:text-red-400"
              )}
            >
              <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div>{check.label}</div>
                {check.message && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {check.message}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
