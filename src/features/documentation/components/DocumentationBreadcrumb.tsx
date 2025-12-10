import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { DocumentationPage } from '@/features/documentation/hooks';

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

interface DocumentationBreadcrumbProps {
  page: DocumentationPage;
}

export function DocumentationBreadcrumb({ page }: DocumentationBreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
      <Link
        to="/admin/docs"
        className="hover:text-foreground transition-colors"
      >
        Documentation
      </Link>
      <ChevronRight className="h-4 w-4" />
      <Link
        to={`/admin/docs/${page.category}`}
        className="hover:text-foreground transition-colors"
      >
        {categoryLabels[page.category] || page.category}
      </Link>
      <ChevronRight className="h-4 w-4" />
      <span className="text-foreground font-medium">{page.title}</span>
    </nav>
  );
}
