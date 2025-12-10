/**
 * CreateListWithCSVDialog - Dialog for creating a new contact list with CSV import
 * 
 * Features:
 * - Drag and drop CSV upload
 * - Smart column mapping with unique_code requirement
 * - Auto-generate codes option
 * - Creates list and imports contacts in one flow
 */

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Upload,
  AlertCircle,
  CheckCircle,
  Info,
  Download,
  FileSpreadsheet,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useSmartCSVParser, ParsedCSVData } from '@/features/contacts/hooks';
import { UniqueCodeService } from '@/core/services/uniqueCodeService';
import { CSVTemplateGenerator } from '@shared/utils/csv';
import { supabase } from '@core/services/supabase';
import { toast } from 'sonner';

interface CreateListWithCSVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onListCreated: (listId: string, listName: string) => void;
}

type Step = 'name' | 'upload' | 'mapping' | 'importing' | 'complete';

// Standard contact fields for mapping
// Validation regex matching database constraint: ^[A-Za-z0-9][A-Za-z0-9\-_]+$
const UNIQUE_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-_]+$/;

interface ValidationResult {
  isValid: boolean;
  validCodes: number;
  invalidCodes: { row: number; code: string; reason: string }[];
  emptyCodes: number[];
}

// Validate a single unique code against database constraints
function validateUniqueCode(code: string | undefined | null): { valid: boolean; reason: string } {
  if (!code || code.toString().trim() === '') {
    return { valid: false, reason: 'Empty or missing code' };
  }
  
  const trimmedCode = code.toString().trim();
  
  if (trimmedCode.length < 3) {
    return { valid: false, reason: `Too short (${trimmedCode.length} chars, minimum 3)` };
  }
  
  if (trimmedCode.length > 50) {
    return { valid: false, reason: `Too long (${trimmedCode.length} chars, maximum 50)` };
  }
  
  if (!UNIQUE_CODE_PATTERN.test(trimmedCode)) {
    // Provide specific feedback about what's wrong
    if (!/^[A-Za-z0-9]/.test(trimmedCode)) {
      return { valid: false, reason: 'Must start with a letter or number' };
    }
    return { valid: false, reason: 'Can only contain letters, numbers, dashes, and underscores' };
  }
  
  return { valid: true, reason: '' };
}

// Validate all unique codes in the parsed data
function validateAllCodes(
  rows: Record<string, any>[],
  columnMappings: Record<string, string>,
  shouldGenerateCodes: boolean
): ValidationResult {
  const codeColumn = Object.entries(columnMappings).find(([_, v]) => v === 'customer_code')?.[0];
  
  const result: ValidationResult = {
    isValid: true,
    validCodes: 0,
    invalidCodes: [],
    emptyCodes: [],
  };
  
  rows.forEach((row, index) => {
    const code = codeColumn ? row[codeColumn] : undefined;
    const rowNum = index + 1;
    
    // If code is empty and we're generating codes, it's okay
    if ((!code || code.toString().trim() === '') && shouldGenerateCodes) {
      result.emptyCodes.push(rowNum);
      return;
    }
    
    const validation = validateUniqueCode(code);
    if (validation.valid) {
      result.validCodes++;
    } else {
      result.invalidCodes.push({
        row: rowNum,
        code: code?.toString() || '(empty)',
        reason: validation.reason,
      });
      result.isValid = false;
    }
  });
  
  return result;
}

const CONTACT_FIELDS = [
  { value: 'skip', label: 'Skip this column' },
  { value: 'customer_code', label: 'Unique Code (Required)', required: true },
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'mobile_phone', label: 'Mobile Phone' },
  { value: 'company', label: 'Company' },
  { value: 'job_title', label: 'Job Title' },
  { value: 'address', label: 'Address Line 1' },
  { value: 'address2', label: 'Address Line 2' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State/Province' },
  { value: 'zip', label: 'ZIP/Postal Code' },
  { value: 'country', label: 'Country' },
  { value: 'lifecycle_stage', label: 'Lifecycle Stage' },
  { value: 'lead_source', label: 'Lead Source' },
  { value: 'lead_score', label: 'Lead Score' },
  { value: 'do_not_contact', label: 'Do Not Contact' },
  { value: 'email_opt_out', label: 'Email Opt-Out' },
  { value: 'sms_opt_out', label: 'SMS Opt-Out' },
  { value: 'notes', label: 'Notes' },
];

export function CreateListWithCSVDialog({
  open,
  onOpenChange,
  clientId,
  onListCreated,
}: CreateListWithCSVDialogProps) {
  const { parseFile, isProcessing } = useSmartCSVParser();

  const [step, setStep] = useState<Step>('name');
  const [listName, setListName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCSVData | null>(null);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [shouldGenerateCodes, setShouldGenerateCodes] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ successful: number; failed: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidationDetails, setShowValidationDetails] = useState(false);

  // Check if unique code is mapped
  const hasUniqueCodeMapped = Object.values(columnMappings).includes('customer_code');
  const codeColumnName = Object.entries(columnMappings).find(([_, v]) => v === 'customer_code')?.[0];
  const mappedFields = new Set(Object.values(columnMappings).filter(v => v));

  // Reset dialog state
  const resetDialog = () => {
    setStep('name');
    setListName('');
    setFile(null);
    setParsedData(null);
    setColumnMappings({});
    setShouldGenerateCodes(false);
    setImportProgress(0);
    setImportResult(null);
    setIsImporting(false);
    setValidationResult(null);
    setShowValidationDetails(false);
  };

  // Handle dialog close
  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setFile(selectedFile);

    const parsed = await parseFile(selectedFile);
    if (parsed) {
      setParsedData(parsed);

      // Initialize column mappings with detected values
      const initialMappings: Record<string, string> = {};
      parsed.headers.forEach(header => {
        const normalized = header.toLowerCase().trim();

        // Map unique_code variations
        if ((normalized.includes('unique') && normalized.includes('code')) ||
            normalized === 'code' ||
            normalized === 'unique_code' ||
            (normalized.includes('customer') && normalized.includes('code'))) {
          initialMappings[header] = 'customer_code';
        }
        // Map other common fields
        else if (normalized === 'email' || normalized === 'email_address') {
          initialMappings[header] = 'email';
        }
        else if (normalized === 'first_name' || normalized === 'firstname') {
          initialMappings[header] = 'first_name';
        }
        else if (normalized === 'last_name' || normalized === 'lastname') {
          initialMappings[header] = 'last_name';
        }
        else if (normalized === 'phone' || normalized === 'phone_number') {
          initialMappings[header] = 'phone';
        }
        else if (normalized === 'mobile_phone' || normalized === 'mobile' || normalized === 'mobile_pl') {
          initialMappings[header] = 'mobile_phone';
        }
        else if (normalized === 'company' || normalized === 'company_name') {
          initialMappings[header] = 'company';
        }
        else if (normalized === 'job_title' || normalized === 'title' || normalized === 'position') {
          initialMappings[header] = 'job_title';
        }
        else if (normalized === 'address' || normalized === 'address1') {
          initialMappings[header] = 'address';
        }
        else if (normalized === 'address2') {
          initialMappings[header] = 'address2';
        }
        else if (normalized === 'city') {
          initialMappings[header] = 'city';
        }
        else if (normalized === 'state' || normalized === 'province') {
          initialMappings[header] = 'state';
        }
        else if (normalized === 'zip' || normalized === 'zipcode' || normalized === 'postal_code') {
          initialMappings[header] = 'zip';
        }
        else if (normalized === 'country') {
          initialMappings[header] = 'country';
        }
        else if (normalized === 'lifecycle_stage') {
          initialMappings[header] = 'lifecycle_stage';
        }
        else if (normalized === 'lead_source' || normalized === 'lead_sour') {
          initialMappings[header] = 'lead_source';
        }
        else if (normalized === 'lead_score' || normalized === 'lead_scor') {
          initialMappings[header] = 'lead_score';
        }
        else if (normalized === 'do_not_contact' || normalized === 'do_not_cc') {
          initialMappings[header] = 'do_not_contact';
        }
        else if (normalized === 'email_opt' || normalized === 'email_opt_out') {
          initialMappings[header] = 'email_opt_out';
        }
        else if (normalized === 'sms_opt' || normalized === 'sms_opt_out') {
          initialMappings[header] = 'sms_opt_out';
        }
        else if (normalized === 'notes') {
          initialMappings[header] = 'notes';
        }
        else {
          initialMappings[header] = 'skip';
        }
      });

      setColumnMappings(initialMappings);

      // Check if unique_code is mapped
      const hasCode = Object.values(initialMappings).includes('customer_code');
      const generateCodes = !hasCode;
      if (!hasCode || parsed.stats.emptyCodeCount > 0) {
        setShouldGenerateCodes(generateCodes);
      }

      // Run initial validation
      const validationRes = validateAllCodes(parsed.rows, initialMappings, generateCodes);
      setValidationResult(validationRes);

      setStep('mapping');
    }
  }, [parseFile]);

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  // Download sample template
  const handleDownloadTemplate = () => {
    const template = CSVTemplateGenerator.generateTemplate({
      includeExamples: true,
      includeOptionalFields: true,
    });
    CSVTemplateGenerator.downloadTemplate('contact-import-template.csv', template);
    toast.success('Template downloaded');
  };

  // Handle column mapping change
  const handleMappingChange = (csvColumn: string, targetField: string) => {
    const newMappings = {
      ...columnMappings,
      [csvColumn]: targetField,
    };
    setColumnMappings(newMappings);
    
    // Re-run validation with new mappings
    if (parsedData) {
      const result = validateAllCodes(parsedData.rows, newMappings, shouldGenerateCodes);
      setValidationResult(result);
    }
  };

  // Re-validate when shouldGenerateCodes changes
  const handleGenerateCodesChange = (checked: boolean) => {
    setShouldGenerateCodes(checked);
    if (parsedData) {
      const result = validateAllCodes(parsedData.rows, columnMappings, checked);
      setValidationResult(result);
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!parsedData || !listName.trim()) return;

    setIsImporting(true);
    setStep('importing');
    setImportProgress(0);

    try {
      const rows = parsedData.rows;
      let codesGenerated = 0;
      const rowsToImport: any[] = [];

      // Prepare rows for import with mapped columns
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const mappedRow: any = {};

        // Apply column mappings
        Object.entries(columnMappings).forEach(([csvColumn, targetField]) => {
          if (targetField && targetField !== 'skip' && row[csvColumn] !== undefined) {
            mappedRow[targetField] = row[csvColumn];
          }
        });

        // Handle unique code
        let uniqueCode = mappedRow.customer_code;
        if (shouldGenerateCodes && (!uniqueCode || uniqueCode.toString().trim() === '')) {
          uniqueCode = await UniqueCodeService.generateUnique(clientId);
          codesGenerated++;
        }

        if (!uniqueCode || uniqueCode.toString().trim() === '') {
          console.warn(`Row ${i + 1}: No unique code available, skipping`);
          continue;
        }

        mappedRow.unique_code = uniqueCode.toString().trim();
        rowsToImport.push(mappedRow);

        setImportProgress(Math.round(((i + 1) / rows.length) * 30));
      }

      setImportProgress(35);

      // Create new list
      const { data: newList, error: listError } = await supabase
        .from('contact_lists')
        .insert({
          client_id: clientId,
          name: listName.trim(),
          list_type: 'static',
        })
        .select()
        .single();

      if (listError) throw listError;

      setImportProgress(45);

      // Call import function
      const { data, error } = await supabase.functions.invoke('import-contacts', {
        body: {
          client_id: clientId,
          contacts: rowsToImport,
          list_id: newList.id,
        },
      });

      if (error) throw error;

      setImportProgress(100);

      const successful = data.successful ?? rowsToImport.length;
      const failed = data.failed ?? 0;

      setImportResult({
        successful,
        failed,
      });

      // Show appropriate toast based on results
      if (failed === 0) {
        toast.success(`Import complete! ${successful} contacts imported.`);
      } else if (successful > 0) {
        // Partial success
        let errorSummary = `${failed} contacts failed to import.`;
        if (data.first_errors?.length > 0) {
          errorSummary += ` First error: ${data.first_errors[0].error}`;
        }
        toast.warning(`Import partially complete: ${successful} imported, ${failed} failed.`, {
          description: errorSummary,
          duration: 8000,
        });
      } else {
        // Complete failure
        let errorMsg = 'All contacts failed to import.';
        if (data.first_errors?.length > 0) {
          errorMsg = data.first_errors[0].error;
        }
        throw new Error(errorMsg);
      }

      setStep('complete');

      // Notify parent about the new list
      onListCreated(newList.id, newList.name);
    } catch (error: any) {
      console.error('Import error:', error);
      
      // Try to extract detailed error message
      let errorMessage = 'Import failed';
      let errorDetails: string | null = null;
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Handle Supabase function error response
        if (error.message) {
          errorMessage = error.message;
        }
        if (error.context?.body) {
          try {
            const body = JSON.parse(error.context.body);
            if (body.error) {
              errorMessage = body.error;
            }
            if (body.summary?.errors?.length > 0) {
              errorDetails = body.summary.errors
                .slice(0, 5)
                .map((e: any) => `Row ${e.row}: ${e.error}`)
                .join('\n');
              if (body.summary.errors.length > 5) {
                errorDetails += `\n...and ${body.summary.errors.length - 5} more`;
              }
            }
          } catch {
            // Couldn't parse body, use as-is
          }
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Show detailed error toast
      toast.error(errorMessage, {
        description: errorDetails || undefined,
        duration: errorDetails ? 10000 : 5000, // Longer duration if there are details
      });
      
      setStep('mapping');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {step === 'name' && 'Create New Contact List'}
            {step === 'upload' && 'Upload CSV File'}
            {step === 'mapping' && 'Map Columns'}
            {step === 'importing' && 'Importing Contacts...'}
            {step === 'complete' && 'Import Complete!'}
          </DialogTitle>
          <DialogDescription>
            {step === 'name' && 'Enter a name for your new contact list'}
            {step === 'upload' && 'Upload a CSV file with your contacts. Each contact must have a unique code.'}
            {step === 'mapping' && `Found ${parsedData?.stats.totalRows || 0} contacts. Map your CSV columns to contact fields.`}
            {step === 'importing' && 'Please wait while we import your contacts...'}
            {step === 'complete' && 'Your contacts have been imported successfully!'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: List Name */}
        {step === 'name' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="list-name">List Name *</Label>
              <Input
                id="list-name"
                placeholder="e.g., Q1 2024 Campaign Recipients"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                autoFocus
              />
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>About Contact Lists</AlertTitle>
              <AlertDescription>
                Contact lists help you organize recipients for campaigns. Each contact must have a unique code that matches what's printed on their mail piece.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep('upload')}
                disabled={!listName.trim()}
              >
                Next: Upload CSV
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Upload CSV */}
        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div
              className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 bg-muted/50 hover:bg-muted/70'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => document.getElementById('csv-upload-dialog')?.click()}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className={`w-10 h-10 mb-3 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">CSV files only</p>
              </div>
              <input
                id="csv-upload-dialog"
                type="file"
                className="hidden"
                accept=".csv"
                onChange={handleFileInputChange}
                disabled={isProcessing}
              />
            </div>

            {isProcessing && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Parsing CSV...
              </div>
            )}

            <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-700 dark:text-amber-400">Required: Unique Code Column</AlertTitle>
              <AlertDescription className="text-amber-600 dark:text-amber-300">
                Your CSV must have a <strong>unique_code</strong> column. This code is used to identify recipients when they call in to redeem rewards.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Sample CSV
              </Button>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('name')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Column Mapping */}
        {step === 'mapping' && parsedData && (
          <div className="space-y-4 py-4">
            {/* Unique Code Status */}
            {hasUniqueCodeMapped ? (
              <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-700 dark:text-green-400">Unique Code Column Found</AlertTitle>
                <AlertDescription className="text-green-600 dark:text-green-300">
                  Column "<strong>{codeColumnName}</strong>" will be used for unique codes.
                  {parsedData.stats.emptyCodeCount > 0 && (
                    <span className="block mt-1">
                      ⚠️ {parsedData.stats.emptyCodeCount} rows have empty codes and will need auto-generation.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Unique Code Column Found</AlertTitle>
                <AlertDescription>
                  Please map a column to "Unique Code" or enable auto-generation below.
                </AlertDescription>
              </Alert>
            )}

            {/* Auto-generate option */}
            {(!hasUniqueCodeMapped || parsedData.stats.emptyCodeCount > 0) && (
              <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/50">
                <input
                  type="checkbox"
                  id="generate-codes-dialog"
                  checked={shouldGenerateCodes}
                  onChange={(e) => handleGenerateCodesChange(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="generate-codes-dialog" className="text-sm font-medium cursor-pointer">
                  Auto-generate {!hasUniqueCodeMapped ? parsedData.stats.totalRows : parsedData.stats.emptyCodeCount} unique codes
                </label>
              </div>
            )}

            {/* Validation Status */}
            {validationResult && !validationResult.isValid && validationResult.invalidCodes.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Invalid Unique Codes Found</AlertTitle>
                <AlertDescription>
                  <div className="space-y-2">
                    <p>
                      {validationResult.invalidCodes.length} row(s) have invalid unique codes that don't meet the format requirements.
                    </p>
                    <p className="text-xs">
                      Codes must be 3-50 characters, start with a letter or number, and only contain letters, numbers, dashes, and underscores.
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-destructive-foreground underline"
                      onClick={() => setShowValidationDetails(!showValidationDetails)}
                    >
                      {showValidationDetails ? 'Hide details' : 'Show details'}
                    </Button>
                    {showValidationDetails && (
                      <div className="mt-2 max-h-32 overflow-y-auto bg-destructive/10 rounded p-2 text-xs space-y-1">
                        {validationResult.invalidCodes.slice(0, 10).map((item) => (
                          <div key={item.row} className="flex gap-2">
                            <span className="font-medium">Row {item.row}:</span>
                            <span className="font-mono">"{item.code}"</span>
                            <span className="text-muted-foreground">- {item.reason}</span>
                          </div>
                        ))}
                        {validationResult.invalidCodes.length > 10 && (
                          <div className="text-muted-foreground italic">
                            ...and {validationResult.invalidCodes.length - 10} more
                          </div>
                        )}
                      </div>
                    )}
                    {!shouldGenerateCodes && (
                      <p className="mt-2 font-medium">
                        Enable "Auto-generate codes" above to automatically create valid codes for these rows.
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Validation Success */}
            {validationResult && validationResult.isValid && hasUniqueCodeMapped && (
              <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  All {validationResult.validCodes} unique codes are valid and ready for import.
                  {validationResult.emptyCodes.length > 0 && shouldGenerateCodes && (
                    <span className="block mt-1">
                      {validationResult.emptyCodes.length} empty codes will be auto-generated.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Column Mapping */}
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2 border rounded-lg p-3">
              {parsedData.headers.map((header, index) => {
                const currentMapping = columnMappings[header] || '';
                const isRequired = currentMapping === 'customer_code';

                return (
                  <div key={index} className="grid grid-cols-2 gap-3 items-center p-2 border rounded bg-muted/30">
                    <div className="space-y-0.5">
                      <span className="text-xs text-muted-foreground">CSV Column</span>
                      <div className="font-medium text-sm flex items-center gap-2">
                        {header}
                        {isRequired && <Badge variant="default" className="text-xs">Required</Badge>}
                      </div>
                    </div>

                    <Select
                      value={currentMapping}
                      onValueChange={(value) => handleMappingChange(header, value)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select field..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTACT_FIELDS.map((field) => {
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
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Preview (first 3 rows):</h4>
              <div className="border rounded-lg overflow-auto max-h-36">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      {parsedData.headers.slice(0, 5).map((header, index) => (
                        <th key={index} className="px-3 py-2 text-left font-medium">
                          <div>{header}</div>
                          {columnMappings[header] && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              → {columnMappings[header]}
                            </Badge>
                          )}
                        </th>
                      ))}
                      {parsedData.headers.length > 5 && <th className="px-3 py-2">...</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.rows.slice(0, 3).map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t">
                        {parsedData.headers.slice(0, 5).map((header, colIndex) => (
                          <td key={colIndex} className="px-3 py-2">
                            {row[header] || <span className="text-muted-foreground italic">empty</span>}
                          </td>
                        ))}
                        {parsedData.headers.length > 5 && (
                          <td className="px-3 py-2 text-muted-foreground">...</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <strong>Import Summary:</strong>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                <li>• {parsedData.stats.totalRows} contacts to list "<strong className="text-foreground">{listName}</strong>"</li>
                {shouldGenerateCodes && (
                  <li>• {!hasUniqueCodeMapped ? parsedData.stats.totalRows : parsedData.stats.emptyCodeCount} codes will be auto-generated</li>
                )}
              </ul>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  (!hasUniqueCodeMapped && !shouldGenerateCodes) ||
                  (validationResult && !validationResult.isValid && !shouldGenerateCodes)
                }
              >
                Import {parsedData.stats.totalRows} Contacts
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === 'importing' && (
          <div className="space-y-4 py-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <Progress value={importProgress} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">
                {importProgress < 30 && 'Preparing data...'}
                {importProgress >= 30 && importProgress < 45 && 'Creating list...'}
                {importProgress >= 45 && importProgress < 100 && 'Importing contacts...'}
                {importProgress === 100 && 'Finalizing...'}
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Complete */}
        {step === 'complete' && importResult && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">Import Successful!</h3>
                <p className="text-muted-foreground">
                  {importResult.successful} contacts imported to "{listName}"
                </p>
                {importResult.failed > 0 && (
                  <p className="text-amber-600 text-sm mt-1">
                    {importResult.failed} contacts failed to import
                  </p>
                )}
              </div>
            </div>

            <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                Your list is now ready to use in this campaign. The contacts will be automatically selected.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end pt-4">
              <Button onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

