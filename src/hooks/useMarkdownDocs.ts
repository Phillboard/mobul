import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

// Map URL slugs to file paths
const categoryFolderMap: Record<string, string> = {
  "getting-started": "1-GETTING-STARTED",
  "architecture": "2-ARCHITECTURE",
  "features": "3-FEATURES",
  "developer-guide": "4-DEVELOPER-GUIDE",
  "api-reference": "5-API-REFERENCE",
  "user-guides": "6-USER-GUIDES",
};

const slugFileMap: Record<string, string> = {
  // Getting Started
  "quickstart": "QUICKSTART",
  "overview": "OVERVIEW",
  "first-campaign": "FIRST_CAMPAIGN",
  "terminology": "TERMINOLOGY",
  
  // Architecture
  "architecture-overview": "OVERVIEW",
  "data-model": "DATA_MODEL",
  "security": "SECURITY",
  "scalability": "SCALABILITY",
  
  // Features
  "campaigns": "CAMPAIGNS",
  "campaign-lifecycle": "CAMPAIGN_LIFECYCLE",
  "audiences": "AUDIENCES",
  "gift-cards": "GIFT_CARDS",
  "purl-qr-codes": "PURL_QR_CODES",
  "landing-pages": "LANDING_PAGES",
  "analytics": "ANALYTICS",
  "lead-marketplace": "LEAD_MARKETPLACE",
  
  // Developer Guide
  "setup": "SETUP",
  "edge-functions": "EDGE_FUNCTIONS",
  "database": "DATABASE",
  "event-tracking": "EVENT_TRACKING",
  
  // API Reference
  "rest-api": "REST_API",
  "webhooks": "WEBHOOKS",
  "authentication": "AUTHENTICATION",
  "examples": "EXAMPLES",
  
  // User Guides
  "admin-guide": "ADMIN_GUIDE",
  "agency-guide": "AGENCY_GUIDE",
  "client-guide": "CLIENT_GUIDE",
  "call-center-guide": "CALL_CENTER_GUIDE",
};

export function useMarkdownDoc(category: string, slug: string) {
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    async function loadMarkdown() {
      try {
        const folderName = categoryFolderMap[category];
        const fileName = slugFileMap[slug];
        
        if (!folderName || !fileName) {
          throw new Error("Documentation page not found");
        }

        const path = `/docs/${folderName}/${fileName}.md`;
        const response = await fetch(path);
        
        if (!response.ok) {
          throw new Error("Failed to load documentation");
        }
        
        const text = await response.text();
        setContent(text);
      } catch (error) {
        console.error("Error loading markdown:", error);
        setContent("");
      }
    }

    loadMarkdown();
  }, [category, slug]);

  return {
    data: content ? {
      title: extractTitle(content),
      content: content,
      category: category,
      slug: slug,
    } : null,
    isLoading: !content,
    error: null,
  };
}

function extractTitle(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1] : "Documentation";
}
