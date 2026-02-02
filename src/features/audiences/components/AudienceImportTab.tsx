import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Progress } from "@/shared/components/ui/progress";
import { ShoppingCart, Loader2 } from "lucide-react";
import { FileUploadZone } from "@/features/audiences/components/FileUploadZone";
import { ImportResults } from "@/features/audiences/components/ImportResults";
import { SampleCSVDownload } from "@/features/audiences/components/SampleCSVDownload";
import { ManualRecipientEntry } from "@/features/audiences/components/ManualRecipientEntry";
import { useTenant } from '@/contexts/TenantContext';
import { callEdgeFunctionWithFormData } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';
import { useToast } from '@shared/hooks';
import { useNavigate } from "react-router-dom";

interface ImportResult {
  success: boolean;
  audience_id: string;
  audience_name: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  errors: Array<{ row: number; field: string; message: string }>;
}

export function AudienceImportTab() {
  const { currentClient } = useTenant();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audienceName, setAudienceName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (!audienceName) {
      const name = file.name.replace(/\.(csv|xlsx)$/i, '');
      setAudienceName(name);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !audienceName || !currentClient) {
      toast({
        title: "Missing information",
        description: "Please select a file and enter an audience name",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('client_id', currentClient.id);
      formData.append('audience_name', audienceName);

      setUploadProgress(30);
      setUploadProgress(50);

      // Use FormData-capable API client for file uploads
      const data = await callEdgeFunctionWithFormData<ImportResult>(
        Endpoints.imports.audience,
        formData,
        { timeout: 120000 } // 2 minute timeout for large files
      );

      setUploadProgress(90);

      if (!data.success) throw new Error('Import failed');

      setUploadProgress(100);
      setImportResult(data as ImportResult);

      toast({
        title: "Import successful!",
        description: `${data.valid_rows} recipients imported successfully`,
      });

      setSelectedFile(null);
      setAudienceName("");

    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: error.message || "Failed to import audience",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleViewAudience = () => {
    if (importResult?.audience_id) {
      navigate(`/audiences/${importResult.audience_id}`);
    }
  };

  return (
    <div className="space-y-6">
      {!currentClient && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              Please select a client from the sidebar to import audiences
            </p>
          </CardContent>
        </Card>
      )}

      {importResult && (
        <ImportResults
          audienceId={importResult.audience_id}
          audienceName={importResult.audience_name}
          totalRows={importResult.total_rows}
          validRows={importResult.valid_rows}
          invalidRows={importResult.invalid_rows}
          errors={importResult.errors}
          onViewAudience={handleViewAudience}
        />
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Import Audience</CardTitle>
            <CardDescription>
              Upload CSV/XLSX with contact information (max 250k rows, 20MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="audience-name">Audience Name</Label>
              <Input
                id="audience-name"
                placeholder="e.g., Spring 2024 Roofing Prospects"
                value={audienceName}
                onChange={(e) => setAudienceName(e.target.value)}
                disabled={isUploading}
              />
            </div>

            <FileUploadZone onFileSelect={handleFileSelect} />

            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Importing...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            <div className="pt-4 border-t border-border space-y-3">
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium">Required columns:</p>
                <p>• address1, city, state, zip</p>
                <p className="font-medium mt-2">Optional columns:</p>
                <p>• first_name, last_name, address2, company, email, phone</p>
              </div>
              <SampleCSVDownload />
            </div>

            <Button
              className="w-full"
              onClick={handleImport}
              disabled={!selectedFile || !audienceName || isUploading || !currentClient}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import Audience'
              )}
            </Button>

            <div className="pt-4 border-t border-border">
              <ManualRecipientEntry />
            </div>
          </CardContent>
        </Card>

        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-accent" />
              Lead Marketplace
            </CardTitle>
            <CardDescription>
              Purchase verified leads filtered by vertical, geography, and demographics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm font-medium">Roofing</span>
                  <Button variant="outline" size="sm">Browse</Button>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm font-medium">REI / Flippers</span>
                  <Button variant="outline" size="sm">Browse</Button>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm font-medium">Auto Dealerships</span>
                  <Button variant="outline" size="sm">Browse</Button>
                </div>
              </div>
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                Explore Marketplace
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
