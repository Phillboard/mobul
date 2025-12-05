import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

// Documentation structure based on the markdown files and URL structure
const docsStructure = [
  {
    category: "Getting Started",
    slug: "getting-started",
    pages: [
      { id: "qs-1", slug: "quickstart", title: "Quick Start" },
      { id: "qs-2", slug: "overview", title: "Overview" },
      { id: "qs-3", slug: "first-campaign", title: "First Campaign" },
      { id: "qs-4", slug: "terminology", title: "Terminology" },
    ],
  },
  {
    category: "Architecture",
    slug: "architecture",
    pages: [
      { id: "arch-1", slug: "architecture-overview", title: "Architecture Overview" },
      { id: "arch-2", slug: "data-model", title: "Data Model" },
      { id: "arch-3", slug: "security", title: "Security" },
      { id: "arch-4", slug: "scalability", title: "Scalability" },
    ],
  },
  {
    category: "Features",
    slug: "features",
    pages: [
      { id: "feat-1", slug: "campaigns", title: "Campaigns" },
      { id: "feat-2", slug: "campaign-lifecycle", title: "Campaign Lifecycle" },
      { id: "feat-3", slug: "audiences", title: "Audiences" },
      { id: "feat-4", slug: "gift-cards", title: "Gift Cards" },
      { id: "feat-5", slug: "purl-qr-codes", title: "PURL & QR Codes" },
      { id: "feat-6", slug: "landing-pages", title: "Landing Pages" },
      { id: "feat-7", slug: "analytics", title: "Analytics" },
      { id: "feat-8", slug: "lead-marketplace", title: "Lead Marketplace" },
    ],
  },
  {
    category: "Developer Guide",
    slug: "developer-guide",
    pages: [
      { id: "dev-1", slug: "setup", title: "Setup" },
      { id: "dev-2", slug: "edge-functions", title: "Edge Functions" },
      { id: "dev-3", slug: "database", title: "Database" },
      { id: "dev-4", slug: "event-tracking", title: "Event Tracking" },
    ],
  },
  {
    category: "API Reference",
    slug: "api-reference",
    pages: [
      { id: "api-1", slug: "rest-api", title: "REST API" },
      { id: "api-2", slug: "webhooks", title: "Webhooks" },
      { id: "api-3", slug: "authentication", title: "Authentication" },
      { id: "api-4", slug: "examples", title: "Examples" },
    ],
  },
  {
    category: "User Guides",
    slug: "user-guides",
    pages: [
      { id: "ug-1", slug: "admin-guide", title: "Admin Guide" },
      { id: "ug-2", slug: "agency-guide", title: "Agency Guide" },
      { id: "ug-3", slug: "client-guide", title: "Client Guide" },
      { id: "ug-4", slug: "call-center-guide", title: "Call Center Guide" },
    ],
  },
];

export function useDocumentationPermissions() {
  const { hasRole } = useAuth();

  return useQuery({
    queryKey: ["documentation-permissions"],
    queryFn: async () => {
      const isAdmin = hasRole("admin");
      
      // For now, return all documentation for all users
      // In the future, you can filter based on role/permissions
      // For example, hide "Developer Guide" for non-admin users
      
      if (!isAdmin) {
        // Filter out admin-only sections if needed
        return docsStructure.filter(cat => 
          cat.slug !== "developer-guide" // Example: hide dev guide from non-admins
        );
      }
      
      return docsStructure;
    },
  });
}
