import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ShoppingCart, Loader2 } from "lucide-react";
import { FileUploadZone } from "./FileUploadZone";
import { ImportResults } from "./ImportResults";
import { SampleCSVDownload } from "./SampleCSVDownload";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImportResult {
  success: boolean;
  audience_id: string;
  audience_name: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  errors: Array<{ row: number; field: string; message: string }>;
}

interface AudienceImportTabProps {
  clientId: string | null;
}

export function AudienceImportTab({ clientId }: AudienceImportTabProps) {
  const { toast } = useToast();
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
    if (!selectedFile || !audienceName || !clientId) {
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
      formData.append('client_id', clientId);
      formData.append('audience_name', audienceName);

      setUploadProgress(30);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      setUploadProgress(50);

      const { data, error } = await supabase.functions.invoke('import-audience', {
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      setUploadProgress(90);

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Import failed');

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

  return (
    <div className="space-y-6">
      {importResult && (
        <ImportResults
          audienceId={importResult.audience_id}
          audienceName={importResult.audience_name}
          totalRows={importResult.total_rows}
          validRows={importResult.valid_rows}
          invalidRows={importResult.invalid_rows}
          errors={importResult.errors}
          onViewAudience={() => {
            window.location.href = `/audiences/${importResult.audience_id}`;
          }}
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
              disabled={!selectedFile || !audienceName || isUploading || !clientId}
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
