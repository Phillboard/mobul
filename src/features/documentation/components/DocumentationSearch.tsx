import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command";
import { useDocumentationSearch } from '@/features/documentation/hooks';
import { Button } from "@/shared/components/ui/button";

export function DocumentationSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { data: results } = useDocumentationSearch(query);

  const handleSelect = (category: string, slug: string) => {
    navigate(`/admin/docs/${category}/${slug}`);
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-start text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 mr-2" />
        Search documentation...
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search documentation..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No documentation found.</CommandEmpty>
          {results && results.length > 0 && (
            <CommandGroup heading="Documentation">
              {results.map((doc) => (
                <CommandItem
                  key={doc.id}
                  onSelect={() => handleSelect(doc.category, doc.slug)}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{doc.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {doc.category}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
