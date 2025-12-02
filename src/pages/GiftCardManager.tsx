/**
 * Gift Card Manager - Client/Agency View
 * Simple interface for enabling/disabling available gift cards
 * No pools, no Tillo, no purchasing - just activate what you want to use
 */

import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Search, Gift } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useClientGiftCards, useToggleDenomination, type GiftCardCategory } from "@/hooks/useClientGiftCards";
import { ViewModeToggle, type ViewMode } from "@/components/gift-cards/client/ViewModeToggle";
import { GiftCardBrandCard } from "@/components/gift-cards/client/GiftCardBrandCard";
import { GiftCardTableRow } from "@/components/gift-cards/client/GiftCardTableRow";
import { CategorySection } from "@/components/gift-cards/client/CategorySection";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function GiftCardManager() {
  const { currentClient } = useTenant();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data, isLoading } = useClientGiftCards(currentClient?.id);
  const toggleDenomination = useToggleDenomination(currentClient?.id);

  const handleToggle = (
    brandId: string,
    denomination: number,
    currentlyEnabled: boolean,
    clientGiftCardId?: string
  ) => {
    toggleDenomination.mutate({
      brandId,
      denomination,
      currentlyEnabled,
      clientGiftCardId,
    });
  };

  // Filter and search brands
  const filteredBrands = useMemo(() => {
    if (!data?.brands) return [];

    let filtered = data.brands;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(brand =>
        brand.brand_name.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(brand => brand.category === categoryFilter);
    }

    return filtered;
  }, [data?.brands, searchQuery, categoryFilter]);

  // Filter categories
  const filteredCategories = useMemo(() => {
    if (!data?.byCategory) return [];

    if (searchQuery.trim()) {
      // When searching, filter brands within categories
      return data.byCategory
        .map(cat => ({
          ...cat,
          brands: cat.brands.filter(brand =>
            brand.brand_name.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter(cat => cat.brands.length > 0);
    }

    if (categoryFilter !== "all") {
      return data.byCategory.filter(cat => cat.category === categoryFilter);
    }

    return data.byCategory;
  }, [data?.byCategory, searchQuery, categoryFilter]);

  const enabledCount = useMemo(() => {
    return data?.brands.reduce((count, brand) => {
      return count + brand.denominations.filter(d => d.is_enabled).length;
    }, 0) || 0;
  }, [data?.brands]);

  return (
    <Layout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gift className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Available Gift Cards</h1>
                <p className="text-muted-foreground">
                  Select the gift cards you want to use in your campaigns
                </p>
              </div>
            </div>
            {enabledCount > 0 && (
              <Badge variant="default" className="text-lg px-4 py-2">
                {enabledCount} Active
              </Badge>
            )}
          </div>
        </div>

        {/* Filters and View Toggle */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search gift cards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="food_beverage">Food & Beverage</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="entertainment">Entertainment</SelectItem>
                <SelectItem value="travel">Travel</SelectItem>
                <SelectItem value="gas_automotive">Gas & Automotive</SelectItem>
                <SelectItem value="home_garden">Home & Garden</SelectItem>
                <SelectItem value="health_beauty">Health & Beauty</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <ViewModeToggle currentView={viewMode} onViewChange={setViewMode} />
          </div>
        </Card>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading gift cards...</p>
          </div>
        ) : !data?.brands || data.brands.length === 0 ? (
          <Card className="p-12 text-center">
            <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No gift cards available yet</h3>
            <p className="text-muted-foreground">
              Contact your administrator to enable gift cards for your account
            </p>
          </Card>
        ) : filteredBrands.length === 0 && viewMode !== "category" ? (
          <Card className="p-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </Card>
        ) : (
          <>
            {/* Grid View */}
            {viewMode === "grid" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredBrands.map((brand) => (
                  <GiftCardBrandCard
                    key={brand.id}
                    brand={brand}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            )}

            {/* Table View */}
            {viewMode === "table" && (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Brand</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Denominations</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBrands.map((brand) => (
                      <GiftCardTableRow
                        key={brand.id}
                        brand={brand}
                        onToggle={handleToggle}
                      />
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}

            {/* Category View */}
            {viewMode === "category" && (
              <div className="space-y-4">
                {filteredCategories.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No results found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search or filters
                    </p>
                  </Card>
                ) : (
                  filteredCategories.map((category) => (
                    <CategorySection
                      key={category.category}
                      category={category.category}
                      categoryLabel={category.categoryLabel}
                      brands={category.brands}
                      onToggle={handleToggle}
                      defaultExpanded={filteredCategories.length === 1}
                    />
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* Help Text */}
        {data?.brands && data.brands.length > 0 && (
          <Card className="p-4 bg-muted/50">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Enable the gift cards you want to use, then you can select them
              when creating campaigns. The system will automatically provision gift cards as needed.
            </p>
          </Card>
        )}
      </div>
    </Layout>
  );
}

