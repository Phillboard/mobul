import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@shared/hooks';
import { 
  Upload, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Download,
  Loader2,
  FileSpreadsheet
} from "lucide-react";
import Papa from "papaparse";

interface BulkCodeValidationProps {
  campaignId?: string;
}

export function BulkCodeValidation({ campaignId }: BulkCodeValidationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [codes, setCodes] = useState<string>("");
  const [validationResults, setValidationResults] = useState<any[] | null>(null);

  const validateMutation = useMutation({
    mutationFn: async (codesToValidate: string[]) => {
      const { data, error } = await supabase
        .rpc('validate_redemption_codes_batch', {
          p_codes: codesToValidate,
          p_campaign_id: campaignId || null
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setValidationResults(data);
      
      const validCount = data.filter((r: any) => r.is_valid).length;
      const invalidCount = data.filter((r: any) => !r.is_valid).length;
      
      toast({
        title: "Validation Complete",
        description: `${validCount} valid, ${invalidCount} invalid codes found`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Validation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTextValidation = () => {
    const codeList = codes
      .split(/[\n,]/)
      .map(c => c.trim().toUpperCase())
      .filter(c => c.length > 0);

    if (codeList.length === 0) {
      toast({
        title: "No Codes",
        description: "Please enter at least one code to validate",
        variant: "destructive",
      });
      return;
    }

    if (codeList.length > 1000) {
      toast({
        title: "Too Many Codes",
        description: "Maximum 1000 codes per batch. Please split into smaller batches.",
        variant: "destructive",
      });
      return;
    }

    validateMutation.mutate(codeList);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        // Extract codes from first column
        const codeList = results.data
          .map((row: any) => Array.isArray(row) ? row[0] : row.code || row.redemption_code)
          .filter((c: any) => c && typeof c === 'string' && c.trim().length > 0)
          .map((c: string) => c.trim().toUpperCase());

        if (codeList.length === 0) {
          toast({
            title: "No Codes Found",
            description: "CSV file contains no valid codes",
            variant: "destructive",
          });
          return;
        }

        if (codeList.length > 1000) {
          toast({
            title: "Too Many Codes",
            description: `Found ${codeList.length} codes. Maximum is 1000. Please split into smaller files.`,
            variant: "destructive",
          });
          return;
        }

        validateMutation.mutate(codeList);
      },
      error: (error) => {
        toast({
          title: "CSV Parse Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });

    // Reset input
    event.target.value = '';
  };

  const exportResults = () => {
    if (!validationResults) return;

    const csv = Papa.unparse(validationResults.map((r: any) => ({
      code: r.code,
      valid: r.is_valid ? 'Yes' : 'No',
      status: r.status,
      recipient_name: r.recipient_name || '',
      error: r.error_message || ''
    })));

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validation-results-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCodes = validationResults?.filter(r => r.is_valid) || [];
  const invalidCodes = validationResults?.filter(r => !r.is_valid) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Code Validation</CardTitle>
          <CardDescription>
            Validate multiple redemption codes at once via CSV upload or text entry
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Options */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Upload CSV File</label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <div className="text-sm font-medium">Click to upload CSV</div>
                  <div className="text-xs text-muted-foreground">Max 1000 codes per file</div>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Or Paste Codes</label>
              <Textarea
                placeholder="Enter codes (one per line or comma-separated)&#10;ABC-123&#10;DEF-456&#10;GHI-789"
                value={codes}
                onChange={(e) => setCodes(e.target.value)}
                className="h-32"
              />
              <Button 
                onClick={handleTextValidation} 
                disabled={validateMutation.isPending || codes.trim().length === 0}
                className="w-full"
              >
                {validateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Validate Codes
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Results */}
          {validationResults && (
            <div className="space-y-4 pt-4 border-t">
              {/* Summary */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-green-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="text-2xl font-bold text-green-600">{validCodes.length}</div>
                        <div className="text-sm text-muted-foreground">Valid Codes</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-red-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <div className="text-2xl font-bold text-red-600">{invalidCodes.length}</div>
                        <div className="text-sm text-muted-foreground">Invalid Codes</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-2xl font-bold">{validationResults.length}</div>
                        <div className="text-sm text-muted-foreground">Total Checked</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Export Button */}
              <Button onClick={exportResults} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export Results to CSV
              </Button>

              {/* Invalid Codes List */}
              {invalidCodes.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-medium">Invalid Codes Found:</div>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {invalidCodes.map((code: any, idx: number) => (
                          <div key={idx} className="text-sm flex items-center justify-between p-2 bg-background rounded">
                            <span className="font-mono">{code.code}</span>
                            <span className="text-xs">{code.error_message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Valid Codes Preview */}
              {validCodes.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Valid Codes ({validCodes.length})
                  </div>
                  <div className="border rounded-lg p-4 space-y-1 max-h-64 overflow-y-auto bg-green-50">
                    {validCodes.slice(0, 20).map((code: any, idx: number) => (
                      <div key={idx} className="text-sm flex items-center justify-between p-2 bg-background rounded">
                        <span className="font-mono">{code.code}</span>
                        <span className="text-xs text-muted-foreground">{code.recipient_name}</span>
                      </div>
                    ))}
                    {validCodes.length > 20 && (
                      <div className="text-xs text-center text-muted-foreground pt-2">
                        ... and {validCodes.length - 20} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

