import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Download,
  Loader2,
  Users,
  XCircle,
  ArrowRight,
  BarChart3,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useToast } from '@shared/hooks';
import Papa from "papaparse";
import type { CampaignFormData } from "@/types/campaigns";

interface CodesUploadStepProps {
  clientId: string;
  campaignId?: string;
  initialData: Partial<CampaignFormData>;
  onNext: (data: Partial<CampaignFormData>) => void;
  onBack: () => void;
}

interface ParsedRow {
  code: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  status: 'valid' | 'duplicate' | 'error';
  error?: string;
}

interface ImportResult {
  success: boolean;
  audience_id: string;
  recipients_created: number;
  contacts_created: number;
  contacts_matched: number;
  duplicates_skipped: number;
}

export function CodesUploadStep({ 
  clientId, 
  campaignId,
  initialData, 
  onNext, 
  onBack 
}: CodesUploadStepProps) {
  const { toast } = useToast();
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  
  // Tracking settings state
  const [trackingSettings, setTrackingSettings] = useState({
    lp_mode: initialData.lp_mode || 'purl',
    base_lp_url: initialData.base_lp_url || '',
    utm_source: initialData.utm_source || 'directmail',
    utm_medium: initialData.utm_medium || 'postcard',
    utm_campaign: initialData.utm_campaign || initialData.name || '',
  });

  // Check if audience was selected in previous step
  const hasAudienceSelected = initialData.contact_list_id || initialData.audience_selection_complete;

  const downloadTemplate = () => {
    const template = "code,first_name,last_name,email,phone,address,city,state,zip\nABC123,John,Doe,john@example.com,555-1234,123 Main St,Boston,MA,02101\nXYZ789,Jane,Smith,jane@example.com,555-5678,456 Oak Ave,Boston,MA,02102";
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'campaign-codes-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        const parsed: ParsedRow[] = rows.map((row, index) => {
          // Validate required fields
          if (!row.code || row.code.trim() === '') {
            return {
              ...row,
              code: row.code || `ROW${index + 1}`,
              status: 'error' as const,
              error: 'Missing code'
            };
          }

          // Check for valid email if provided
          if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
            return {
              ...row,
              code: row.code.trim().toUpperCase(),
              status: 'error' as const,
              error: 'Invalid email format'
            };
          }

          return {
            code: row.code.trim().toUpperCase(),
            first_name: row.first_name?.trim() || '',
            last_name: row.last_name?.trim() || '',
            email: row.email?.trim().toLowerCase() || '',
            phone: row.phone?.trim() || '',
            address: row.address?.trim() || '',
            city: row.city?.trim() || '',
            state: row.state?.trim() || '',
            zip: row.zip?.trim() || '',
            status: 'valid' as const
          };
        });

        // Check for duplicate codes within file
        const codeMap = new Map<string, number>();
        parsed.forEach((row, index) => {
          if (row.status === 'valid') {
            if (codeMap.has(row.code)) {
              row.status = 'duplicate';
              row.error = `Duplicate of row ${codeMap.get(row.code)! + 1}`;
            } else {
              codeMap.set(row.code, index);
            }
          }
        });

        setParsedData(parsed);
        setShowSkipWarning(false);

        toast({
          title: "CSV Parsed",
          description: `Loaded ${parsed.length} rows. Review below before importing.`,
        });
      },
      error: (error) => {
        toast({
          title: "Parse Error",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  }, [toast]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      parseCSV(acceptedFiles[0]);
    }
  }, [parseCSV]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!campaignId) {
        throw new Error('Campaign ID is required');
      }

      const validRows = parsedData.filter(row => row.status === 'valid');
      
      if (validRows.length === 0) {
        throw new Error('No valid rows to import');
      }

      setUploadProgress(20);

      const { data, error } = await supabase.functions.invoke('import-campaign-codes', {
        body: {
          campaignId,
          clientId,
          campaignName: initialData.name,
          codes: validRows
        }
      });

      setUploadProgress(100);

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data as ImportResult;
    },
    onSuccess: (data) => {
      toast({
        title: "Import Complete!",
        description: `Created ${data.recipients_created} recipients, ${data.contacts_created} new contacts, matched ${data.contacts_matched} existing contacts.`,
      });

      onNext({
        audience_id: data.audience_id,
        codes_uploaded: true,
        recipient_count: data.recipients_created
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
      setUploadProgress(0);
    }
  });

  const handleSkip = () => {
    if (!showSkipWarning) {
      setShowSkipWarning(true);
      return;
    }

    // User confirmed skip
    toast({
      title: "Skipped Code Upload",
      description: "This campaign will be marked for testing only.",
      variant: "default",
    });

    onNext({
      codes_uploaded: false,
      requires_codes: false, // Mark as test campaign
      recipient_count: initialData.recipient_count || 0
    });
  };

  const validCount = parsedData.filter(r => r.status === 'valid').length;
  const duplicateCount = parsedData.filter(r => r.status === 'duplicate').length;
  const errorCount = parsedData.filter(r => r.status === 'error').length;

  // If audience was selected in previous step, auto-proceed
  if (hasAudienceSelected && initialData.contact_list_id) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Unique Codes & Tracking</h2>
          <p className="text-muted-foreground mt-2">
            Configure tracking for campaign responses and performance analytics
          </p>
        </div>

        {/* Tracking & Analytics Settings */}
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setShowTracking(!showTracking)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                <CardTitle className="text-base">Tracking & Analytics Settings</CardTitle>
              </div>
              {showTracking ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
            <CardDescription>
              Configure PURLs, QR codes, and UTM parameters for tracking campaign performance
            </CardDescription>
          </CardHeader>
          {showTracking && (
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>How tracking works:</strong> Each recipient gets a unique code that's embedded in their personalized landing page URL (PURL) and QR code. This lets you track who visits, submits forms, and redeems rewards.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lp-mode">Landing Page Mode</Label>
                  <Select
                    value={trackingSettings.lp_mode}
                    onValueChange={(value) => setTrackingSettings({ ...trackingSettings, lp_mode: value })}
                  >
                    <SelectTrigger id="lp-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purl">PURL (Personalized URL)</SelectItem>
                      <SelectItem value="bridge">Bridge Page</SelectItem>
                      <SelectItem value="redirect">Direct Redirect</SelectItem>
                      <SelectItem value="none">No Landing Page</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How visitors are directed from their unique code
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="base-url">Base Landing Page URL</Label>
                  <Input
                    id="base-url"
                    type="url"
                    placeholder="https://yoursite.com/offer"
                    value={trackingSettings.base_lp_url}
                    onChange={(e) => setTrackingSettings({ ...trackingSettings, base_lp_url: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    The URL where visitors will land (code appended automatically)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">UTM Parameters (for Google Analytics)</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="utm-source" className="text-xs">Source</Label>
                    <Input
                      id="utm-source"
                      placeholder="directmail"
                      value={trackingSettings.utm_source}
                      onChange={(e) => setTrackingSettings({ ...trackingSettings, utm_source: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="utm-medium" className="text-xs">Medium</Label>
                    <Input
                      id="utm-medium"
                      placeholder="postcard"
                      value={trackingSettings.utm_medium}
                      onChange={(e) => setTrackingSettings({ ...trackingSettings, utm_medium: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="utm-campaign" className="text-xs">Campaign</Label>
                    <Input
                      id="utm-campaign"
                      placeholder="Campaign name"
                      value={trackingSettings.utm_campaign}
                      onChange={(e) => setTrackingSettings({ ...trackingSettings, utm_campaign: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        <Alert className="border-primary/50 bg-primary/5">
          <CheckCircle className="h-4 w-4 text-primary" />
          <AlertTitle>Codes Will Be Auto-Generated</AlertTitle>
          <AlertDescription>
            <div className="space-y-2 mt-2">
              <p>
                <strong>{initialData.recipient_count || 0} unique tracking codes</strong> will be automatically generated when you create this campaign.
              </p>
              <p className="text-sm text-muted-foreground mt-3">
                <strong>How codes work:</strong> Each contact in your list will receive a unique code. This code is used AFTER mailing to:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mt-2">
                <li>Track QR code scans and PURL visits</li>
                <li>Identify callers in your call center system</li>
                <li>Monitor form submissions and reward redemptions</li>
                <li>Generate detailed analytics and attribution reports</li>
              </ul>
              <p className="text-sm font-semibold mt-3">
                Note: These codes are for tracking responses, not for the mailing itself. Your contacts will be mailed from the audience you selected.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        <div className="flex justify-between gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={() => onNext({ 
            codes_uploaded: true, 
            recipient_count: initialData.recipient_count || 0,
            ...trackingSettings 
          })}>
            <Users className="h-4 w-4 mr-2" />
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Unique Codes & Tracking</h2>
        <p className="text-muted-foreground mt-2">
          Configure tracking for campaign responses and performance analytics
        </p>
      </div>

      {/* Tracking & Analytics Settings */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setShowTracking(!showTracking)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle className="text-base">Tracking & Analytics Settings</CardTitle>
            </div>
            {showTracking ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
          <CardDescription>
            Configure PURLs, QR codes, and UTM parameters for tracking campaign performance
          </CardDescription>
        </CardHeader>
        {showTracking && (
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>How tracking works:</strong> Each recipient gets a unique code that's embedded in their personalized landing page URL (PURL) and QR code. This lets you track who visits, submits forms, and redeems rewards.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lp-mode">Landing Page Mode</Label>
                <Select
                  value={trackingSettings.lp_mode}
                  onValueChange={(value) => setTrackingSettings({ ...trackingSettings, lp_mode: value })}
                >
                  <SelectTrigger id="lp-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purl">PURL (Personalized URL)</SelectItem>
                    <SelectItem value="bridge">Bridge Page</SelectItem>
                    <SelectItem value="redirect">Direct Redirect</SelectItem>
                    <SelectItem value="none">No Landing Page</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How visitors are directed from their unique code
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="base-url">Base Landing Page URL</Label>
                <Input
                  id="base-url"
                  type="url"
                  placeholder="https://yoursite.com/offer"
                  value={trackingSettings.base_lp_url}
                  onChange={(e) => setTrackingSettings({ ...trackingSettings, base_lp_url: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  The URL where visitors will land (code appended automatically)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">UTM Parameters (for Google Analytics)</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="utm-source" className="text-xs">Source</Label>
                  <Input
                    id="utm-source"
                    placeholder="directmail"
                    value={trackingSettings.utm_source}
                    onChange={(e) => setTrackingSettings({ ...trackingSettings, utm_source: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="utm-medium" className="text-xs">Medium</Label>
                  <Input
                    id="utm-medium"
                    placeholder="postcard"
                    value={trackingSettings.utm_medium}
                    onChange={(e) => setTrackingSettings({ ...trackingSettings, utm_medium: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="utm-campaign" className="text-xs">Campaign</Label>
                  <Input
                    id="utm-campaign"
                    placeholder="Campaign name"
                    value={trackingSettings.utm_campaign}
                    onChange={(e) => setTrackingSettings({ ...trackingSettings, utm_campaign: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>About Unique Codes:</strong> These codes are used for tracking responses after mailing, not for the mailing itself. Upload a CSV if you've already generated codes, otherwise codes will be auto-generated for your contact list.
        </AlertDescription>
      </Alert>

      {/* Template Download */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Need a Template?</CardTitle>
          <CardDescription>
            Download our CSV template to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={downloadTemplate} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download CSV Template
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Template includes: code, first_name, last_name, email, phone, address, city, state, zip
          </p>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg font-medium">Drop your CSV file here...</p>
            ) : (
              <>
                <p className="text-lg font-medium">Drag & drop your CSV file here</p>
                <p className="text-sm text-muted-foreground mt-2">or click to browse</p>
              </>
            )}
          </div>

          {parsedData.length > 0 && (
            <div className="mt-4">
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Summary */}
      {parsedData.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Validation Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">{validCount}</div>
                    <div className="text-xs text-muted-foreground">Valid</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <div className="text-2xl font-bold">{duplicateCount}</div>
                    <div className="text-xs text-muted-foreground">Duplicates</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold">{errorCount}</div>
                    <div className="text-xs text-muted-foreground">Errors</div>
                  </div>
                </div>
              </div>

              {validCount > 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Ready to Import</AlertTitle>
                  <AlertDescription>
                    {validCount} valid codes ready to import. Duplicates and errors will be skipped.
                  </AlertDescription>
                </Alert>
              )}

              {validCount === 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Valid Codes</AlertTitle>
                  <AlertDescription>
                    Please fix errors and duplicates before importing.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Preview Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview Data</CardTitle>
              <CardDescription>
                Showing first 10 rows ({parsedData.length} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {row.status === 'valid' && (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Valid
                            </Badge>
                          )}
                          {row.status === 'duplicate' && (
                            <Badge variant="secondary">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Duplicate
                            </Badge>
                          )}
                          {row.status === 'error' && (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Error
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono">{row.code}</TableCell>
                        <TableCell>
                          {row.first_name} {row.last_name}
                        </TableCell>
                        <TableCell className="text-sm">{row.email || '—'}</TableCell>
                        <TableCell className="text-sm">{row.phone || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedData.length > 10 && (
                <p className="text-xs text-muted-foreground mt-2">
                  ... and {parsedData.length - 10} more rows
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Skip Warning */}
      {showSkipWarning && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning: Testing Mode</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Skipping code upload will mark this campaign as "Testing Only". This should only be used for demos or development.
            </p>
            <p className="font-semibold">
              Are you sure you want to skip? Click "Skip Code Upload" again to confirm.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-between gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>

        <div className="flex gap-2">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={handleSkip}
            className={showSkipWarning ? "border-2 border-destructive" : ""}
          >
            {showSkipWarning ? "Skip Code Upload (Confirm)" : "Skip for Now"}
          </Button>

          {parsedData.length > 0 && (
            <Button
              onClick={() => importMutation.mutate()}
              disabled={validCount === 0 || importMutation.isPending}
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Import {validCount} Codes
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

