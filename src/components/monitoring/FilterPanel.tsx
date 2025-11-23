import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface FilterPanelProps {
  filters: {
    timeRange?: string;
    severity?: string;
    status?: string;
    metricType?: string;
    searchQuery?: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  availableFilters: {
    timeRange?: boolean;
    severity?: boolean;
    status?: boolean;
    metricType?: boolean;
    search?: boolean;
  };
}

export function FilterPanel({ 
  filters, 
  onFilterChange, 
  onClearFilters,
  availableFilters 
}: FilterPanelProps) {
  const hasActiveFilters = Object.values(filters).some(v => v && v !== "all");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Filters</CardTitle>
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onClearFilters}
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {availableFilters.timeRange && (
          <div className="space-y-2">
            <Label>Time Range</Label>
            <Select 
              value={filters.timeRange || "24h"} 
              onValueChange={(value) => onFilterChange("timeRange", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="6h">Last 6 Hours</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {availableFilters.severity && (
          <div className="space-y-2">
            <Label>Severity</Label>
            <Select 
              value={filters.severity || "all"} 
              onValueChange={(value) => onFilterChange("severity", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {availableFilters.status && (
          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              value={filters.status || "all"} 
              onValueChange={(value) => onFilterChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="unresolved">Unresolved</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {availableFilters.metricType && (
          <div className="space-y-2">
            <Label>Metric Type</Label>
            <Select 
              value={filters.metricType || "all"} 
              onValueChange={(value) => onFilterChange("metricType", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="page_load">Page Load</SelectItem>
                <SelectItem value="api_response">API Response</SelectItem>
                <SelectItem value="edge_function">Edge Function</SelectItem>
                <SelectItem value="database_query">Database Query</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {availableFilters.search && (
          <div className="space-y-2">
            <Label>Search</Label>
            <Input
              placeholder="Search by message..."
              value={filters.searchQuery || ""}
              onChange={(e) => onFilterChange("searchQuery", e.target.value)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
