import { Button } from "@/shared/components/ui/button";
import { Plus } from "lucide-react";

interface LibraryHeaderProps {
  title: string;
  subtitle: string;
  createButtonText: string;
  onCreateClick: () => void;
}

export function LibraryHeader({
  title,
  subtitle,
  createButtonText,
  onCreateClick,
}: LibraryHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      </div>
      <Button onClick={onCreateClick}>
        <Plus className="h-4 w-4 mr-2" />
        {createButtonText}
      </Button>
    </div>
  );
}
