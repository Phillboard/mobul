import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function EnrichDataPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleEnrich = async () => {
    try {
      setLoading(true);
      setResult(null);

      const { data, error } = await supabase.functions.invoke('enrich-demo-data');

      if (error) throw error;

      setResult(data);
      toast({
        title: 'Data Simulation Complete',
        description: `Created ${data.brandsCreated} brands, ${data.poolsCreated} pools, ${data.giftCardsCreated} gift cards, ${data.callSessionsCreated} calls, and ${data.contactsCreated} contacts.`,
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Enrichment Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Simulate Comprehensive Data</CardTitle>
          <CardDescription>
            Generate complete simulation data including brands, gift cards, calls, conditions, and contacts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
            <p className="font-medium">This will create comprehensive simulated data:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Create 10+ gift card brands (Amazon, Visa, Apple, Target, etc.)</li>
              <li>Generate 15+ gift card pools for all MoPads clients</li>
              <li>Create 500+ realistic gift cards with proper formats</li>
              <li>Set up 12 tracked phone numbers across campaigns</li>
              <li>Add campaign conditions and reward configs</li>
              <li>Generate 300 call sessions over 90 days with realistic data</li>
              <li>Record condition completions and gift card deliveries</li>
              <li>Create 75 contacts per MoPads client (300+ total)</li>
            </ul>
          </div>

          {result && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-medium text-green-900">Simulation Successful</p>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>✓ {result.brandsCreated} brands created</li>
                      <li>✓ {result.poolsCreated} pools created</li>
                      <li>✓ {result.giftCardsCreated} gift cards generated</li>
                      <li>✓ {result.trackedNumbersCreated} tracked numbers</li>
                      <li>✓ {result.conditionsCreated} campaign conditions</li>
                      <li>✓ {result.callSessionsCreated} call sessions</li>
                      <li>✓ {result.conditionsMetCreated} conditions met</li>
                      <li>✓ {result.deliveriesCreated} gift card deliveries</li>
                      <li>✓ {result.contactsCreated} contacts created</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={handleEnrich}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Data...
              </>
            ) : (
              'Generate Data Now'
            )}
          </Button>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>This may take 30-60 seconds to complete...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
