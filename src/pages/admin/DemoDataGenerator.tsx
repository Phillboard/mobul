import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Sparkles, Users, Building2, CreditCard, Mail, Database, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import * as demoGen from '@/lib/demo-data-generators';

export default function DemoDataGenerator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedIndustry, setSelectedIndustry] = useState<'roofing' | 'auto_warranty'>('roofing');
  const [contactCount, setContactCount] = useState(50);
  const [cardCount, setCardCount] = useState(25);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [activityLog, setActivityLog] = useState<Array<{ message: string; type: 'success' | 'error' }>>([]);

  // Queries
  const { data: organizations } = useQuery({
    queryKey: ['demo-organizations'],
    queryFn: demoGen.getExistingOrganizations,
  });

  const { data: clients } = useQuery({
    queryKey: ['demo-clients', selectedOrgId],
    queryFn: () => demoGen.getExistingClients(selectedOrgId || undefined),
  });

  const { data: brands } = useQuery({
    queryKey: ['gift-card-brands'],
    queryFn: demoGen.getGiftCardBrands,
  });

  // Helper to add to activity log
  const addActivity = (message: string, type: 'success' | 'error' = 'success') => {
    setActivityLog(prev => [{ message, type }, ...prev.slice(0, 9)]);
  };

  // Mutations
  const createOrgMutation = useMutation({
    mutationFn: demoGen.createDemoOrganization,
    onSuccess: (data) => {
      toast({ title: 'Organization Created', description: data.name });
      addActivity(`Created organization: ${data.name}`);
      queryClient.invalidateQueries({ queryKey: ['demo-organizations'] });
      setSelectedOrgId(data.id);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      addActivity(`Error creating organization: ${error.message}`, 'error');
    },
  });

  const createClientMutation = useMutation({
    mutationFn: ({ orgId, industry }: { orgId: string; industry: 'roofing' | 'auto_warranty' }) =>
      demoGen.createDemoClient(orgId, industry),
    onSuccess: (data) => {
      toast({ title: 'Client Created', description: data.name });
      addActivity(`Created client: ${data.name}`);
      queryClient.invalidateQueries({ queryKey: ['demo-clients'] });
      setSelectedClientId(data.id);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      addActivity(`Error creating client: ${error.message}`, 'error');
    },
  });

  const createContactsMutation = useMutation({
    mutationFn: ({ clientId, count, industry }: { clientId: string; count: number; industry: 'roofing' | 'auto_warranty' }) =>
      demoGen.createDemoContacts(clientId, count, industry),
    onSuccess: (data) => {
      toast({ title: 'Contacts Created', description: `Created ${data.length} contacts` });
      addActivity(`Created ${data.length} contacts`);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      addActivity(`Error creating contacts: ${error.message}`, 'error');
    },
  });

  const createPoolMutation = useMutation({
    mutationFn: ({ clientId, brandId, cardValue, cardCount }: { clientId: string; brandId: string; cardValue: number; cardCount: number }) =>
      demoGen.createDemoGiftCardPool(clientId, brandId, cardValue, cardCount),
    onSuccess: (data) => {
      toast({ title: 'Gift Card Pool Created', description: data.pool_name });
      addActivity(`Created pool: ${data.pool_name}`);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      addActivity(`Error creating pool: ${error.message}`, 'error');
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: ({ clientId, industry }: { clientId: string; industry: 'roofing' | 'auto_warranty' }) =>
      demoGen.createDemoCampaign(clientId, { industry }),
    onSuccess: (data) => {
      toast({ title: 'Campaign Created', description: data.name });
      addActivity(`Created campaign: ${data.name}`);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      addActivity(`Error creating campaign: ${error.message}`, 'error');
    },
  });

  const createCompleteSetupMutation = useMutation({
    mutationFn: (industry: 'roofing' | 'auto_warranty') => demoGen.createCompleteDemoSetup(industry),
    onSuccess: (data) => {
      toast({
        title: 'Complete Setup Created',
        description: `Created org, client, 50 contacts, and campaign`,
      });
      addActivity(`Complete setup created: ${data.client.name}`);
      queryClient.invalidateQueries({ queryKey: ['demo-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['demo-clients'] });
      setSelectedOrgId(data.org.id);
      setSelectedClientId(data.client.id);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      addActivity(`Error creating complete setup: ${error.message}`, 'error');
    },
  });

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Demo Data Generator</h1>
          <p className="text-muted-foreground mt-2">
            Create demo data incrementally for testing and demonstrations
          </p>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              One-click actions to create complete demo setups
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                onClick={() => createCompleteSetupMutation.mutate(selectedIndustry)}
                disabled={createCompleteSetupMutation.isPending}
                size="lg"
                className="flex-1"
              >
                {createCompleteSetupMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create Complete Demo Setup
                  </>
                )}
              </Button>
              <Select value={selectedIndustry} onValueChange={(v: 'roofing' | 'auto_warranty') => setSelectedIndustry(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="roofing">Roofing</SelectItem>
                  <SelectItem value="auto_warranty">Auto Warranty</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Badge variant="outline">
                {organizations?.length || 0} Orgs
              </Badge>
              <Badge variant="outline">
                {clients?.length || 0} Clients
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Organizations & Clients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organizations & Clients
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Create Organization</Label>
                <Button
                  onClick={() => createOrgMutation.mutate()}
                  disabled={createOrgMutation.isPending}
                  className="w-full"
                  variant="outline"
                >
                  {createOrgMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Create Agency
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Select Organization</Label>
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization..." />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations?.map(org => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Industry</Label>
                <Select value={selectedIndustry} onValueChange={(v: 'roofing' | 'auto_warranty') => setSelectedIndustry(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="roofing">Roofing</SelectItem>
                    <SelectItem value="auto_warranty">Auto Warranty</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => {
                  if (!selectedOrgId) {
                    toast({ title: 'Error', description: 'Select an organization first', variant: 'destructive' });
                    return;
                  }
                  createClientMutation.mutate({ orgId: selectedOrgId, industry: selectedIndustry });
                }}
                disabled={!selectedOrgId || createClientMutation.isPending}
                className="w-full"
              >
                {createClientMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Create Client
              </Button>
            </CardContent>
          </Card>

          {/* Contacts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Contacts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Client</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Number of Contacts</Label>
                <Input
                  type="number"
                  value={contactCount}
                  onChange={(e) => setContactCount(parseInt(e.target.value) || 50)}
                  min={1}
                  max={500}
                />
              </div>

              <Button
                onClick={() => {
                  if (!selectedClientId) {
                    toast({ title: 'Error', description: 'Select a client first', variant: 'destructive' });
                    return;
                  }
                  const client = clients?.find(c => c.id === selectedClientId);
                  const industry = (client?.industry as 'roofing' | 'auto_warranty') || 'roofing';
                  createContactsMutation.mutate({
                    clientId: selectedClientId,
                    count: contactCount,
                    industry,
                  });
                }}
                disabled={!selectedClientId || createContactsMutation.isPending}
                className="w-full"
              >
                {createContactsMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Generate Contacts
              </Button>
            </CardContent>
          </Card>

          {/* Gift Cards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Gift Card Pools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Brand</Label>
                <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand..." />
                  </SelectTrigger>
                  <SelectContent>
                    {brands?.map(brand => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Number of Cards</Label>
                <Input
                  type="number"
                  value={cardCount}
                  onChange={(e) => setCardCount(parseInt(e.target.value) || 25)}
                  min={1}
                  max={100}
                />
              </div>

              <Button
                onClick={() => {
                  if (!selectedClientId || !selectedBrandId) {
                    toast({ title: 'Error', description: 'Select a client and brand first', variant: 'destructive' });
                    return;
                  }
                  createPoolMutation.mutate({
                    clientId: selectedClientId,
                    brandId: selectedBrandId,
                    cardValue: 25,
                    cardCount,
                  });
                }}
                disabled={!selectedClientId || !selectedBrandId || createPoolMutation.isPending}
                className="w-full"
              >
                {createPoolMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Create Pool with {cardCount} Cards
              </Button>
            </CardContent>
          </Card>

          {/* Campaign */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Demo Campaign
              </CardTitle>
              <CardDescription>
                Creates campaign with template, landing page, and rewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => {
                  if (!selectedClientId) {
                    toast({ title: 'Error', description: 'Select a client first', variant: 'destructive' });
                    return;
                  }
                  const client = clients?.find(c => c.id === selectedClientId);
                  const industry = (client?.industry as 'roofing' | 'auto_warranty') || 'roofing';
                  createCampaignMutation.mutate({ clientId: selectedClientId, industry });
                }}
                disabled={!selectedClientId || createCampaignMutation.isPending}
                className="w-full"
                size="lg"
              >
                {createCampaignMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Campaign...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create Demo Campaign
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Activity Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet</p>
            ) : (
              <div className="space-y-2">
                {activityLog.map((log, i) => (
                  <div
                    key={i}
                    className={`text-sm p-2 rounded ${
                      log.type === 'success' ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'
                    }`}
                  >
                    {log.message}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

