import { useMemo } from "react";
import { NavLink } from "@/components/NavLink";
import { useDocumentation, DocumentationPage } from "@/hooks/useDocumentation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const categoryLabels: Record<string, string> = {
  "getting-started": "Getting Started",
  "architecture": "Architecture",
  "features": "Features",
  "developer-guide": "Developer Guide",
  "api-reference": "API Reference",
  "user-guides": "User Guides",
  "operations": "Operations",
  "configuration": "Configuration",
  "reference": "Reference",
};

export function DocumentationSidebar() {
  const { data: docs, isLoading } = useDocumentation();

  const groupedDocs = useMemo(() => {
    if (!docs) return {};
    
    return docs.reduce((acc, doc) => {
      if (!acc[doc.category]) {
        acc[doc.category] = [];
      }
      acc[doc.category].push(doc);
      return acc;
    }, {} as Record<string, DocumentationPage[]>);
  }, [docs]);

  if (isLoading) {
    return (
      <div className="w-64 border-r border-border bg-background p-4 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="w-64 border-r border-border bg-background">
      <div className="p-4 space-y-6">
        {Object.entries(groupedDocs).map(([category, categoryDocs]) => (
          <div key={category}>
            <h3 className="font-semibold text-sm mb-2 text-foreground">
              {categoryLabels[category] || category}
            </h3>
            <ul className="space-y-1">
              {categoryDocs.map((doc) => (
                <li key={doc.id}>
                  <NavLink
                    to={`/admin/docs/${category}/${doc.slug}`}
                    className="block px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                    activeClassName="bg-accent text-foreground font-medium"
                  >
                    {doc.title}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
