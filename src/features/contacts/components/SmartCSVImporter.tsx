import { useState, useCallback } from 'react';
import { Upload, AlertCircle, CheckCircle, Info, Download, List, Tag } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Progress } from '@/shared/components/ui/progress';
import { Badge } from '@/shared/components/ui/badge';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Separator } from '@/shared/components/ui/separator';
import { useSmartCSVParser, ParsedCSVData } from '@/features/contacts/hooks';
import { UniqueCodeService } from '@/core/services/uniqueCodeService';
import { CSVTemplateGenerator } from '@shared/utils/csv';
import { ColumnMappingDialog } from './ColumnMappingDialog';
import { useTenant } from '@app/providers/TenantProvider';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@core/services/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

interface SmartCSVImporterProps {
  onImportComplete?: (summary: ImportSummary) => void;
  onCancel?: () => void;
}

export interface ImportSummary {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  codesGenerated: number;
}

type ImportStep = 'upload' | 'mapping' | 'options' | 'importing' | 'complete';

export function SmartCSVImporter({ onImportComplete, onCancel }: SmartCSVImporterProps) {
  const { currentClient } = useTenant();
  const { parseFile, isProcessing } = useSmartCSVParser();
  
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCSVData | null>(null);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [shouldGenerateCodes, setShouldGenerateCodes] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  
  // List and tag options
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [createNewList, setCreateNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [tags, setTags] = useState<string>('');

  // Fetch available contact lists
  const { data: contactLists } = useQuery({
    queryKey: ['contact-lists', currentClient?.id],
    queryFn: async () => {
      if (!currentClient) return [];
      
      const { data, error } = await supabase
        .from('contact_lists')
        .select('*')
        .eq('client_id', currentClient.id)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentClient,
  });

  // Handle file selection
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    
    // Parse the file
    const parsed = await parseFile(selectedFile);
    if (parsed) {
      setParsedData(parsed);
      
      // Initialize column mappings with detected values
      const initialMappings: Record<string, string> = {};
      parsed.headers.forEach(header => {
        const normalized = header.toLowerCase().trim();
        
        // Map unique_code variations
        if (normalized.includes('unique') && normalized.includes('code') || 
            normalized === 'code' || 
            normalized.includes('customer') && normalized.includes('code')) {
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
        else if (normalized === 'mobile_phone' || normalized === 'mobile') {
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
        else {
          // Default to skipping unknown columns
          initialMappings[header] = 'skip';
        }
      });
      
      setColumnMappings(initialMappings);
      
      // Check if unique_code is mapped
      const hasUniqueCode = Object.values(initialMappings).includes('customer_code');
      if (!hasUniqueCode || parsed.stats.emptyCodeCount > 0) {
        setShouldGenerateCodes(true);
      }
      
      // Move to mapping step
      setStep('mapping');
    }
  }, [parseFile]);

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
    setColumnMappings(prev => ({
      ...prev,
      [csvColumn]: targetField,
    }));
  };

  // Proceed to options step
  const handleProceedToOptions = () => {
    // Validate that unique_code is mapped
    const hasUniqueCode = Object.values(columnMappings).includes('customer_code');
    
    if (!hasUniqueCode && !shouldGenerateCodes) {
      toast.error('Please map a Unique Code column or enable auto-generation');
      return;
    }
    
    setStep('options');
  };

  // Handle import
  const handleImport = async () => {
    if (!parsedData || !currentClient) return;

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
        if (shouldGenerateCodes && (!uniqueCode || uniqueCode.trim() === '')) {
          uniqueCode = await UniqueCodeService.generateUnique(currentClient.id);
          codesGenerated++;
        }

        if (!uniqueCode || uniqueCode.trim() === '') {
          console.warn(`Row ${i + 1}: No unique code available, skipping`);
          continue;
        }

        mappedRow.unique_code = uniqueCode.trim();
        rowsToImport.push(mappedRow);

        setImportProgress(Math.round(((i + 1) / rows.length) * 40));
      }

      // Create new list if specified
      let targetListId = selectedListId;
      if (createNewList && newListName.trim()) {
        const { data: newList, error: listError } = await supabase
          .from('contact_lists')
          .insert({
            client_id: currentClient.id,
            name: newListName.trim(),
            list_type: 'static',
          })
          .select()
          .single();

        if (listError) throw listError;
        targetListId = newList.id;
      }

      setImportProgress(50);

      // Call import function
      const { data, error } = await supabase.functions.invoke('import-contacts', {
        body: {
          client_id: currentClient.id,
          contacts: rowsToImport,
          list_id: targetListId || undefined,
          tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        },
      });

      if (error) throw error;

      setImportProgress(100);

      const summary: ImportSummary = {
        total: rows.length,
        successful: data.successful || 0,
        failed: data.failed || 0,
        skipped: data.skipped || 0,
        codesGenerated,
      };

      toast.success(`Import complete! ${summary.successful} contacts imported.`);
      
      setStep('complete');
      
      if (onImportComplete) {
        onImportComplete(summary);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Import failed');
      setStep('options');
    } finally {
      setIsImporting(false);
    }
  };

  // Reset the form
  const handleReset = () => {
    setFile(null);
    setParsedData(null);
    setColumnMappings({});
    setShouldGenerateCodes(false);
    setImportProgress(0);
    setStep('upload');
    setSelectedListId('');
    setCreateNewList(false);
    setNewListName('');
    setTags('');
  };

  // Check if unique code is mapped
  const hasUniqueCodeMapped = Object.values(columnMappings).includes('customer_code');
  const codeColumnName = Object.entries(columnMappings).find(([_, v]) => v === 'customer_code')?.[0];

  return (
    <div className="space-y-6">
      {/* Step 1: Upload */}
      {step === 'upload' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Import Contacts from CSV</CardTitle>
              <CardDescription>
                Upload a CSV file to import contacts. We'll help you map the columns.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="csv-upload"
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/70 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-12 h-12 mb-4 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">CSV files only</p>
                  </div>
                  <input
                    id="csv-upload"
                    type="file"
                    className="hidden"
                    accept=".csv"
                    onChange={handleFileSelect}
                    disabled={isProcessing}
                  />
                </label>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Sample CSV
                </Button>
                <span className="text-xs text-muted-foreground">
                  Not sure what format to use?
                </span>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Import Guidelines</AlertTitle>
            <AlertDescription className="space-y-1">
              <p>• <strong>Required:</strong> unique_code column (we'll help you map it)</p>
              <p>• <strong>Recommended:</strong> first_name, last_name, email, phone</p>
              <p>• <strong>Optional:</strong> All other contact fields</p>
              <p>• You can assign imported contacts to lists and add tags</p>
            </AlertDescription>
          </Alert>
        </>
      )}

      {/* Step 2: Column Mapping */}
      {step === 'mapping' && parsedData && (
        <Card>
          <CardHeader>
            <CardTitle>Map CSV Columns</CardTitle>
            <CardDescription>
              Found {parsedData.stats.totalRows} rows with {parsedData.headers.length} columns. 
              Map your CSV columns to contact fields.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Unique Code Status */}
            {hasUniqueCodeMapped ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Unique Code Column Mapped</AlertTitle>
                <AlertDescription>
                  CSV column "<strong>{codeColumnName}</strong>" will be used for unique codes.
                  {parsedData.stats.emptyCodeCount > 0 && (
                    <span className="block mt-2">
                      ⚠️ {parsedData.stats.emptyCodeCount} rows have empty codes and will be auto-generated.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Unique Code Column Mapped</AlertTitle>
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
                  id="generate-codes"
                  checked={shouldGenerateCodes}
                  onChange={(e) => setShouldGenerateCodes(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="generate-codes" className="text-sm font-medium cursor-pointer">
                  Auto-generate {parsedData.stats.emptyCodeCount || parsedData.stats.totalRows} unique codes
                </label>
              </div>
            )}

            {/* Column Mapping Interface */}
            <ColumnMappingDialog
              csvHeaders={parsedData.headers}
              detectedMappings={columnMappings}
              onMappingChange={handleMappingChange}
            />

            {/* Preview */}
            <div className="space-y-2 pt-4 border-t">
              <h4 className="text-sm font-medium">Preview (first 3 rows):</h4>
              <div className="border rounded-lg overflow-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      {parsedData.headers.slice(0, 5).map((header, index) => (
                        <th key={index} className="px-4 py-2 text-left font-medium text-xs">
                          <div>{header}</div>
                          {columnMappings[header] && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              → {columnMappings[header]}
                            </Badge>
                          )}
                        </th>
                      ))}
                      {parsedData.headers.length > 5 && <th className="px-4 py-2">...</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.rows.slice(0, 3).map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t">
                        {parsedData.headers.slice(0, 5).map((header, colIndex) => (
                          <td key={colIndex} className="px-4 py-2 text-xs">
                            {row[header] || <span className="text-muted-foreground italic">empty</span>}
                          </td>
                        ))}
                        {parsedData.headers.length > 5 && (
                          <td className="px-4 py-2 text-muted-foreground text-xs">...</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleReset}>
                Cancel
              </Button>
              <Button
                onClick={handleProceedToOptions}
                disabled={!hasUniqueCodeMapped && !shouldGenerateCodes}
              >
                Next: Import Options
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Import Options (Lists & Tags) */}
      {step === 'options' && parsedData && (
        <Card>
          <CardHeader>
            <CardTitle>Import Options</CardTitle>
            <CardDescription>
              Configure additional options for your {parsedData.stats.totalRows} contacts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* List Assignment */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <List className="h-4 w-4" />
                <Label className="text-base font-semibold">Add to Contact List</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Organize imported contacts by adding them to a list.
              </p>

              <div className="space-y-3">
                <Select
                  value={createNewList ? 'new' : (selectedListId || 'none')}
                  onValueChange={(value) => {
                    if (value === 'new') {
                      setCreateNewList(true);
                      setSelectedListId('');
                    } else if (value === 'none') {
                      setCreateNewList(false);
                      setSelectedListId('');
                    } else {
                      setCreateNewList(false);
                      setSelectedListId(value);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a list (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No list</SelectItem>
                    {contactLists?.filter(list => list.id && list.id.trim() !== '').map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name} ({list.contact_count || 0} contacts)
                      </SelectItem>
                    ))}
                    <Separator className="my-1" />
                    <SelectItem value="new">+ Create New List</SelectItem>
                  </SelectContent>
                </Select>

                {createNewList && (
                  <div className="space-y-2">
                    <Label htmlFor="new-list-name">New List Name</Label>
                    <Input
                      id="new-list-name"
                      placeholder="e.g., Q1 2024 Imports"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Tag Assignment */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                <Label className="text-base font-semibold">Add Tags</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Add tags to help categorize these contacts. Separate multiple tags with commas.
              </p>

              <Input
                placeholder="e.g., imported, Q1-2024, webinar-attendees"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              {tags && (
                <div className="flex flex-wrap gap-2">
                  {tags.split(',').map((tag, i) => (
                    tag.trim() && <Badge key={i} variant="secondary">{tag.trim()}</Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Summary */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold">Import Summary</h4>
              <ul className="text-sm space-y-1">
                <li>• {parsedData.stats.totalRows} contacts will be imported</li>
                {shouldGenerateCodes && (
                  <li>• {parsedData.stats.emptyCodeCount || parsedData.stats.totalRows} unique codes will be generated</li>
                )}
                {(selectedListId || createNewList) && (
                  <li>• Contacts will be added to: {createNewList ? newListName : contactLists?.find(l => l.id === selectedListId)?.name}</li>
                )}
                {tags && (
                  <li>• {tags.split(',').filter(t => t.trim()).length} tag(s) will be applied</li>
                )}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back to Mapping
              </Button>
              <Button onClick={handleImport}>
                Import {parsedData.stats.totalRows} Contacts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Importing */}
      {step === 'importing' && (
        <Card>
          <CardHeader>
            <CardTitle>Importing Contacts...</CardTitle>
            <CardDescription>
              Please wait while we import your contacts. This may take a moment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={importProgress} />
            <p className="text-sm text-center text-muted-foreground">
              {importProgress}% complete
            </p>
            <div className="text-center text-xs text-muted-foreground">
              {importProgress < 40 && 'Preparing data...'}
              {importProgress >= 40 && importProgress < 50 && 'Creating lists...'}
              {importProgress >= 50 && importProgress < 100 && 'Importing contacts...'}
              {importProgress === 100 && 'Finalizing...'}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Complete */}
      {step === 'complete' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              Import Complete!
            </CardTitle>
            <CardDescription>
              Your contacts have been successfully imported.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                All contacts have been imported and are now available in your contact database.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>
                Import More Contacts
              </Button>
              <Button onClick={() => onCancel?.()}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
