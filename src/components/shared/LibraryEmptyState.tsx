import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface LibraryEmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
}

export function LibraryEmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
}: LibraryEmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Icon className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-4 text-center">{message}</p>
        <Button onClick={onAction}>{actionLabel}</Button>
      </CardContent>
    </Card>
  );
}
