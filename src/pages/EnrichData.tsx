import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, AlertCircle, Trash2, Database, Settings, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface DataTypeConfig {
  id: string;
  label: string;
  defaultQuantity: number;
  description: string;
}

const DATA_TYPES: DataTypeConfig[] = [
  { id: 'brands', label: 'Gift Card Brands', defaultQuantity: 10, description: 'Amazon, Visa, Apple, Target, etc.' },
  { id: 'pools', label: 'Gift Card Pools', defaultQuantity: 15, description: 'Per client pools' },
  { id: 'giftCards', label: 'Gift Cards', defaultQuantity: 500, description: 'Realistic card codes' },
  { id: 'campaigns', label: 'Campaigns', defaultQuantity: 5, description: 'Marketing campaigns' },
  { id: 'trackedNumbers', label: 'Tracked Phone Numbers', defaultQuantity: 12, description: 'Call tracking' },
  { id: 'conditions', label: 'Campaign Conditions', defaultQuantity: 30, description: 'Reward triggers' },
  { id: 'callSessions', label: 'Call Sessions', defaultQuantity: 300, description: 'Historical calls' },
  { id: 'contacts', label: 'Contacts', defaultQuantity: 75, description: 'CRM contacts' },
  { id: 'recipients', label: 'Recipients', defaultQuantity: 100, description: 'Campaign recipients' },
];

export default function EnrichDataPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(DATA_TYPES.map(t => t.id)));
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(DATA_TYPES.map(t => [t.id, t.defaultQuantity]))
  );
  const [scope, setScope] = useState<'total' | 'per_agency' | 'per_client'>('per_client');
  const [batches, setBatches] = useState<any[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const { toast } = useToast();

  const handleTypeToggle = (typeId: string) => {
    const newSelected = new Set(selectedTypes);
    if (newSelected.has(typeId)) {
      newSelected.delete(typeId);
    } else {
      newSelected.add(typeId);
    }
    setSelectedTypes(newSelected);
  };

  const handleQuantityChange = (typeId: string, value: string) => {
    const num = parseInt(value) || 0;
    setQuantities(prev => ({ ...prev, [typeId]: num }));
  };

  const applyPreset = (preset: 'light' | 'medium' | 'heavy') => {
    const multipliers = { light: 0.25, medium: 0.5, heavy: 1.0 };
    const mult = multipliers[preset];
    setQuantities(
      Object.fromEntries(DATA_TYPES.map(t => [t.id, Math.floor(t.defaultQuantity * mult)]))
    );
  };

  const calculateTotals = () => {
    const clientCount = 4; // MoPads has 4 clients
    const agencyCount = 1;
    
    return Object.entries(quantities).reduce((acc, [typeId, qty]) => {
      const isSelected = selectedTypes.has(typeId);
      if (!isSelected) return acc;
      
      let total = qty;
      if (scope === 'per_client') total *= clientCount;
      if (scope === 'per_agency') total *= agencyCount;
      
      return acc + total;
    }, 0);
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setResult(null);

      const dataTypes = Array.from(selectedTypes);
      const params = {
        dataTypes,
        quantities,
        scope,
        markAsSimulated: true,
      };

      const { data, error } = await supabase.functions.invoke('enrich-demo-data', {
        body: params,
      });

      if (error) throw error;

      setResult(data);
      toast({
        title: 'Data Simulation Complete',
        description: `Created ${data.totalRecords || 0} records across ${dataTypes.length} data types.`,
      });
      
      // Refresh batch history
      loadBatches();
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Simulation Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    setLoadingBatches(true);
    try {
      const { data, error } = await supabase
        .from('simulation_batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (!error && data) {
        setBatches(data);
      }
    } catch (error) {
      console.error('Error loading batches:', error);
    } finally {
      setLoadingBatches(false);
    }
  };

  const handleCleanupAll = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('cleanup-simulated-data', {
        body: { deleteAll: true },
      });

      if (error) throw error;

      toast({
        title: 'Cleanup Complete',
        description: `Deleted ${data.deletedCount || 0} simulated records.`,
      });
      
      setResult(null);
      loadBatches();
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Cleanup Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupBatch = async (batchId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-simulated-data', {
        body: { batchId },
      });

      if (error) throw error;

      toast({
        title: 'Batch Deleted',
        description: `Removed ${data.deletedCount || 0} records.`,
      });
      
      loadBatches();
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Data Simulation Dashboard</h1>
          <p className="text-muted-foreground">Generate and manage realistic demo data for testing and training</p>
        </div>

        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2" onClick={() => loadBatches()}>
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="cleanup" className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Cleanup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Custom Data Generation</CardTitle>
                <CardDescription>Select data types and quantities to generate</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Preset Buttons */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => applyPreset('light')}>Light (25%)</Button>
                  <Button variant="outline" size="sm" onClick={() => applyPreset('medium')}>Medium (50%)</Button>
                  <Button variant="outline" size="sm" onClick={() => applyPreset('heavy')}>Heavy (100%)</Button>
                </div>

                {/* Scope Selector */}
                <div className="space-y-2">
                  <Label>Generation Scope</Label>
                  <Select value={scope} onValueChange={(v: any) => setScope(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total">Total - Generate X items total</SelectItem>
                      <SelectItem value="per_client">Per Client - Generate X items per client (×4)</SelectItem>
                      <SelectItem value="per_agency">Per Agency - Generate X items per agency</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    This will create approximately <strong>{calculateTotals()}</strong> total records
                  </p>
                </div>

                {/* Data Type Selection */}
                <div className="space-y-4">
                  <Label>Data Types</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {DATA_TYPES.map(type => (
                      <div key={type.id} className="flex items-start space-x-3 border rounded-lg p-4">
                        <Checkbox
                          id={type.id}
                          checked={selectedTypes.has(type.id)}
                          onCheckedChange={() => handleTypeToggle(type.id)}
                        />
                        <div className="flex-1 space-y-2">
                          <Label htmlFor={type.id} className="cursor-pointer">
                            {type.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                          <Input
                            type="number"
                            min="0"
                            value={quantities[type.id]}
                            onChange={(e) => handleQuantityChange(type.id, e.target.value)}
                            disabled={!selectedTypes.has(type.id)}
                            className="w-32"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={loading || selectedTypes.size === 0}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Data...
                    </>
                  ) : (
                    'Generate Simulated Data'
                  )}
                </Button>

                {loading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span>This may take 30-90 seconds depending on quantity...</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results Display */}
            {result && (
              <Card className="border-green-200 bg-green-50 dark:bg-green-950">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-green-900 dark:text-green-100">Simulation Complete</p>
                        <Badge variant="outline">Batch #{result.batchId?.slice(0, 8)}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        {result.brandsCreated > 0 && (
                          <div>
                            <p className="text-green-700 dark:text-green-300">Gift Card Brands</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{result.brandsCreated}</p>
                          </div>
                        )}
                        {result.poolsCreated > 0 && (
                          <div>
                            <p className="text-green-700 dark:text-green-300">Gift Card Pools</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{result.poolsCreated}</p>
                          </div>
                        )}
                        {result.giftCardsCreated > 0 && (
                          <div>
                            <p className="text-green-700 dark:text-green-300">Gift Cards</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{result.giftCardsCreated}</p>
                          </div>
                        )}
                        {result.trackedNumbersCreated > 0 && (
                          <div>
                            <p className="text-green-700 dark:text-green-300">Tracked Numbers</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{result.trackedNumbersCreated}</p>
                          </div>
                        )}
                        {result.callSessionsCreated > 0 && (
                          <div>
                            <p className="text-green-700 dark:text-green-300">Call Sessions</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{result.callSessionsCreated}</p>
                          </div>
                        )}
                        {result.contactsCreated > 0 && (
                          <div>
                            <p className="text-green-700 dark:text-green-300">Contacts</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{result.contactsCreated}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Simulation History</CardTitle>
                <CardDescription>View and manage past simulation batches</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingBatches ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : batches.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No simulation batches found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {batches.map(batch => (
                      <div key={batch.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{batch.id.slice(0, 8)}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(batch.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm">
                            {batch.total_records} records • {batch.data_types?.length || 0} data types
                          </p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Simulation Batch?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete all {batch.total_records} records from this batch. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleCleanupBatch(batch.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cleanup" className="space-y-4">
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Permanently delete simulated data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    This will delete ALL simulated data across all tables. Real data will not be affected.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={loading}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete All Simulated Data
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete ALL simulated data from the database. This action cannot be undone.
                          Real data will not be affected.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCleanupAll} className="bg-destructive">
                          Delete Everything
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
