import { Badge } from "@/components/ui/badge";
import { getStatusVariant } from '@shared/utils/cn';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = getStatusVariant(status);
  
  return (
    <Badge variant={variant} className={className}>
      {status}
    </Badge>
  );
}
