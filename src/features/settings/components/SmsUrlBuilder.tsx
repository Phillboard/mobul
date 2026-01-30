/**
 * SMS URL Builder Component
 * 
 * Allows users to build URLs with pre-filled form data for SMS messages.
 * Supports ACE Forms, Redemption Pages, and Landing Pages.
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { 
  Plus, 
  X, 
  Copy, 
  Check, 
  Link2, 
  FileText,
  ExternalLink,
  Info,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { toast } from 'sonner';

type TargetType = 'ace_form' | 'redemption' | 'landing_page';

interface UrlBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsertLink: (url: string) => void;
  clientId: string | null;
}

interface PreFillField {
  id: string;
  key: string;
  value: string;
}

// Available SMS variables for pre-fill values
const SMS_VARIABLES = [
  { value: '{first_name}', label: 'First Name' },
  { value: '{last_name}', label: 'Last Name' },
  { value: '{phone}', label: 'Phone' },
  { value: '{email}', label: 'Email' },
  { value: '{code}', label: 'Gift Card Code' },
  { value: '{value}', label: 'Gift Card Value' },
  { value: '{company}', label: 'Company Name' },
];

export function SmsUrlBuilder({
  open,
  onOpenChange,
  onInsertLink,
  clientId,
}: UrlBuilderProps) {
  const [targetType, setTargetType] = useState<TargetType>('ace_form');
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [preFillFields, setPreFillFields] = useState<PreFillField[]>([]);
  const [copied, setCopied] = useState(false);

  // Fetch ACE Forms for the client
  const { data: forms, isLoading: formsLoading } = useQuery({
    queryKey: ['ace-forms-for-url-builder', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('ace_forms')
        .select('id, name, form_config, is_draft, is_active')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId && open,
  });

  // Get fields from selected form
  const selectedForm = forms?.find(f => f.id === selectedFormId);
  const formFields = useMemo(() => {
    if (!selectedForm?.form_config?.fields) return [];
    return selectedForm.form_config.fields.map((field: any) => ({
      id: field.id,
      label: field.label,
      type: field.type,
    }));
  }, [selectedForm]);

  // Build the URL
  const generatedUrl = useMemo(() => {
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://app.mobilace.com';

    if (targetType === 'redemption') {
      const params = new URLSearchParams();
      preFillFields.forEach(field => {
        if (field.key && field.value) {
          params.append(field.key, field.value);
        }
      });
      const queryString = params.toString();
      return `${baseUrl}/redeem-gift-card${queryString ? `?${queryString}` : ''}`;
    }

    if (targetType === 'ace_form' && selectedForm?.id) {
      const params = new URLSearchParams();
      preFillFields.forEach(field => {
        if (field.key && field.value) {
          params.append(field.key, field.value);
        }
      });
      const queryString = params.toString();
      return `${baseUrl}/forms/${selectedForm.id}${queryString ? `?${queryString}` : ''}`;
    }

    return '';
  }, [targetType, selectedForm, preFillFields]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPreFillFields([]);
      setCopied(false);
    }
  }, [open]);

  // Auto-add suggested fields based on target type
  useEffect(() => {
    if (targetType === 'redemption' && preFillFields.length === 0) {
      setPreFillFields([
        { id: '1', key: 'code', value: '{code}' },
      ]);
    }
  }, [targetType, preFillFields.length]);

  const addField = () => {
    setPreFillFields([
      ...preFillFields,
      { id: Date.now().toString(), key: '', value: '' },
    ]);
  };

  const removeField = (id: string) => {
    setPreFillFields(preFillFields.filter(f => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<PreFillField>) => {
    setPreFillFields(preFillFields.map(f => 
      f.id === id ? { ...f, ...updates } : f
    ));
  };

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
    // Insert the actual generated URL into the template
    onInsertLink(generatedUrl);
    onOpenChange(false);
    toast.success('Link inserted into template');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Build Pre-fill Link
          </DialogTitle>
          <DialogDescription>
            Create a URL with pre-filled data using SMS variables. The link will be shortened by Twilio when sent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Target Type Selection */}
          <div className="space-y-2">
            <Label>Link Target</Label>
            <Select value={targetType} onValueChange={(v) => setTargetType(v as TargetType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[9999]">
                <SelectItem value="ace_form">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    ACE Form
                  </div>
                </SelectItem>
                <SelectItem value="redemption">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Gift Card Redemption Page
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Form Selection (for ACE Forms) */}
          {targetType === 'ace_form' && (
            <div className="space-y-2">
              <Label>Select Form {forms && `(${forms.length} available)`}</Label>
              {formsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : !forms || forms.length === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No active forms found. Create a form and save it first.
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
                  <SelectContent 
                    position="popper" 
                    side="bottom"
                    sideOffset={4}
                    className="z-[9999] max-h-[300px] overflow-y-auto"
                  >
                    {forms.map(form => (
                      <SelectItem 
                        key={form.id} 
                        value={form.id}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span>{form.name || `Unnamed Form (${form.id.slice(0, 8)})`}</span>
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

          {/* Pre-fill Fields */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Pre-fill Fields</Label>
              <Button variant="outline" size="sm" onClick={addField}>
                <Plus className="h-3 w-3 mr-1" />
                Add Field
              </Button>
            </div>

            {preFillFields.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                No pre-fill fields added. Click "Add Field" to start.
              </p>
            ) : (
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {preFillFields.map((field) => (
                    <div key={field.id} className="flex items-center gap-2">
                      {/* Field Name */}
                      {targetType === 'ace_form' && formFields.length > 0 ? (
                        <Select
                          value={field.key}
                          onValueChange={(v) => updateField(field.id, { key: v })}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Field..." />
                          </SelectTrigger>
                          <SelectContent position="popper" className="z-[9999]">
                            {formFields.map((f: any) => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={field.key}
                          onChange={(e) => updateField(field.id, { key: e.target.value })}
                          placeholder="Field name"
                          className="w-[180px]"
                        />
                      )}

                      <span className="text-muted-foreground">=</span>

                      {/* Value (SMS Variable or Custom) */}
                      <Select
                        value={field.value}
                        onValueChange={(v) => updateField(field.id, { value: v })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select variable..." />
                        </SelectTrigger>
                        <SelectContent position="popper" className="z-[9999]">
                          {SMS_VARIABLES.map(v => (
                            <SelectItem key={v.value} value={v.value}>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono">
                                  {v.value}
                                </Badge>
                                {v.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeField(field.id)}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* URL Preview */}
          {generatedUrl && (
            <div className="space-y-2">
              <Label>Preview URL</Label>
              <div className="p-3 bg-muted rounded-lg font-mono text-xs break-all">
                {generatedUrl}
              </div>
              <p className="text-xs text-muted-foreground">
                Variables like {'{first_name}'} will be replaced with actual values when the SMS is sent.
                Twilio will automatically shorten this URL.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
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
          <Button onClick={handleInsert} disabled={!generatedUrl}>
            <Link2 className="h-4 w-4 mr-2" />
            Insert Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SmsUrlBuilder;
