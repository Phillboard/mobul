import { Link, useLocation } from "react-router-dom";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, FileText } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const docsStructure = [
  {
    category: "Getting Started",
    slug: "getting-started",
    pages: [
      { title: "Quick Start", slug: "quickstart" },
      { title: "Platform Overview", slug: "overview" },
      { title: "First Campaign", slug: "first-campaign" },
      { title: "Terminology", slug: "terminology" },
    ],
  },
  {
    category: "Architecture",
    slug: "architecture",
    pages: [
      { title: "System Architecture", slug: "architecture-overview" },
      { title: "Data Model", slug: "data-model" },
      { title: "Security", slug: "security" },
      { title: "Scalability", slug: "scalability" },
    ],
  },
  {
    category: "Features",
    slug: "features",
    pages: [
      { title: "Campaigns", slug: "campaigns" },
      { title: "Campaign Lifecycle", slug: "campaign-lifecycle" },
      { title: "Audiences", slug: "audiences" },
      { title: "Gift Cards", slug: "gift-cards" },
      { title: "PURLs & QR Codes", slug: "purl-qr-codes" },
      { title: "Landing Pages", slug: "landing-pages" },
      { title: "Analytics", slug: "analytics" },
      { title: "Lead Marketplace", slug: "lead-marketplace" },
    ],
  },
  {
    category: "Developer Guide",
    slug: "developer-guide",
    pages: [
      { title: "Setup", slug: "setup" },
      { title: "Edge Functions", slug: "edge-functions" },
      { title: "Database", slug: "database" },
      { title: "Event Tracking", slug: "event-tracking" },
    ],
  },
  {
    category: "API Reference",
    slug: "api-reference",
    pages: [
      { title: "REST API", slug: "rest-api" },
      { title: "Webhooks", slug: "webhooks" },
      { title: "Authentication", slug: "authentication" },
      { title: "Examples", slug: "examples" },
    ],
  },
  {
    category: "User Guides",
    slug: "user-guides",
    pages: [
      { title: "Admin Guide", slug: "admin-guide" },
      { title: "Agency Guide", slug: "agency-guide" },
      { title: "Client Guide", slug: "client-guide" },
      { title: "Call Center Guide", slug: "call-center-guide" },
    ],
  },
];

export function DocumentationSidebar() {
  const location = useLocation();
  const [openCategories, setOpenCategories] = useState<string[]>(
    docsStructure.map((cat) => cat.slug)
  );

  const toggleCategory = (slug: string) => {
    setOpenCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

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
            {category.pages.map((page) => {
              const href = `/admin/docs/${category.slug}/${page.slug}`;
              const isActive = location.pathname === href;

              return (
                <Link
                  key={page.slug}
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
