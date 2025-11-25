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
  { id: 'brands', label: '🏷️ Gift Card Brands', defaultQuantity: 6, description: 'Amazon, Visa, Apple, etc.' },
  { id: 'pools', label: '🎁 Gift Card Pools', defaultQuantity: 12, description: '3-4 pools per client' },
  { id: 'giftCards', label: '💳 Gift Cards', defaultQuantity: 300, description: 'Cards with realistic codes' },
  { id: 'contacts', label: '👥 Contacts', defaultQuantity: 150, description: 'CRM contacts with full data' },
  { id: 'templates', label: '📄 Templates', defaultQuantity: 3, description: 'Mail templates per client' },
  { id: 'landingPages', label: '🌐 Landing Pages', defaultQuantity: 2, description: 'Campaign landing pages' },
  { id: 'campaigns', label: '📢 Campaigns', defaultQuantity: 8, description: 'Campaigns with conditions' },
  { id: 'recipients', label: '📮 Recipients', defaultQuantity: 100, description: 'Campaign recipients' },
  { id: 'trackedNumbers', label: '📞 Tracked Numbers', defaultQuantity: 1, description: 'Per campaign' },
  { id: 'callSessions', label: '☎️ Call Sessions', defaultQuantity: 800, description: 'Historical call data' },
];

const AVAILABLE_BRANDS = [
  { code: 'AMZN', name: 'Amazon', category: 'retail' },
  { code: 'VISA', name: 'Visa', category: 'prepaid' },
  { code: 'TARG', name: 'Target', category: 'retail' },
  { code: 'APPL', name: 'Apple', category: 'technology' },
  { code: 'BEST', name: 'Best Buy', category: 'electronics' },
  { code: 'HOME', name: 'Home Depot', category: 'home_improvement' },
  { code: 'STAR', name: 'Starbucks', category: 'food_beverage' },
  { code: 'WALM', name: 'Walmart', category: 'retail' },
];

export default function EnrichDataPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(DATA_TYPES.map(t => t.id)));
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(DATA_TYPES.map(t => [t.id, t.defaultQuantity]))
  );
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    AVAILABLE_BRANDS.map(b => b.code)
  );
  const [scope, setScope] = useState<'total' | 'per_agency' | 'per_client'>('per_client');
  const [batches, setBatches] = useState<any[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [resetConfirmed, setResetConfirmed] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [activeTab, setActiveTab] = useState<'generate' | 'history' | 'cleanup' | 'reset'>('generate');
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
    const presetMultipliers = {
      light: { brands: 6, pools: 12, giftCards: 100, contacts: 50, templates: 3, landingPages: 2, campaigns: 3, recipients: 30, trackedNumbers: 1, callSessions: 200 },
      medium: { brands: 6, pools: 12, giftCards: 200, contacts: 100, templates: 3, landingPages: 2, campaigns: 5, recipients: 60, trackedNumbers: 1, callSessions: 500 },
      heavy: { brands: 6, pools: 12, giftCards: 300, contacts: 150, templates: 3, landingPages: 2, campaigns: 8, recipients: 100, trackedNumbers: 1, callSessions: 800 },
    };
    setQuantities(presetMultipliers[preset]);
    setSelectedTypes(new Set(DATA_TYPES.map(t => t.id)));
    
    // Set brands based on preset
    if (preset === 'heavy') {
      setSelectedBrands(AVAILABLE_BRANDS.map(b => b.code));
    } else if (preset === 'medium') {
      setSelectedBrands(['AMZN', 'VISA', 'TARG', 'APPL', 'BEST']);
    } else {
      setSelectedBrands(['AMZN', 'VISA', 'TARG']);
    }
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
        selectedBrands,
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

  const handleResetDatabase = async () => {
    if (!resetConfirmed) {
      toast({
        title: 'Confirmation Required',
        description: 'Please check the confirmation box first',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm('⚠️ FINAL WARNING: This will permanently delete ALL transactional data. This cannot be undone. Continue?')) {
      return;
    }

    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-demo-database');

      if (error) throw error;

      toast({
        title: 'Database Reset Complete',
        description: `Deleted ${data.total_deleted} total records. Your database is now clean.`,
      });

      setResetConfirmed(false);
      setResult(null);
      setBatches([]);
      setActiveTab('generate');
      applyPreset('heavy');
    } catch (error: any) {
      console.error('Reset error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset database',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Data Simulation Dashboard</h1>
          <p className="text-muted-foreground">Generate and manage realistic demo data for testing and training</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
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
            <TabsTrigger value="reset" className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              Reset
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

                {/* Gift Card Brands */}
                <div className="space-y-3">
                  <Label>Gift Card Brands</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {AVAILABLE_BRANDS.map((brand) => (
                      <div key={brand.code} className="flex items-center space-x-2 border rounded-lg p-3">
                        <Checkbox
                          id={`brand-${brand.code}`}
                          checked={selectedBrands.includes(brand.code)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedBrands([...selectedBrands, brand.code]);
                            } else {
                              setSelectedBrands(selectedBrands.filter(b => b !== brand.code));
                            }
                          }}
                        />
                        <Label htmlFor={`brand-${brand.code}`} className="cursor-pointer text-sm">
                          {brand.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selected: {selectedBrands.length} of {AVAILABLE_BRANDS.length} brands
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
                        <p className="font-medium text-green-900 dark:text-green-100">Simulation Complete - {result.totalRecords.toLocaleString()} Total Records</p>
                        <Badge variant="outline">Batch #{result.batchId?.slice(0, 8)}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        {result.brandsCreated > 0 && (
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                            <p className="text-muted-foreground text-xs">🏷️ Brands</p>
                            <p className="text-xl font-bold">{result.brandsCreated}</p>
                          </div>
                        )}
                        {result.poolsCreated > 0 && (
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                            <p className="text-muted-foreground text-xs">🎁 Pools</p>
                            <p className="text-xl font-bold">{result.poolsCreated}</p>
                          </div>
                        )}
                        {result.giftCardsCreated > 0 && (
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                            <p className="text-muted-foreground text-xs">💳 Gift Cards</p>
                            <p className="text-xl font-bold">{result.giftCardsCreated.toLocaleString()}</p>
                          </div>
                        )}
                        {result.contactsCreated > 0 && (
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                            <p className="text-muted-foreground text-xs">👥 Contacts</p>
                            <p className="text-xl font-bold">{result.contactsCreated.toLocaleString()}</p>
                          </div>
                        )}
                        {result.contactListsCreated > 0 && (
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                            <p className="text-muted-foreground text-xs">📋 Lists</p>
                            <p className="text-xl font-bold">{result.contactListsCreated}</p>
                          </div>
                        )}
                        {result.contactTagsCreated > 0 && (
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                            <p className="text-muted-foreground text-xs">🏷️ Tags</p>
                            <p className="text-xl font-bold">{result.contactTagsCreated}</p>
                          </div>
                        )}
                        {result.templatesCreated > 0 && (
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                            <p className="text-muted-foreground text-xs">📄 Templates</p>
                            <p className="text-xl font-bold">{result.templatesCreated}</p>
                          </div>
                        )}
                        {result.landingPagesCreated > 0 && (
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                            <p className="text-muted-foreground text-xs">🌐 Pages</p>
                            <p className="text-xl font-bold">{result.landingPagesCreated}</p>
                          </div>
                        )}
                        {result.audiencesCreated > 0 && (
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                            <p className="text-muted-foreground text-xs">🎯 Audiences</p>
                            <p className="text-xl font-bold">{result.audiencesCreated}</p>
                          </div>
                        )}
                        {result.campaignsCreated > 0 && (
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                            <p className="text-muted-foreground text-xs">📢 Campaigns</p>
                            <p className="text-xl font-bold">{result.campaignsCreated}</p>
                          </div>
                        )}
                        {result.conditionsCreated > 0 && (
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                            <p className="text-muted-foreground text-xs">⚡ Conditions</p>
                            <p className="text-xl font-bold">{result.conditionsCreated}</p>
                          </div>
                        )}
                        {result.rewardConfigsCreated > 0 && (
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                            <p className="text-muted-foreground text-xs">🎁 Rewards</p>
                            <p className="text-xl font-bold">{result.rewardConfigsCreated}</p>
                          </div>
                        )}
                        {result.recipientsCreated > 0 && (
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                            <p className="text-muted-foreground text-xs">📮 Recipients</p>
                            <p className="text-xl font-bold">{result.recipientsCreated.toLocaleString()}</p>
                          </div>
                        )}
                        {result.trackedNumbersCreated > 0 && (
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                            <p className="text-muted-foreground text-xs">📞 Numbers</p>
                            <p className="text-xl font-bold">{result.trackedNumbersCreated}</p>
                          </div>
                        )}
                        {result.callSessionsCreated > 0 && (
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                            <p className="text-muted-foreground text-xs">☎️ Calls</p>
                            <p className="text-xl font-bold">{result.callSessionsCreated.toLocaleString()}</p>
                          </div>
                        )}
                        {result.conditionsMetCreated > 0 && (
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                            <p className="text-muted-foreground text-xs">✅ Met</p>
                            <p className="text-xl font-bold">{result.conditionsMetCreated}</p>
                          </div>
                        )}
                        {result.deliveriesCreated > 0 && (
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                            <p className="text-muted-foreground text-xs">📬 Deliveries</p>
                            <p className="text-xl font-bold">{result.deliveriesCreated}</p>
                          </div>
                        )}
                        {result.smsLogsCreated > 0 && (
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                            <p className="text-muted-foreground text-xs">💬 SMS</p>
                            <p className="text-xl font-bold">{result.smsLogsCreated}</p>
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

          <TabsContent value="reset" className="space-y-6">
            <Card className="border-destructive border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Nuclear Option: Complete Database Reset
                </CardTitle>
                <CardDescription className="text-base">
                  <strong className="text-destructive">⚠️ DANGER ZONE</strong> - This is a complete database wipe of ALL transactional data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="rounded-lg bg-destructive/10 p-4 space-y-2">
                    <h4 className="font-semibold text-sm">What Will Be Deleted:</h4>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>All Contacts, Lists, and Segments</li>
                      <li>All Campaigns, Templates, and Landing Pages</li>
                      <li>All Gift Cards, Pools, and Brands</li>
                      <li>All Call Sessions and Tracking Numbers</li>
                      <li>All Recipients and Audience Data</li>
                      <li>All Form Submissions</li>
                      <li>All CRM Events and Integrations</li>
                      <li>All Simulation History</li>
                    </ul>
                  </div>

                  <div className="rounded-lg bg-primary/10 p-4 space-y-2">
                    <h4 className="font-semibold text-sm">What Will Be Preserved:</h4>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>Organizations and Clients (MoPads structure)</li>
                      <li>User Accounts and Roles</li>
                      <li>Permissions and Access Control</li>
                      <li>Documentation and Help Content</li>
                      <li>System Configuration</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border-2 border-destructive bg-destructive/5 p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        id="reset-confirm" 
                        checked={resetConfirmed}
                        onCheckedChange={(checked) => setResetConfirmed(checked === true)}
                      />
                      <label 
                        htmlFor="reset-confirm" 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        I understand this will permanently delete ALL transactional data and cannot be undone. 
                        I want to start with a completely clean database.
                      </label>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleResetDatabase}
                  disabled={!resetConfirmed || isResetting}
                  variant="destructive"
                  size="lg"
                  className="w-full"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting Database...
                    </>
                  ) : (
                    <>
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Reset Database & Start Fresh
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  After reset, you'll be redirected to generate new simulation data
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
