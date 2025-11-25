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
        title: 'Data Enrichment Complete',
        description: `Enriched ${data.contactsEnriched} contacts, created ${data.recipientsCreated} recipients, and ${data.giftCardsCreated} gift cards.`,
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
          <CardTitle className="text-2xl">Enrich Demo Data</CardTitle>
          <CardDescription>
            Add realistic simulated data to your database for demonstration purposes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
            <p className="font-medium">This will:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Fix all count mismatches in audiences, lists, and pools</li>
              <li>Remove fake placeholder data</li>
              <li>Enrich 118 existing contacts with company info</li>
              <li>Create 460+ realistic recipients across 8 audiences</li>
              <li>Add 25 gift cards per Starbucks pool</li>
              <li>Create 160 contacts across 4 demo clients</li>
            </ul>
          </div>

          {result && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-medium text-green-900">Enrichment Successful</p>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>✓ {result.contactsEnriched} contacts enriched</li>
                      <li>✓ {result.recipientsCreated} recipients created</li>
                      <li>✓ {result.giftCardsCreated} gift cards added</li>
                      <li>✓ {result.audiencesEnriched.length} audiences populated</li>
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
                Enriching Data...
              </>
            ) : (
              'Enrich Data Now'
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
