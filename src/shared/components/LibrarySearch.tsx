import { Input } from "@/shared/components/ui/input";
import { Search } from "lucide-react";

interface LibrarySearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function LibrarySearch({ value, onChange, placeholder = "Search..." }: LibrarySearchProps) {
  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}
