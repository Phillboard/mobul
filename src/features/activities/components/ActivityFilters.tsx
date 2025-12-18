/**
 * Activity Filters Component
 * 
 * Provides filtering controls for activity lists.
 */

import { useState } from 'react';
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/shared/components/ui/select";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/shared/components/ui/popover";
import { Calendar } from "@/shared/components/ui/calendar";
import { 
  Filter, Search, Calendar as CalendarIcon, X, 
  Phone, Mail, MessageSquare, FileText, Send
} from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

// Activity types for filtering
const ACTIVITY_TYPES = [
  { value: 'call', label: 'Calls', icon: Phone },
  { value: 'email', label: 'Emails', icon: Mail },
  { value: 'meeting', label: 'Meetings', icon: CalendarIcon },
  { value: 'note', label: 'Notes', icon: MessageSquare },
  { value: 'sms', label: 'SMS', icon: Send },
  { value: 'whatsapp', label: 'WhatsApp', icon: Send },
  { value: 'postal_mail', label: 'Postal Mail', icon: FileText },
] as const;

const DIRECTIONS = [
  { value: 'inbound', label: 'Inbound' },
  { value: 'outbound', label: 'Outbound' },
] as const;

export interface ActivityFilterValues {
  search: string;
  activityTypes: string[];
  direction?: 'inbound' | 'outbound';
  dateRange?: DateRange;
  userId?: string;
}

interface ActivityFiltersProps {
  filters: ActivityFilterValues;
  onFiltersChange: (filters: ActivityFilterValues) => void;
  users?: Array<{ id: string; name: string }>;
}

export function ActivityFilters({
  filters,
  onFiltersChange,
  users = [],
}: ActivityFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilters = (updates: Partial<ActivityFilterValues>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const toggleActivityType = (type: string) => {
    const types = filters.activityTypes.includes(type)
      ? filters.activityTypes.filter(t => t !== type)
      : [...filters.activityTypes, type];
    updateFilters({ activityTypes: types });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      activityTypes: [],
      direction: undefined,
      dateRange: undefined,
      userId: undefined,
    });
  };

  const activeFilterCount = [
    filters.activityTypes.length > 0,
    filters.direction,
    filters.dateRange?.from,
    filters.userId,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Search and filter bar */}
      <div className="flex gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search activities..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="pl-9"
          />
        </div>

        {/* Filter button */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filters</h4>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear all
                </Button>
              </div>

              {/* Activity Types */}
              <div className="space-y-2">
                <Label>Activity Type</Label>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = filters.activityTypes.includes(type.value);
                    return (
                      <Badge
                        key={type.value}
                        variant={isSelected ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleActivityType(type.value)}
                      >
                        <Icon className="h-3 w-3 mr-1" />
                        {type.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Direction */}
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select
                  value={filters.direction || ''}
                  onValueChange={(value) => updateFilters({ 
                    direction: value ? value as 'inbound' | 'outbound' : undefined 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any direction</SelectItem>
                    {DIRECTIONS.map((dir) => (
                      <SelectItem key={dir.value} value={dir.value}>
                        {dir.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {filters.dateRange?.from ? (
                        filters.dateRange.to ? (
                          <>
                            {format(filters.dateRange.from, "MMM d")} -{" "}
                            {format(filters.dateRange.to, "MMM d, yyyy")}
                          </>
                        ) : (
                          format(filters.dateRange.from, "MMM d, yyyy")
                        )
                      ) : (
                        "Select date range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={filters.dateRange}
                      onSelect={(range) => updateFilters({ dateRange: range })}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* User filter */}
              {users.length > 0 && (
                <div className="space-y-2">
                  <Label>Logged By</Label>
                  <Select
                    value={filters.userId || ''}
                    onValueChange={(value) => updateFilters({ userId: value || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any user</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active filters display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.activityTypes.map((type) => (
            <Badge key={type} variant="secondary" className="gap-1">
              {ACTIVITY_TYPES.find(t => t.value === type)?.label || type}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => toggleActivityType(type)}
              />
            </Badge>
          ))}
          
          {filters.direction && (
            <Badge variant="secondary" className="gap-1">
              {filters.direction}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilters({ direction: undefined })}
              />
            </Badge>
          )}
          
          {filters.dateRange?.from && (
            <Badge variant="secondary" className="gap-1">
              {format(filters.dateRange.from, "MMM d")}
              {filters.dateRange.to && ` - ${format(filters.dateRange.to, "MMM d")}`}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilters({ dateRange: undefined })}
              />
            </Badge>
          )}
          
          {filters.userId && (
            <Badge variant="secondary" className="gap-1">
              User: {users.find(u => u.id === filters.userId)?.name || filters.userId}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilters({ userId: undefined })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

export default ActivityFilters;
