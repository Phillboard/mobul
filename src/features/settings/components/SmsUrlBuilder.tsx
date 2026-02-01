/**
 * SMS URL Builder Component
 * 
 * Allows users to build URLs with pre-filled form data for SMS messages.
 * Features:
 * - Shows all form fields as toggleable list
 * - Smart variable suggestions based on field type/label
 * - Uses field UUIDs as URL param keys for reliable matching
 * - Supports all recipient data including custom fields
 * - Syntax-highlighted URL preview
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Separator } from '@/shared/components/ui/separator';
import { 
  Copy, 
  Check, 
  Link2, 
  FileText,
  Info,
  ArrowRight,
  Gift,
  User,
  MapPin,
  CreditCard,
  Building2,
  Settings2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { toast } from 'sonner';
import { cn } from '@/shared/utils/cn';

// =============================================================================
// Types
// =============================================================================

type TargetType = 'form' | 'redemption';
type VariableCategory = 'recipient' | 'address' | 'gift_card' | 'client' | 'custom';

interface UrlBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsertLink: (url: string) => void;
  clientId: string | null;
}

interface FormFieldInfo {
  id: string;
  label: string;
  type: string;
}

interface FieldMapping {
  fieldId: string;
  fieldLabel: string;
  fieldType: string;
  enabled: boolean;
  variable: string;
  isCustomVariable: boolean;
}

interface SmsVariable {
  value: string;
  label: string;
  category: VariableCategory;
  matchTypes: string[];
  matchLabels: string[];
}

// =============================================================================
// Constants
// =============================================================================

// SMS variables with matching metadata for smart suggestions
// Organized by category for better UX
const SMS_VARIABLES: SmsVariable[] = [
  // Recipient identity
  { value: '{first_name}', label: 'First Name', category: 'recipient', matchTypes: [], matchLabels: ['first', 'fname'] },
  { value: '{last_name}', label: 'Last Name', category: 'recipient', matchTypes: [], matchLabels: ['last', 'lname'] },
  { value: '{email}', label: 'Email', category: 'recipient', matchTypes: ['email'], matchLabels: ['email'] },
  { value: '{phone}', label: 'Phone', category: 'recipient', matchTypes: ['phone'], matchLabels: ['phone', 'mobile', 'cell'] },
  { value: '{recipient_company}', label: 'Recipient Company', category: 'recipient', matchTypes: [], matchLabels: ['company', 'business', 'organization'] },
  
  // Recipient address
  { value: '{address1}', label: 'Address Line 1', category: 'address', matchTypes: [], matchLabels: ['address', 'street'] },
  { value: '{address2}', label: 'Address Line 2', category: 'address', matchTypes: [], matchLabels: ['apt', 'suite', 'unit'] },
  { value: '{city}', label: 'City', category: 'address', matchTypes: [], matchLabels: ['city'] },
  { value: '{state}', label: 'State', category: 'address', matchTypes: [], matchLabels: ['state'] },
  { value: '{zip}', label: 'ZIP Code', category: 'address', matchTypes: [], matchLabels: ['zip', 'postal'] },
  
  // Gift card
  { value: '{code}', label: 'Gift Card Code', category: 'gift_card', matchTypes: ['gift-card-code'], matchLabels: ['code', 'redemption', 'unique'] },
  { value: '{value}', label: 'Gift Card Value', category: 'gift_card', matchTypes: [], matchLabels: ['value', 'amount'] },
  { value: '{brand}', label: 'Gift Card Brand', category: 'gift_card', matchTypes: [], matchLabels: ['brand', 'provider'] },
  
  // Client/business
  { value: '{client_name}', label: 'Client Company Name', category: 'client', matchTypes: [], matchLabels: [] },
];

// Category metadata for grouping in dropdown
const VARIABLE_CATEGORIES: Record<VariableCategory, { label: string; icon: React.ReactNode }> = {
  recipient: { label: 'Recipient Info', icon: <User className="h-3 w-3" /> },
  address: { label: 'Address', icon: <MapPin className="h-3 w-3" /> },
  gift_card: { label: 'Gift Card', icon: <CreditCard className="h-3 w-3" /> },
  client: { label: 'Client/Business', icon: <Building2 className="h-3 w-3" /> },
  custom: { label: 'Custom Fields', icon: <Settings2 className="h-3 w-3" /> },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Suggests an SMS variable based on field type and label
 */
function suggestVariable(field: FormFieldInfo): string {
  const labelLower = field.label.toLowerCase();
  
  for (const variable of SMS_VARIABLES) {
    // Match by field type first (most reliable)
    if (variable.matchTypes.includes(field.type)) {
      return variable.value;
    }
    // Match by label keywords
    if (variable.matchLabels.some(keyword => labelLower.includes(keyword))) {
      return variable.value;
    }
  }
  
  return ''; // No suggestion
}

/**
 * Parses URL into base and query params for syntax highlighting
 */
function parseUrlForDisplay(url: string): { base: string; params: Array<{ key: string; value: string }> } {
  if (!url.includes('?')) {
    return { base: url, params: [] };
  }
  
  const [base, queryString] = url.split('?');
  const params: Array<{ key: string; value: string }> = [];
  
  if (queryString) {
    queryString.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) {
        params.push({ key, value: decodeURIComponent(value) });
      }
    });
  }
  
  return { base, params };
}

/**
 * Groups variables by category
 */
function getVariablesByCategory(): Record<VariableCategory, SmsVariable[]> {
  const grouped: Record<VariableCategory, SmsVariable[]> = {
    recipient: [],
    address: [],
    gift_card: [],
    client: [],
    custom: [],
  };
  
  for (const variable of SMS_VARIABLES) {
    grouped[variable.category].push(variable);
  }
  
  return grouped;
}

// =============================================================================
// Component
// =============================================================================

export function SmsUrlBuilder({
  open,
  onOpenChange,
  onInsertLink,
  clientId,
}: UrlBuilderProps) {
  // State
  const [targetType, setTargetType] = useState<TargetType>('form');
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [copied, setCopied] = useState(false);

  // Grouped variables for dropdown
  const variablesByCategory = useMemo(() => getVariablesByCategory(), []);

  // Fetch Forms for the client
  const { data: forms, isLoading: formsLoading } = useQuery({
    queryKey: ['forms-for-url-builder', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('ace_forms')
        .select('id, name, form_config, is_draft, is_active')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      // Ensure form_config is properly parsed
      return (data || []).map(form => ({
        ...form,
        form_config: typeof form.form_config === 'string' 
          ? JSON.parse(form.form_config) 
          : form.form_config
      }));
    },
    enabled: !!clientId && open,
  });

  // Get selected form and its fields
  const selectedForm = forms?.find(f => f.id === selectedFormId);
  const formFields = useMemo((): FormFieldInfo[] => {
    if (!selectedForm?.form_config?.fields) return [];
    return selectedForm.form_config.fields.map((field: any) => ({
      id: field.id,
      label: field.label || 'Unnamed Field',
      type: field.type || 'text',
    }));
  }, [selectedForm]);

  // Generate field mappings when form is selected
  useEffect(() => {
    if (targetType === 'form' && formFields.length > 0) {
      const mappings: FieldMapping[] = formFields.map(field => {
        const suggestion = suggestVariable(field);
        return {
          fieldId: field.id,
          fieldLabel: field.label,
          fieldType: field.type,
          enabled: suggestion !== '', // Auto-enable if we have a suggestion
          variable: suggestion,
          isCustomVariable: false,
        };
      });
      setFieldMappings(mappings);
    } else {
      setFieldMappings([]);
    }
  }, [selectedForm?.id, formFields, targetType]);

  // Build the URL
  const generatedUrl = useMemo(() => {
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://app.mobilace.com';

    if (targetType === 'redemption') {
      // Redemption page always uses code param
      return `${baseUrl}/redeem-gift-card?code={code}`;
    }

    if (targetType === 'form' && selectedForm?.id) {
      const params = new URLSearchParams();
      
      // Use field UUID as the param key for reliable direct matching
      // The SMS engine will replace {variable} with actual values
      // FormPublic will match UUID directly to field.id
      fieldMappings
        .filter(m => m.enabled && m.variable)
        .forEach(m => {
          params.append(m.fieldId, m.variable);
        });
      
      const queryString = params.toString();
      return `${baseUrl}/forms/${selectedForm.id}${queryString ? `?${queryString}` : ''}`;
    }

    return '';
  }, [targetType, selectedForm?.id, fieldMappings]);

  // Parse URL for syntax highlighting
  const urlParts = useMemo(() => parseUrlForDisplay(generatedUrl), [generatedUrl]);

  // Count enabled fields
  const enabledCount = fieldMappings.filter(m => m.enabled && m.variable).length;

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedFormId('');
      setFieldMappings([]);
      setCopied(false);
    }
  }, [open]);

  // Update a single field mapping
  const updateMapping = (fieldId: string, updates: Partial<FieldMapping>) => {
    setFieldMappings(prev => prev.map(m =>
      m.fieldId === fieldId ? { ...m, ...updates } : m
    ));
  };

  // Handle custom variable input
  const handleCustomVariableInput = (fieldId: string, value: string) => {
    // If user clears the input, reset to non-custom mode
    if (!value.trim()) {
      updateMapping(fieldId, { variable: '', isCustomVariable: false });
      return;
    }
    
    // Ensure proper format: wrap in braces if not already
    let formattedValue = value.trim();
    if (!formattedValue.startsWith('{')) {
      formattedValue = `{${formattedValue}`;
    }
    if (!formattedValue.endsWith('}')) {
      formattedValue = `${formattedValue}}`;
    }
    
    updateMapping(fieldId, { 
      variable: formattedValue, 
      enabled: true,
      isCustomVariable: true 
    });
  };

  // Handlers
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      toast.success('URL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy URL');
    }
  };

  const handleInsert = () => {
    if (!generatedUrl) return;
    onInsertLink(generatedUrl);
    onOpenChange(false);
    toast.success('Link inserted into template');
  };

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Build Pre-fill Link
          </DialogTitle>
          <DialogDescription>
            Create a URL that pre-fills form fields with recipient data from your database.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-2">
          {/* Target Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Link Target</Label>
            <Select 
              value={targetType} 
              onValueChange={(v) => {
                setTargetType(v as TargetType);
                setSelectedFormId('');
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="form">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Form</span>
                  </div>
                </SelectItem>
                <SelectItem value="redemption">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    <span>Gift Card Redemption Page</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Form Selection */}
          {targetType === 'form' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Select Form
                {forms && forms.length > 0 && (
                  <span className="ml-2 text-muted-foreground font-normal">
                    ({forms.length} available)
                  </span>
                )}
              </Label>
              {formsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : !forms || forms.length === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No active forms found. Create and publish a form first.
                  </AlertDescription>
                </Alert>
              ) : (
                <Select 
                  value={selectedFormId} 
                  onValueChange={setSelectedFormId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a form..." />
                  </SelectTrigger>
                  <SelectContent>
                    {forms.map(form => (
                      <SelectItem key={form.id} value={form.id}>
                        <div className="flex items-center gap-2">
                          <span>{form.name || `Unnamed Form`}</span>
                          {form.is_draft && (
                            <Badge variant="secondary" className="text-xs">Draft</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Field Mappings - Only for Forms */}
          {targetType === 'form' && selectedFormId && (
            <>
              <Separator />
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Map Form Fields to Recipient Data</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select which data to pre-fill for each form field. Use custom fields for data like car type or roof age.
                  </p>
                </div>
                
                {formFields.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      This form has no fields configured. Add fields in the Form Builder first.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="border rounded-lg divide-y max-h-[280px] overflow-y-auto">
                    {fieldMappings.map((mapping) => (
                      <div 
                        key={mapping.fieldId}
                        className={cn(
                          "flex items-center gap-3 p-3 transition-colors",
                          mapping.enabled && mapping.variable 
                            ? "bg-primary/5" 
                            : "hover:bg-muted/50"
                        )}
                      >
                        {/* Enable checkbox */}
                        <Checkbox
                          id={`enable-${mapping.fieldId}`}
                          checked={mapping.enabled}
                          onCheckedChange={(checked) => {
                            updateMapping(mapping.fieldId, { enabled: !!checked });
                          }}
                        />
                        
                        {/* Field label */}
                        <label 
                          htmlFor={`enable-${mapping.fieldId}`}
                          className={cn(
                            "min-w-[120px] text-sm font-medium cursor-pointer truncate",
                            !mapping.enabled && "text-muted-foreground"
                          )}
                          title={mapping.fieldLabel}
                        >
                          {mapping.fieldLabel}
                        </label>
                        
                        {/* Arrow */}
                        <ArrowRight className={cn(
                          "h-4 w-4 shrink-0",
                          mapping.enabled ? "text-primary" : "text-muted-foreground/50"
                        )} />
                        
                        {/* Variable selector or custom input */}
                        <div className="flex-1 flex gap-2">
                          {mapping.isCustomVariable ? (
                            <div className="flex-1 flex gap-2">
                              <Input
                                value={mapping.variable}
                                onChange={(e) => handleCustomVariableInput(mapping.fieldId, e.target.value)}
                                placeholder="{custom.field_name}"
                                className="flex-1 font-mono text-xs h-9"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateMapping(mapping.fieldId, { isCustomVariable: false, variable: '' })}
                                className="h-9 px-2 text-xs"
                              >
                                Preset
                              </Button>
                            </div>
                          ) : (
                            <div className="flex-1 flex gap-2">
                              <Select
                                value={mapping.variable}
                                onValueChange={(value) => {
                                  if (value === '__custom__') {
                                    updateMapping(mapping.fieldId, { isCustomVariable: true, variable: '' });
                                  } else {
                                    updateMapping(mapping.fieldId, { 
                                      variable: value, 
                                      enabled: true,
                                      isCustomVariable: false,
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger 
                                  className={cn(
                                    "flex-1",
                                    !mapping.enabled && "opacity-50"
                                  )}
                                >
                                  <SelectValue placeholder="Select data source..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                  {/* Grouped variables */}
                                  {(Object.keys(variablesByCategory) as VariableCategory[]).map(category => {
                                    const variables = variablesByCategory[category];
                                    if (variables.length === 0 && category !== 'custom') return null;
                                    
                                    const categoryInfo = VARIABLE_CATEGORIES[category];
                                    
                                    return (
                                      <SelectGroup key={category}>
                                        <SelectLabel className="flex items-center gap-2 text-xs">
                                          {categoryInfo.icon}
                                          {categoryInfo.label}
                                        </SelectLabel>
                                        {variables.map(v => (
                                          <SelectItem key={v.value} value={v.value}>
                                            <div className="flex items-center gap-2">
                                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                                                {v.value}
                                              </code>
                                              <span className="text-muted-foreground text-xs">
                                                {v.label}
                                              </span>
                                            </div>
                                          </SelectItem>
                                        ))}
                                        {/* Custom option at the end of the list */}
                                        {category === 'custom' && (
                                          <SelectItem value="__custom__">
                                            <div className="flex items-center gap-2">
                                              <code className="text-xs bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 rounded font-mono">
                                                {'{custom.*}'}
                                              </code>
                                              <span className="text-muted-foreground text-xs">
                                                Enter custom field...
                                              </span>
                                            </div>
                                          </SelectItem>
                                        )}
                                      </SelectGroup>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {enabledCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {enabledCount} field{enabledCount !== 1 ? 's' : ''} will be pre-filled
                  </p>
                )}
              </div>
            </>
          )}

          {/* Redemption Info */}
          {targetType === 'redemption' && (
            <>
              <Separator />
              <Alert>
                <Gift className="h-4 w-4" />
                <AlertDescription>
                  The redemption page URL will include <code className="bg-muted px-1 rounded font-mono">{'{code}'}</code> which 
                  will be replaced with the gift card code when the SMS is sent.
                </AlertDescription>
              </Alert>
            </>
          )}

          {/* URL Preview */}
          {generatedUrl && (
            <>
              <Separator />
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Generated URL</Label>
                <div className="p-4 bg-muted/50 rounded-lg border overflow-x-auto">
                  <code className="text-xs break-all">
                    {/* Base URL */}
                    <span className="text-foreground">{urlParts.base}</span>
                    {/* Query params with syntax highlighting */}
                    {urlParts.params.length > 0 && (
                      <>
                        {urlParts.params.map((param, i) => (
                          <span key={i}>
                            <span className="text-muted-foreground">{i === 0 ? '?' : '&'}</span>
                            <span className="text-blue-600 dark:text-blue-400">{param.key}</span>
                            <span className="text-muted-foreground">=</span>
                            <span className="text-amber-600 dark:text-amber-400">{param.value}</span>
                          </span>
                        ))}
                      </>
                    )}
                  </code>
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-amber-600 dark:text-amber-400 font-mono">{'{variables}'}</span> are 
                  replaced with actual recipient data when the SMS is sent.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleCopy}
            disabled={!generatedUrl}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy URL
              </>
            )}
          </Button>
          <Button 
            onClick={handleInsert} 
            disabled={!generatedUrl}
          >
            <Link2 className="h-4 w-4 mr-2" />
            Insert Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SmsUrlBuilder;
