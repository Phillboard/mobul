import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { CustomFieldDefinition } from '@/features/contacts/hooks';
import { Calendar } from "@/shared/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Button } from "@/shared/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface CustomFieldInputProps {
  field: CustomFieldDefinition;
  value: any;
  onChange: (value: any) => void;
}

export function CustomFieldInput({ field, value, onChange }: CustomFieldInputProps) {
  switch (field.field_type) {
    case 'text':
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium">{field.field_label}</label>
          <Input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.default_value}
            required={field.is_required}
          />
        </div>
      );

    case 'email':
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium">{field.field_label}</label>
          <Input
            type="email"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.default_value}
            required={field.is_required}
          />
        </div>
      );

    case 'url':
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium">{field.field_label}</label>
          <Input
            type="url"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.default_value}
            required={field.is_required}
          />
        </div>
      );

    case 'number':
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium">{field.field_label}</label>
          <Input
            type="number"
            value={value || ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            placeholder={field.default_value}
            required={field.is_required}
          />
        </div>
      );

    case 'date':
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium">{field.field_label}</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => onChange(date ? date.toISOString() : null)}
              />
            </PopoverContent>
          </Popover>
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={field.field_name}
            checked={!!value}
            onCheckedChange={onChange}
          />
          <label htmlFor={field.field_name} className="text-sm font-medium">
            {field.field_label}
          </label>
        </div>
      );

    case 'select':
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium">{field.field_label}</label>
          <Select value={value || ""} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.field_label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'multi-select':
      const selectedValues = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium">{field.field_label}</label>
          <div className="space-y-2 border rounded-md p-3">
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.field_name}-${option}`}
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onChange([...selectedValues, option]);
                    } else {
                      onChange(selectedValues.filter((v) => v !== option));
                    }
                  }}
                />
                <label htmlFor={`${field.field_name}-${option}`} className="text-sm">
                  {option}
                </label>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}