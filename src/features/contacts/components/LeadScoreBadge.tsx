import { Badge } from "@/shared/components/ui/badge";

interface LeadScoreBadgeProps {
  score: number;
}

export function LeadScoreBadge({ score }: LeadScoreBadgeProps) {
  const getScoreVariant = (score: number) => {
    if (score >= 80) return { variant: "default" as const, className: "bg-green-600 hover:bg-green-700" };
    if (score >= 50) return { variant: "secondary" as const, className: "bg-yellow-600 hover:bg-yellow-700 text-white" };
    return { variant: "outline" as const, className: "bg-red-600 hover:bg-red-700 text-white" };
  };

  const { variant, className } = getScoreVariant(score);

  return (
    <Badge variant={variant} className={className}>
      {score}
    </Badge>
  );
}