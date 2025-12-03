import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface ColumnMappingDialogProps {
  csvHeaders: string[];
  detectedMappings: Record<string, string>;
  onMappingChange: (csvColumn: string, targetField: string) => void;
}

// Standard contact fields that can be mapped to
const CONTACT_FIELDS = [
  { value: 'skip', label: 'Skip this column', group: 'Action' },
  { value: 'customer_code', label: 'Unique Code (Required)', group: 'Required', required: true },
  { value: 'first_name', label: 'First Name', group: 'Basic Info' },
  { value: 'last_name', label: 'Last Name', group: 'Basic Info' },
  { value: 'email', label: 'Email', group: 'Basic Info' },
  { value: 'phone', label: 'Phone', group: 'Contact' },
  { value: 'mobile_phone', label: 'Mobile Phone', group: 'Contact' },
  { value: 'company', label: 'Company', group: 'Professional' },
  { value: 'job_title', label: 'Job Title', group: 'Professional' },
  { value: 'address', label: 'Address Line 1', group: 'Address' },
  { value: 'address2', label: 'Address Line 2', group: 'Address' },
  { value: 'city', label: 'City', group: 'Address' },
  { value: 'state', label: 'State/Province', group: 'Address' },
  { value: 'zip', label: 'ZIP/Postal Code', group: 'Address' },
  { value: 'country', label: 'Country', group: 'Address' },
  { value: 'lifecycle_stage', label: 'Lifecycle Stage', group: 'Marketing' },
  { value: 'lead_source', label: 'Lead Source', group: 'Marketing' },
  { value: 'lead_score', label: 'Lead Score', group: 'Marketing' },
  { value: 'do_not_contact', label: 'Do Not Contact', group: 'Preferences' },
  { value: 'email_opt_out', label: 'Email Opt-Out', group: 'Preferences' },
  { value: 'sms_opt_out', label: 'SMS Opt-Out', group: 'Preferences' },
  { value: 'notes', label: 'Notes', group: 'Other' },
];

export function ColumnMappingDialog({ 
  csvHeaders, 
  detectedMappings, 
  onMappingChange 
}: ColumnMappingDialogProps) {
  // Get already mapped fields to prevent duplicates
  const mappedFields = new Set(Object.values(detectedMappings).filter(v => v));
  
  // Filter out empty headers to prevent SelectItem value errors
  const validHeaders = csvHeaders.filter(header => header && header.trim() !== '');

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Map your CSV columns to contact fields. Only <Badge variant="destructive" className="mx-1">Unique Code</Badge> is required.
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {validHeaders.map((header, index) => {
          const currentMapping = detectedMappings[header] || 'skip';
          const isRequired = currentMapping === 'customer_code';

          return (
            <div key={index} className="grid grid-cols-2 gap-4 items-center p-3 border rounded-lg bg-muted/30">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CSV Column</Label>
                <div className="font-medium flex items-center gap-2">
                  {header}
                  {isRequired && <Badge variant="destructive" className="text-xs">Required</Badge>}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor={`mapping-${index}`} className="text-xs text-muted-foreground">
                  Maps to
                </Label>
                <Select
                  value={currentMapping}
                  onValueChange={(value) => onMappingChange(header, value)}
                >
                  <SelectTrigger id={`mapping-${index}`}>
                    <SelectValue placeholder="Select field..." />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Group fields by category */}
                    {['Action', 'Required', 'Basic Info', 'Contact', 'Professional', 'Address', 'Marketing', 'Preferences', 'Other'].map((group) => {
                      const groupFields = CONTACT_FIELDS.filter(f => f.group === group);
                      if (groupFields.length === 0) return null;

                      return (
                        <div key={group}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            {group}
                          </div>
                          {groupFields.map((field) => {
                            const isDisabled = field.value !== 'skip' && 
                                             field.value !== currentMapping && 
                                             mappedFields.has(field.value);
                            
                            return (
                              <SelectItem
                                key={field.value}
                                value={field.value}
                                disabled={isDisabled}
                              >
                                {field.label}
                                {isDisabled && ' (already mapped)'}
                              </SelectItem>
                            );
                          })}
                        </div>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

