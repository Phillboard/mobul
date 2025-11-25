import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileUploadZone } from "@/components/audiences/FileUploadZone";
import { Download, Upload, AlertCircle, CheckCircle } from "lucide-react";
import { useGiftCardPools } from "@/hooks/useGiftCardPools";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GiftCardUploadTabProps {
  clientId: string;
  preselectedPoolId?: string;
}

export function GiftCardUploadTab({ clientId, preselectedPoolId }: GiftCardUploadTabProps) {
  const { pools, isLoading } = useGiftCardPools(clientId);
  const { toast } = useToast();
  const [selectedPoolId, setSelectedPoolId] = useState(preselectedPoolId || "");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: number;
    duplicates: number;
    errors: string[];
  } | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setUploadResult(null);
  };

  const handleUpload = async () => {
    if (!file || !selectedPoolId) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const csvContent = e.target?.result as string;

        const { data, error } = await supabase.functions.invoke("import-gift-cards", {
          body: {
            pool_id: selectedPoolId,
            csv_content: csvContent,
          },
        });

        if (error) throw error;

        setUploadResult(data);
        toast({
          title: "Upload Complete",
          description: `Successfully imported ${data.success} gift cards`,
        });

        // Reset file
        setFile(null);
      };

      reader.readAsText(file);
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadSample = () => {
    const sample = `card_code,card_number,expiration_date,card_value,provider
SAMPLE123ABC,4111111111111111,2025-12-31,5.00,Visa
SAMPLE456DEF,4222222222222222,2026-01-31,25.00,Visa
AMAZONXYZ789,,,50.00,Amazon
TARGETABC123,,,10.00,Target`;

    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gift_cards_sample.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Gift Cards</CardTitle>
          <CardDescription>
            Import gift card codes in bulk using a CSV file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Pool</Label>
            <Select value={selectedPoolId} onValueChange={setSelectedPoolId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a gift card pool" />
              </SelectTrigger>
              <SelectContent>
                {pools?.map((pool) => (
                  <SelectItem key={pool.id} value={pool.id}>
                    {pool.pool_name} ({pool.available_cards} available)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <FileUploadZone
            onFileSelect={handleFileSelect}
            accept={{ 'text/csv': ['.csv'] }}
            maxSize={10 * 1024 * 1024}
          />

          {file && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Ready to upload: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={!file || !selectedPoolId || isUploading}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Uploading..." : "Upload Gift Cards"}
            </Button>
            <Button variant="outline" onClick={downloadSample}>
              <Download className="h-4 w-4 mr-2" />
              Sample CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Imported</div>
                <div className="text-2xl font-semibold text-green-600">
                  {uploadResult.success}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Duplicates</div>
                <div className="text-2xl font-semibold text-yellow-600">
                  {uploadResult.duplicates}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Errors</div>
                <div className="text-2xl font-semibold text-destructive">
                  {uploadResult.errors.length}
                </div>
              </div>
            </div>

            {uploadResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">Errors:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {uploadResult.errors.slice(0, 5).map((error, idx) => (
                      <li key={idx} className="text-sm">{error}</li>
                    ))}
                  </ul>
                  {uploadResult.errors.length > 5 && (
                    <div className="text-sm mt-2">
                      And {uploadResult.errors.length - 5} more errors...
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>CSV Format Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Required Columns:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li><code className="bg-muted px-1 py-0.5 rounded">card_code</code> - The redemption code (unique)</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">card_value</code> - Dollar amount (e.g., 5.00)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Optional Columns:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li><code className="bg-muted px-1 py-0.5 rounded">card_number</code> - Card number (for physical cards)</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">expiration_date</code> - Format: YYYY-MM-DD</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">provider</code> - Visa, Amazon, etc.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
