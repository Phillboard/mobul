import { useMemo } from "react";

export interface SearchableNavItem {
  name: string;
  href: string;
  icon: any;
  keywords?: string[];
  description?: string;
  permissions?: string[];
  groupLabel?: string;
}

export interface SearchResult extends SearchableNavItem {
  matchScore: number;
  matchedOn: "name" | "keyword" | "description";
}

export function useMenuSearch(
  items: SearchableNavItem[],
  searchQuery: string
): SearchResult[] {
  return useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }

    const query = searchQuery.toLowerCase().trim();
    const results: SearchResult[] = [];

    items.forEach((item) => {
      let matchScore = 0;
      let matchedOn: "name" | "keyword" | "description" = "name";

      // Check name match (highest priority)
      const nameLower = item.name.toLowerCase();
      if (nameLower.includes(query)) {
        matchScore = nameLower.startsWith(query) ? 100 : 80;
        matchedOn = "name";
      }

      // Check keywords match (medium priority)
      if (item.keywords && matchScore < 100) {
        const keywordMatch = item.keywords.some((keyword) =>
          keyword.toLowerCase().includes(query)
        );
        if (keywordMatch) {
          matchScore = Math.max(matchScore, 60);
          matchedOn = "keyword";
        }
      }

      // Check description match (lower priority)
      if (item.description && matchScore < 100) {
        const descLower = item.description.toLowerCase();
        if (descLower.includes(query)) {
          matchScore = Math.max(matchScore, 40);
          matchedOn = "description";
        }
      }

      if (matchScore > 0) {
        results.push({
          ...item,
          matchScore,
          matchedOn,
        });
      }
    });

    // Sort by match score (highest first)
    return results.sort((a, b) => b.matchScore - a.matchScore);
  }, [items, searchQuery]);
}
