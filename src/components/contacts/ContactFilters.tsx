import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ContactFilters as ContactFiltersType, LifecycleStage } from "@/types/contacts";

interface ContactFiltersProps {
  filters: ContactFiltersType;
  onFiltersChange: (filters: ContactFiltersType) => void;
}

const lifecycleStages: { value: LifecycleStage; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "mql", label: "Marketing Qualified" },
  { value: "sql", label: "Sales Qualified" },
  { value: "opportunity", label: "Opportunity" },
  { value: "customer", label: "Customer" },
  { value: "evangelist", label: "Evangelist" },
];

export function ContactFilters({ filters, onFiltersChange }: ContactFiltersProps) {
  const [open, setOpen] = useState(false);

  const toggleLifecycleStage = (stage: LifecycleStage) => {
    const current = filters.lifecycle_stage || [];
    const updated = current.includes(stage)
      ? current.filter((s) => s !== stage)
      : [...current, stage];
    onFiltersChange({ ...filters, lifecycle_stage: updated.length > 0 ? updated : undefined });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const activeFilterCount = [
    filters.lifecycle_stage?.length,
    filters.has_email !== undefined ? 1 : 0,
    filters.has_phone !== undefined ? 1 : 0,
    filters.do_not_contact !== undefined ? 1 : 0,
  ].filter(Boolean).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="ml-2" variant="secondary">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filters</h4>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-auto p-0 text-sm"
              >
                Clear all
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Lifecycle Stage</Label>
            <div className="space-y-2">
              {lifecycleStages.map((stage) => (
                <div key={stage.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`stage-${stage.value}`}
                    checked={filters.lifecycle_stage?.includes(stage.value)}
                    onCheckedChange={() => toggleLifecycleStage(stage.value)}
                  />
                  <label
                    htmlFor={`stage-${stage.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {stage.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Contact Information</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_email"
                  checked={filters.has_email === true}
                  onCheckedChange={(checked) =>
                    onFiltersChange({
                      ...filters,
                      has_email: checked ? true : undefined,
                    })
                  }
                />
                <label htmlFor="has_email" className="text-sm cursor-pointer">
                  Has Email
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_phone"
                  checked={filters.has_phone === true}
                  onCheckedChange={(checked) =>
                    onFiltersChange({
                      ...filters,
                      has_phone: checked ? true : undefined,
                    })
                  }
                />
                <label htmlFor="has_phone" className="text-sm cursor-pointer">
                  Has Phone
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="do_not_contact"
                checked={filters.do_not_contact === true}
                onCheckedChange={(checked) =>
                  onFiltersChange({
                    ...filters,
                    do_not_contact: checked ? true : undefined,
                  })
                }
              />
              <label htmlFor="do_not_contact" className="text-sm cursor-pointer">
                Do Not Contact
              </label>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
