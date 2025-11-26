import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
        // First, try to load from database (edited content)
        const { data: dbDoc, error: dbError } = await supabase
          .from("documentation_pages")
          .select("content, title")
          .eq("category", category)
          .eq("slug", slug)
          .single();

        if (!dbError && dbDoc?.content) {
          console.log('Loaded from database:', { category, slug });
          setContent(dbDoc.content);
          return;
        }

        // Fall back to file system
        const folderName = categoryFolderMap[category];
        const fileName = slugFileMap[slug];
        
        console.log('Loading doc from file:', { category, slug, folderName, fileName });
        
        if (!folderName || !fileName) {
          console.error('Missing folder or file mapping:', { category, slug, folderName, fileName });
          throw new Error("Documentation page not found");
        }

        const path = `/docs/${folderName}/${fileName}.md`;
        console.log('Fetching from path:', path);
        const response = await fetch(path);
        
        console.log('Fetch response:', response.status, response.statusText);
        
        if (!response.ok) {
          throw new Error(`Failed to load documentation: ${response.status} ${response.statusText}`);
        }
        
        const text = await response.text();
        console.log('Loaded content length:', text.length);
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
