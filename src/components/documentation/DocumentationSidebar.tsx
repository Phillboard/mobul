import { Link, useLocation } from "react-router-dom";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, FileText, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from '@/lib/utils/utils';
import { useDocumentationPermissions } from "@/hooks/useDocumentationPermissions";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function DocumentationSidebar() {
  const location = useLocation();
  const { data: docsStructure, isLoading, error } = useDocumentationPermissions();
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  // Auto-expand all categories when data loads
  useEffect(() => {
    if (docsStructure) {
      setOpenCategories(docsStructure.map((cat) => cat.slug));
    }
  }, [docsStructure]);

  const toggleCategory = (slug: string) => {
    setOpenCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-2">
        <AlertDescription>
          Failed to load documentation. Please refresh the page.
        </AlertDescription>
      </Alert>
    );
  }

  if (!docsStructure || docsStructure.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        No documentation available for your role.
      </div>
    );
  }

  return (
    <nav className="space-y-2">
      {docsStructure.map((category) => (
        <Collapsible
          key={category.slug}
          open={openCategories.includes(category.slug)}
          onOpenChange={() => toggleCategory(category.slug)}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium hover:bg-accent rounded-md">
            <span>{category.category}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                openCategories.includes(category.slug) && "transform rotate-180"
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 space-y-1 pl-4">
            {category.pages.map((page: any) => {
              const href = `/admin/docs/${category.slug}/${page.slug}`;
              const isActive = location.pathname === href;

              return (
                <Link
                  key={page.id || page.slug}
                  to={href}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <FileText className="h-3.5 w-3.5" />
                  {page.title}
                </Link>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </nav>
  );
}
