import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, CheckCircle, AlertCircle, Trash2, Database } from "lucide-react";
import { DemoDataGenerator, type GenerationProgress } from "@/lib/demo-data-generator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DemoDataGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress[]>([]);
  const [dataSize, setDataSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [customCampaigns, setCustomCampaigns] = useState(50);
  const [customRecipients, setCustomRecipients] = useState(50);

  const dataSizeConfig = {
    small: {
      campaigns: 25,
      recipientsPerCampaign: 25,
      eventsPerCampaign: 50,
      description: '~1,250 total records - Quick test',
    },
    medium: {
      campaigns: 50,
      recipientsPerCampaign: 50,
      eventsPerCampaign: 100,
      description: '~7,500 total records - Recommended',
    },
    large: {
      campaigns: 100,
      recipientsPerCampaign: 100,
      eventsPerCampaign: 200,
      description: '~30,000 total records - Stress test',
    },
  };

  const config = dataSize === 'small' || dataSize === 'medium' || dataSize === 'large' 
    ? dataSizeConfig[dataSize]
    : dataSizeConfig.medium;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress([]);

    try {
      // Get all demo clients
      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .ilike('id', 'dc%');

      if (!clients || clients.length === 0) {
        toast.error('No demo clients found. Please run seed-comprehensive-demo-data.sql first.');
        return;
      }

      const clientIds = clients.map(c => c.id);

      const generator = new DemoDataGenerator((prog) => {
        setProgress(prev => {
          const existing = prev.findIndex(p => p.phase === prog.phase);
          if (existing >= 0) {
            const newProgress = [...prev];
            newProgress[existing] = prog;
            return newProgress;
          }
          return [...prev, prog];
        });
      });

      await generator.generateCompleteDataset({
        clientIds,
        campaignsPerClient: Math.floor(customCampaigns / clientIds.length),
        recipientsPerCampaign: customRecipients,
        eventsPerCampaign: config.eventsPerCampaign,
      });

      toast.success('✅ Demo data generated successfully!');
    } catch (error) {
      toast.error(`Failed to generate demo data: ${error}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCleanup = async () => {
    if (!confirm('This will delete ALL demo data. Are you sure?')) return;

    try {
      toast.info('Cleaning up demo data...');
      
      // Use existing cleanup function
      const { error } = await supabase.functions.invoke('cleanup-demo-data');
      
      if (error) throw error;
      
      toast.success('✅ Demo data cleaned up successfully!');
      setProgress([]);
    } catch (error) {
      toast.error(`Cleanup failed: ${error}`);
    }
  };

  const getPhaseIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'in_progress':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getProgressPercentage = (prog: GenerationProgress) => {
    if (prog.total === 0) return 0;
    return Math.round((prog.current / prog.total) * 100);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Demo Data Generator</h1>
          <p className="text-muted-foreground mt-2">
            Generate comprehensive test data for all system features
          </p>
        </div>

        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">Generate Data</TabsTrigger>
            <TabsTrigger value="cleanup">Cleanup</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
                <CardDescription>
                  Choose dataset size and customize generation parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Dataset Size</Label>
                  <Select value={dataSize} onValueChange={(value: any) => setDataSize(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Small</Badge>
                          <span className="text-xs text-muted-foreground">~1,250 records</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center gap-2">
                          <Badge variant="default">Medium</Badge>
                          <span className="text-xs text-muted-foreground">~7,500 records (Recommended)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="large">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">Large</Badge>
                          <span className="text-xs text-muted-foreground">~30,000 records</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">{config.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Total Campaigns</Label>
                    <Input
                      type="number"
                      value={customCampaigns}
                      onChange={(e) => setCustomCampaigns(parseInt(e.target.value) || 0)}
                      min={1}
                      max={200}
                    />
                    <p className="text-xs text-muted-foreground">
                      Split across all demo clients
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Recipients Per Campaign</Label>
                    <Input
                      type="number"
                      value={customRecipients}
                      onChange={(e) => setCustomRecipients(parseInt(e.target.value) || 0)}
                      min={10}
                      max={500}
                    />
                    <p className="text-xs text-muted-foreground">
                      Average per campaign
                    </p>
                  </div>
                </div>

                <Alert>
                  <Database className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Prerequisites:</strong> Run <code className="bg-muted px-1 rounded">seed-comprehensive-demo-data.sql</code> in Supabase SQL Editor first to create demo brands, clients, contacts, and gift card pools.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  size="lg"
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Demo Data...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Generate Demo Data
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {progress.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Generation Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {progress.map((prog, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getPhaseIcon(prog.status)}
                          <span className="font-medium">{prog.phase}</span>
                          <Badge variant={prog.status === 'completed' ? 'default' : 'secondary'}>
                            {prog.current} / {prog.total}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {getProgressPercentage(prog)}%
                        </span>
                      </div>
                      <Progress value={getProgressPercentage(prog)} />
                      {prog.message && (
                        <p className="text-xs text-muted-foreground">{prog.message}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>What Will Be Generated</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Organizations</div>
                    <div className="text-2xl font-bold">2</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Demo Clients</div>
                    <div className="text-2xl font-bold">10</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Campaigns</div>
                    <div className="text-2xl font-bold">{customCampaigns}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Recipients</div>
                    <div className="text-2xl font-bold">{customCampaigns * customRecipients}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Gift Cards</div>
                    <div className="text-2xl font-bold">~2,000</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Events</div>
                    <div className="text-2xl font-bold">{customCampaigns * config.eventsPerCampaign}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Contacts</div>
                    <div className="text-2xl font-bold">500</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Contact Lists</div>
                    <div className="text-2xl font-bold">50</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cleanup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cleanup Demo Data</CardTitle>
                <CardDescription>
                  Remove all demo data from the system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> This will permanently delete all demo data including:
                    <ul className="list-disc ml-5 mt-2 space-y-1">
                      <li>All campaigns with "Demo" or "Test" in name</li>
                      <li>All fake gift card brands and pools</li>
                      <li>All demo recipients and tracking data</li>
                      <li>All test contacts with @testmail.com emails</li>
                    </ul>
                    <p className="mt-2">Production data will NOT be affected.</p>
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleCleanup}
                  variant="destructive"
                  size="lg"
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete All Demo Data
                </Button>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-2">Manual Cleanup (SQL)</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Alternatively, run this in Supabase SQL Editor:
                  </p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`-- Delete demo brands and cascade
DELETE FROM gift_card_brands 
WHERE is_demo_brand = true;

-- Delete test contacts
DELETE FROM contacts 
WHERE email LIKE '%@testmail.com';

-- Delete demo organizations
DELETE FROM organizations 
WHERE id LIKE 'd%';`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Step 1: Run SQL Script</h4>
              <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                <li>Open Supabase SQL Editor</li>
                <li>Run the contents of: <code className="bg-muted px-1 rounded">seed-comprehensive-demo-data.sql</code></li>
                <li>Wait for completion (~30 seconds)</li>
                <li>Verify demo brands, clients, contacts, and gift cards created</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Step 2: Generate Dynamic Data</h4>
              <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                <li>Choose dataset size above</li>
                <li>Click "Generate Demo Data"</li>
                <li>Wait for campaigns, recipients, and events to be created</li>
                <li>Verify dashboards populate with data</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Step 3: Test System</h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>View campaign analytics with real metrics</li>
                <li>Test gift card redemption with demo codes</li>
                <li>Check call center dashboard</li>
                <li>Verify all charts and graphs display</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

