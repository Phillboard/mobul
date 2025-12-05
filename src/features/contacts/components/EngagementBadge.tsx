import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface EngagementBadgeProps {
  score: number;
  showTooltip?: boolean;
}

export function EngagementBadge({ score, showTooltip = true }: EngagementBadgeProps) {
  const getEngagementLevel = (score: number) => {
    if (score >= 80) return { label: "High", variant: "default" as const, color: "bg-green-500" };
    if (score >= 50) return { label: "Medium", variant: "secondary" as const, color: "bg-yellow-500" };
    return { label: "Low", variant: "outline" as const, color: "bg-red-500" };
  };

  const level = getEngagementLevel(score);

  const badge = (
    <Badge variant={level.variant} className="gap-1">
      <span className={`h-2 w-2 rounded-full ${level.color}`} />
      {level.label} ({score})
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm space-y-1">
            <div className="font-semibold">Engagement Score: {score}/100</div>
            <div className="text-muted-foreground">
              Based on recency, frequency, and campaign engagement
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}