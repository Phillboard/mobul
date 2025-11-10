import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface TemplateFiltersProps {
  selectedSize: string;
  selectedIndustry: string;
  onSizeChange: (value: string) => void;
  onIndustryChange: (value: string) => void;
}

export function TemplateFilters({
  selectedSize,
  selectedIndustry,
  onSizeChange,
  onIndustryChange,
}: TemplateFiltersProps) {
  return (
    <div className="flex gap-4 items-end">
      <div className="flex-1 max-w-xs">
        <Label htmlFor="size-filter">Size</Label>
        <Select value={selectedSize} onValueChange={onSizeChange}>
          <SelectTrigger id="size-filter">
            <SelectValue placeholder="All sizes" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="all">All sizes</SelectItem>
            <SelectItem value="4x6">4×6 Postcard</SelectItem>
            <SelectItem value="6x9">6×9 Postcard</SelectItem>
            <SelectItem value="6x11">6×11 Postcard</SelectItem>
            <SelectItem value="letter">Letter (#10)</SelectItem>
            <SelectItem value="trifold">Tri-fold Self-Mailer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 max-w-xs">
        <Label htmlFor="industry-filter">Industry</Label>
        <Select value={selectedIndustry} onValueChange={onIndustryChange}>
          <SelectTrigger id="industry-filter">
            <SelectValue placeholder="All industries" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="all">All industries</SelectItem>
            <SelectItem value="roofing">Roofing</SelectItem>
            <SelectItem value="rei">Real Estate Investment</SelectItem>
            <SelectItem value="auto_service">Auto Service</SelectItem>
            <SelectItem value="auto_warranty">Auto Warranty</SelectItem>
            <SelectItem value="auto_buyback">Auto Buyback</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
