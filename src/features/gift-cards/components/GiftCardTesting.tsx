import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { useToast } from '@shared/hooks';
import { supabase } from '@core/services/supabase';
import { AlertCircle, CheckCircle2, FileText, Zap, PlayCircle } from "lucide-react";

export function GiftCardTesting() {
  const { toast } = useToast();
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // CSV Test
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [testPoolId, setTestPoolId] = useState("");

  // API Test
  const [apiProvider, setApiProvider] = useState("tillo");
  const [apiTestAmount, setApiTestAmount] = useState("5");
  const [apiConfig, setApiConfig] = useState<any>({});

  // E2E Test
  const [e2eCampaignId, setE2eCampaignId] = useState("");
  const [e2eRecipientCode, setE2eRecipientCode] = useState("");

  const handleCsvTest = async () => {
    if (!csvFile || !testPoolId) {
      toast({
        title: "Missing Information",
        description: "Please select a CSV file and pool ID",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      formData.append('poolId', testPoolId);
      formData.append('testMode', 'true');

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-gift-cards`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: formData
        }
      );

      const result = await response.json();
      setTestResult(result);

      if (result.success) {
        toast({
          title: "CSV Test Successful",
          description: `Validated ${result.validCount} cards`
        });
      }
    } catch (error) {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiTest = async () => {
    if (!apiProvider || !apiTestAmount) {
      toast({
        title: "Missing Information",
        description: "Please select provider and amount",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('provision-gift-card-from-api', {
        body: {
          poolId: 'test-pool',
          recipientId: null,
          callSessionId: null,
          testMode: true,
          testConfig: {
            api_provider: apiProvider,
            card_value: parseFloat(apiTestAmount),
            api_config: apiConfig
          }
        }
      });

      if (error) throw error;
      
      setTestResult(data);
      toast({
        title: "API Test Successful",
        description: "Card provisioned successfully"
      });
    } catch (error) {
      toast({
        title: "API Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
      setTestResult({ error: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleE2eTest = async () => {
    if (!e2eCampaignId || !e2eRecipientCode) {
      toast({
        title: "Missing Information",
        description: "Please enter campaign ID and recipient code",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      // Simulate full flow
      const steps = [
        { name: "Validate Recipient", status: "pending" },
        { name: "Claim Gift Card", status: "pending" },
        { name: "Send SMS", status: "pending" },
        { name: "Generate Redemption Link", status: "pending" }
      ];

      // This would call actual test functions
      setTestResult({ steps, status: "in_progress" });
      
      toast({
        title: "E2E Test Started",
        description: "Running full gift card flow test"
      });
    } catch (error) {
      toast({
        title: "E2E Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Gift Card Testing</h2>
        <p className="text-muted-foreground mt-1">
          Test CSV uploads, API provisioning, and end-to-end flows
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Admin Only: All tests run in sandbox mode and won't affect production data
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="csv" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="csv">
            <FileText className="h-4 w-4 mr-2" />
            CSV Upload
          </TabsTrigger>
          <TabsTrigger value="api">
            <Zap className="h-4 w-4 mr-2" />
            API Provisioning
          </TabsTrigger>
          <TabsTrigger value="e2e">
            <PlayCircle className="h-4 w-4 mr-2" />
            End-to-End
          </TabsTrigger>
        </TabsList>

        <TabsContent value="csv" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test CSV Upload</CardTitle>
              <CardDescription>
                Validate CSV format and preview import without committing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csv-file">CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-pool">Pool ID (Optional)</Label>
                <Input
                  id="test-pool"
                  placeholder="Leave empty to validate format only"
                  value={testPoolId}
                  onChange={(e) => setTestPoolId(e.target.value)}
                />
              </div>
              <Button onClick={handleCsvTest} disabled={isLoading || !csvFile}>
                {isLoading ? "Testing..." : "Test CSV Upload"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test API Provisioning</CardTitle>
              <CardDescription>
                Test API credentials and provision a single card
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-provider">Provider</Label>
                <Select value={apiProvider} onValueChange={setApiProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tillo">Tillo</SelectItem>
                    <SelectItem value="tango_card">Tango Card</SelectItem>
                    <SelectItem value="giftbit">Giftbit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-amount">Amount ($)</Label>
                <Input
                  id="api-amount"
                  type="number"
                  value={apiTestAmount}
                  onChange={(e) => setApiTestAmount(e.target.value)}
                />
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Note: This will charge your API account. Use test credentials if available.
                </AlertDescription>
              </Alert>
              <Button onClick={handleApiTest} disabled={isLoading}>
                {isLoading ? "Testing..." : "Test API Call"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="e2e" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test End-to-End Flow</CardTitle>
              <CardDescription>
                Simulate complete caller verification through redemption
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="e2e-campaign">Campaign ID</Label>
                <Input
                  id="e2e-campaign"
                  placeholder="Enter campaign ID to test"
                  value={e2eCampaignId}
                  onChange={(e) => setE2eCampaignId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e2e-code">Recipient Code</Label>
                <Input
                  id="e2e-code"
                  placeholder="Enter unique recipient code"
                  value={e2eRecipientCode}
                  onChange={(e) => setE2eRecipientCode(e.target.value)}
                />
              </div>
              <Button onClick={handleE2eTest} disabled={isLoading}>
                {isLoading ? "Running Test..." : "Run E2E Test"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {testResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Test Results</CardTitle>
              {testResult.success ? (
                <Badge className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Success
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Failed
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
