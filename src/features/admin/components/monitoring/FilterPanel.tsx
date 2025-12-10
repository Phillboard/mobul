import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import { X, Filter } from "lucide-react";

interface FilterPanelProps {
  filters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  availableFilters: {
    timeRange?: boolean;
    metricType?: boolean;
    severity?: boolean;
    status?: boolean;
    search?: boolean;
  };
}

export function FilterPanel({
  filters,
  onFilterChange,
  onClearFilters,
  availableFilters,
}: FilterPanelProps) {
  const hasActiveFilters = Object.values(filters).some(
    (v) => v && v !== "all" && v !== "24h"
  );

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border">
      <Filter className="h-4 w-4 text-muted-foreground" />

      {availableFilters.timeRange && (
        <Select
          value={filters.timeRange || "24h"}
          onValueChange={(value) => onFilterChange("timeRange", value)}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Time Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">Last Hour</SelectItem>
            <SelectItem value="6h">Last 6 Hours</SelectItem>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      )}

      {availableFilters.metricType && (
        <Select
          value={filters.metricType || "all"}
          onValueChange={(value) => onFilterChange("metricType", value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Metric Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Metrics</SelectItem>
            <SelectItem value="api">API Calls</SelectItem>
            <SelectItem value="database">Database</SelectItem>
            <SelectItem value="edge_function">Edge Functions</SelectItem>
          </SelectContent>
        </Select>
      )}

      {availableFilters.severity && (
        <Select
          value={filters.severity || "all"}
          onValueChange={(value) => onFilterChange("severity", value)}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
      )}

      {availableFilters.status && (
        <Select
          value={filters.status || "all"}
          onValueChange={(value) => onFilterChange("status", value)}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="unresolved">Unresolved</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      )}

      {availableFilters.search && (
        <Input
          placeholder="Search..."
          value={filters.searchQuery || ""}
          onChange={(e) => onFilterChange("searchQuery", e.target.value)}
          className="w-48"
        />
      )}

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}

