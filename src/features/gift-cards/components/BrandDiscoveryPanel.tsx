/**
 * BrandDiscoveryPanel Component
 * 
 * Smart search panel for discovering and adding gift card brands.
 * Searches both local database and Tillo API simultaneously.
 * Displays results as visual brand cards.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group";
import { Search, X, Package, Database, Cloud, Loader2 } from "lucide-react";
import { BrandCard, BrandCardSkeleton, type BrandCardProps } from "./BrandCard";
import { useBrandSearch, type BrandSearchResult } from "../hooks/useBrandSearch";
import { cn } from "@/lib/utils";

interface BrandDiscoveryPanelProps {
  onAddBrand: (brand: BrandSearchResult) => void;
  onManageBrand?: (brand: BrandSearchResult) => void;
  addingBrandId?: string | null;
  recentlyAddedIds?: Set<string>;
  className?: string;
  maxResults?: number;
}

export function BrandDiscoveryPanel({
  onAddBrand,
  onManageBrand,
  addingBrandId,
  recentlyAddedIds = new Set(),
  className,
  maxResults = 12,
}: BrandDiscoveryPanelProps) {
  const {
    searchQuery,
    setSearchQuery,
    filter,
    setFilter,
    results,
    isLoading,
    isLoadingTillo,
    clearSearch,
    localCount,
    tilloCount,
  } = useBrandSearch();

  const displayResults = results.slice(0, maxResults);
  const hasMore = results.length > maxResults;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Discover Brands
          </CardTitle>
          {isLoadingTillo && (
            <Badge variant="outline" className="text-xs">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Searching Tillo...
            </Badge>
          )}
        </div>
        
        {/* Search Input */}
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search brands (e.g., Amazon, Starbucks, Target)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={clearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between mt-3">
          <ToggleGroup
            type="single"
            value={filter}
            onValueChange={(value) => value && setFilter(value as 'all' | 'local' | 'tillo')}
            className="justify-start"
          >
            <ToggleGroupItem value="all" size="sm">
              <Package className="h-3 w-3 mr-1" />
              All ({localCount + tilloCount})
            </ToggleGroupItem>
            <ToggleGroupItem value="local" size="sm">
              <Database className="h-3 w-3 mr-1" />
              In System ({localCount})
            </ToggleGroupItem>
            <ToggleGroupItem value="tillo" size="sm">
              <Cloud className="h-3 w-3 mr-1" />
              Tillo ({tilloCount})
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>

      <CardContent>
        {/* Loading State */}
        {isLoading && results.length === 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <BrandCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Results Grid */}
        {!isLoading && displayResults.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {displayResults.map((brand) => {
                const isAdded = brand.id ? recentlyAddedIds.has(brand.id) : false;
                const isAdding = brand.tilloBrandCode === addingBrandId || brand.id === addingBrandId;
                
                return (
                  <BrandCard
                    key={brand.id || brand.tilloBrandCode || brand.brandName}
                    brandName={brand.brandName}
                    brandCode={brand.brandCode}
                    tilloBrandCode={brand.tilloBrandCode}
                    logoUrl={brand.logoUrl}
                    denominations={brand.denominations}
                    inventoryCount={brand.inventoryCount}
                    source={brand.source}
                    isEnabled={brand.isEnabled}
                    isAdded={isAdded}
                    isAdding={isAdding}
                    onAdd={() => onAddBrand(brand)}
                    onManage={onManageBrand ? () => onManageBrand(brand) : undefined}
                  />
                );
              })}
            </div>
            
            {hasMore && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Showing {maxResults} of {results.length} results. Refine your search to see more specific results.
              </p>
            )}
          </>
        )}

        {/* Empty State */}
        {!isLoading && results.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            {searchQuery ? (
              <>
                <p className="text-muted-foreground">No brands found for "{searchQuery}"</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try a different search term or check the Tillo catalog
                </p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">Search for brands to get started</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Type at least 2 characters to search both local and Tillo brands
                </p>
              </>
            )}
          </div>
        )}

        {/* Quick Add Popular Brands */}
        {!searchQuery && results.length === 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Popular Brands</h4>
            <div className="flex flex-wrap gap-2">
              {['Amazon', 'Starbucks', 'Target', 'Walmart', 'Best Buy', 'Apple'].map((brand) => (
                <Button
                  key={brand}
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery(brand)}
                >
                  {brand}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
