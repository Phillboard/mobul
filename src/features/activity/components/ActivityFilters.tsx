/**
 * ActivityFilters Component
 * 
 * Filter controls for activity logs by status, event type, etc.
 */

import { Filter, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import { Separator } from '@/shared/components/ui/separator';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { ActivityFilters as ActivityFiltersType, ActivityStatus, ActivitySeverity } from '../types/activity.types';

interface ActivityFiltersProps {
  filters: ActivityFiltersType;
  onFilterChange: (filters: Partial<ActivityFiltersType>) => void;
  availableEventTypes?: string[];
  showSeverity?: boolean;
}

const STATUS_OPTIONS: { value: ActivityStatus; label: string }[] = [
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending' },
  { value: 'cancelled', label: 'Cancelled' },
];

const SEVERITY_OPTIONS: { value: ActivitySeverity; label: string }[] = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'critical', label: 'Critical' },
];

export function ActivityFiltersPanel({
  filters,
  onFilterChange,
  availableEventTypes = [],
  showSeverity = false,
}: ActivityFiltersProps) {
  const activeStatusFilters = filters.status || [];
  const activeSeverityFilters = filters.severity || [];
  const activeEventTypeFilters = filters.event_types || [];

  const handleStatusToggle = (status: ActivityStatus) => {
    const current = filters.status || [];
    const newStatus = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    onFilterChange({ status: newStatus.length > 0 ? newStatus : undefined });
  };

  const handleSeverityToggle = (severity: ActivitySeverity) => {
    const current = filters.severity || [];
    const newSeverity = current.includes(severity)
      ? current.filter(s => s !== severity)
      : [...current, severity];
    onFilterChange({ severity: newSeverity.length > 0 ? newSeverity : undefined });
  };

  const handleEventTypeToggle = (eventType: string) => {
    const current = filters.event_types || [];
    const newTypes = current.includes(eventType)
      ? current.filter(t => t !== eventType)
      : [...current, eventType];
    onFilterChange({ event_types: newTypes.length > 0 ? newTypes : undefined });
  };

  const totalActiveFilters = 
    activeStatusFilters.length + 
    activeSeverityFilters.length + 
    activeEventTypeFilters.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
          {totalActiveFilters > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {totalActiveFilters}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-4">
            {/* Status Filters */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Status</h4>
              <div className="space-y-2">
                {STATUS_OPTIONS.map(({ value, label }) => (
                  <div key={value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${value}`}
                      checked={activeStatusFilters.includes(value)}
                      onCheckedChange={() => handleStatusToggle(value)}
                    />
                    <Label 
                      htmlFor={`status-${value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Severity Filters (for System tab) */}
            {showSeverity && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Severity</h4>
                  <div className="space-y-2">
                    {SEVERITY_OPTIONS.map(({ value, label }) => (
                      <div key={value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`severity-${value}`}
                          checked={activeSeverityFilters.includes(value)}
                          onCheckedChange={() => handleSeverityToggle(value)}
                        />
                        <Label 
                          htmlFor={`severity-${value}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Event Type Filters */}
            {availableEventTypes.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Event Type</h4>
                  <div className="space-y-2">
                    {availableEventTypes.map((eventType) => (
                      <div key={eventType} className="flex items-center space-x-2">
                        <Checkbox
                          id={`event-${eventType}`}
                          checked={activeEventTypeFilters.includes(eventType)}
                          onCheckedChange={() => handleEventTypeToggle(eventType)}
                        />
                        <Label 
                          htmlFor={`event-${eventType}`}
                          className="text-sm font-normal cursor-pointer capitalize"
                        >
                          {eventType.replace(/_/g, ' ')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// Quick filter chips that appear below the header
interface QuickFiltersProps {
  filters: ActivityFiltersType;
  onClearFilter: (key: keyof ActivityFiltersType) => void;
  onClearAll: () => void;
}

export function QuickFilters({ filters, onClearFilter, onClearAll }: QuickFiltersProps) {
  const hasFilters = 
    filters.search || 
    filters.status?.length || 
    filters.severity?.length || 
    filters.event_types?.length ||
    filters.date_range;

  if (!hasFilters) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">Active filters:</span>
      
      {filters.search && (
        <Badge variant="secondary" className="gap-1">
          Search: "{filters.search}"
          <button onClick={() => onClearFilter('search')}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {filters.status?.map(status => (
        <Badge key={status} variant="secondary" className="gap-1 capitalize">
          {status}
          <button onClick={() => onClearFilter('status')}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {filters.severity?.map(severity => (
        <Badge key={severity} variant="secondary" className="gap-1 capitalize">
          {severity}
          <button onClick={() => onClearFilter('severity')}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {filters.date_range && (
        <Badge variant="secondary" className="gap-1">
          Date range
          <button onClick={() => onClearFilter('date_range')}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      <Button variant="ghost" size="sm" onClick={onClearAll}>
        Clear all
      </Button>
    </div>
  );
}

export default ActivityFiltersPanel;
