import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useToast } from '@shared/hooks';
import { Upload, FileText, Download, AlertCircle } from "lucide-react";
import { Progress } from "@/shared/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";

interface CustomerCodeUploadProps {
  clientId: string;
  campaignId?: string;
  audienceId?: string;
}

export function CustomerCodeUpload({ clientId, campaignId, audienceId }: CustomerCodeUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (codes: any[]) => {
      const { data, error } = await supabase.functions.invoke("import-customer-codes", {
        body: {
          clientId,
          campaignId,
          audienceId,
          fileName: file?.name,
          codes,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["audiences"] });
      queryClient.invalidateQueries({ queryKey: ["recipients"] });
      
      const { summary, errorLog } = data;
      
      toast({
        title: "Upload Complete",
        description: `Successfully imported ${summary.successful} codes. ${summary.duplicates} duplicates skipped, ${summary.errors} errors.`,
      });

      if (errorLog && errorLog.length > 0) {
        console.warn("Upload errors:", errorLog);
      }

      setFile(null);
      setUploadProgress(0);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a CSV file",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    
    const codes = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",");
      const code: any = {};
      
      headers.forEach((header, index) => {
        const value = values[index]?.trim();
        if (value) {
          code[header.replace(/[^a-z0-9_]/g, "_")] = value;
        }
      });
      
      if (code.redemption_code || code.code) {
        code.redemption_code = code.redemption_code || code.code;
        codes.push(code);
      }
    }
    
    return codes;
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploadProgress(10);
      
      const text = await file.text();
      setUploadProgress(30);
      
      const codes = parseCSV(text);
      setUploadProgress(50);
      
      if (codes.length === 0) {
        throw new Error("No valid codes found in CSV");
      }

      await uploadMutation.mutateAsync(codes);
      setUploadProgress(100);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : "Failed to process CSV",
        variant: "destructive",
      });
      setUploadProgress(0);
    }
  };

  const downloadSampleCSV = () => {
    const sample = `redemption_code,first_name,last_name,phone,email,company
ABC123,John,Doe,555-0100,john@example.com,Acme Corp
XYZ789,Jane,Smith,555-0101,jane@example.com,Tech Inc`;
    
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customer_codes_sample.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Customer Codes</CardTitle>
        <CardDescription>
          Import a CSV file with customer redemption codes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sample CSV Download */}
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertTitle>CSV Format Required</AlertTitle>
          <AlertDescription>
            Your CSV must include: <code>redemption_code</code> (required), <code>first_name</code>, <code>last_name</code>, <code>phone</code>, <code>email</code>
            <br />
            <Button variant="link" onClick={downloadSampleCSV} className="p-0 h-auto mt-2">
              <Download className="mr-2 h-4 w-4" />
              Download Sample CSV
            </Button>
          </AlertDescription>
        </Alert>

        {/* File Upload */}
        <div>
          <Label htmlFor="csv-upload">Select CSV File</Label>
          <div className="mt-2">
            <Input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={uploadMutation.isPending}
            />
          </div>
        </div>

        {/* File Info */}
        {file && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="space-y-2">
            <Label>Uploading...</Label>
            <Progress value={uploadProgress} />
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!file || uploadMutation.isPending}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploadMutation.isPending ? "Uploading..." : "Upload Customer Codes"}
        </Button>

        {/* Warning */}
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Codes will be in "pending" status and must be approved by
            call center staff before customers can redeem them.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

function Input({ ...props }) {
  return <input {...props} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />;
}
