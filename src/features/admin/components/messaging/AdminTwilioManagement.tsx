/**
 * AdminTwilioManagement Component
 * 
 * Admin panel for managing Twilio configuration at all levels:
 * - Admin/Master level (platform-wide fallback)
 * - Agency level (configure any agency)
 * - Client level (configure any client)
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Badge } from '@/shared/components/ui/badge';
import { Switch } from '@/shared/components/ui/switch';
import { Label } from '@/shared/components/ui/label';
import { 
  Building2, 
  Users, 
  Shield, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw 
} from 'lucide-react';
import { supabase } from '@core/services/supabase';
import { 
  TwilioConfigForm, 
  TwilioStatusBadge, 
  TwilioFallbackIndicator 
} from '@/features/settings/components/twilio';
import { 
  useTwilioStatus, 
  useTwilioOverviewStats 
} from '@/features/settings/hooks/useTwilioConfig';
import { getTwilioStatusType } from '@/features/settings/types/twilio';

type ConfigLevel = 'admin' | 'agency' | 'client';

export function AdminTwilioManagement() {
  const [selectedLevel, setSelectedLevel] = useState<ConfigLevel>('admin');
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [killSwitchEnabled, setKillSwitchEnabled] = useState(false);

  // Fetch all agencies for dropdown - handle case where twilio columns don't exist yet
  const { data: agencies, isLoading: agenciesLoading } = useQuery({
    queryKey: ['admin-agencies-list'],
    queryFn: async () => {
      try {
        // Try fetching with Twilio columns
        const { data, error } = await supabase
          .from('agencies')
          .select('id, name, twilio_enabled, twilio_validated_at')
          .order('name');
        
        if (error) {
          // If columns don't exist, fall back to basic query
          console.warn('Twilio columns may not exist yet on agencies:', error);
          const { data: basicData, error: basicError } = await supabase
            .from('agencies')
            .select('id, name')
            .order('name');
          
          if (basicError) throw basicError;
          return (basicData || []).map(a => ({
            ...a,
            twilio_enabled: false,
            twilio_validated_at: null,
          }));
        }
        
        return data || [];
      } catch (err) {
        console.error('Failed to fetch agencies:', err);
        return [];
      }
    },
    retry: 1,
  });

  // Fetch all clients for dropdown - handle case where twilio columns don't exist yet
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['admin-clients-list'],
    queryFn: async () => {
      try {
        // Try fetching with Twilio columns
        const { data, error } = await supabase
          .from('clients')
          .select('id, name, agency_id, twilio_enabled, twilio_validated_at, agencies(name)')
          .order('name');
        
        if (error) {
          // If columns don't exist, fall back to basic query
          console.warn('Twilio columns may not exist yet on clients:', error);
          const { data: basicData, error: basicError } = await supabase
            .from('clients')
            .select('id, name, agency_id, agencies(name)')
            .order('name');
          
          if (basicError) throw basicError;
          return (basicData || []).map(c => ({
            ...c,
            twilio_enabled: false,
            twilio_validated_at: null,
          }));
        }
        
        return data || [];
      } catch (err) {
        console.error('Failed to fetch clients:', err);
        return [];
      }
    },
    retry: 1,
  });

  // Get overview stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useTwilioOverviewStats();

  // Get status for selected entity
  const entityId = selectedLevel === 'agency' ? selectedAgencyId : selectedLevel === 'client' ? selectedClientId : null;
  const { data: twilioStatus, isLoading: statusLoading } = useTwilioStatus(
    entityId,
    selectedLevel === 'admin' ? 'client' : selectedLevel as 'client' | 'agency'
  );

  const handleLevelChange = (level: ConfigLevel) => {
    setSelectedLevel(level);
    setSelectedAgencyId(null);
    setSelectedClientId(null);
  };

  return (
    <div className="space-y-6">
      {/* Level Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Twilio Configuration Level</CardTitle>
          <CardDescription>
            Select which level you want to configure. As an admin, you can configure Twilio at any level.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedLevel} onValueChange={(v) => handleLevelChange(v as ConfigLevel)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Admin (Master)
              </TabsTrigger>
              <TabsTrigger value="agency" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Agency
              </TabsTrigger>
              <TabsTrigger value="client" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Client
              </TabsTrigger>
            </TabsList>

            <TabsContent value="admin" className="mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Configure the platform-wide master Twilio account. This serves as the fallback for all agencies and clients.
              </p>
            </TabsContent>

            <TabsContent value="agency" className="mt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select an agency to configure their Twilio account.
                </p>
                <Select 
                  value={selectedAgencyId || ''} 
                  onValueChange={setSelectedAgencyId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an agency..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agenciesLoading ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : (
                      agencies?.map((agency) => (
                        <SelectItem key={agency.id} value={agency.id}>
                          <div className="flex items-center gap-2">
                            <span>{agency.name}</span>
                            {agency.twilio_enabled && agency.twilio_validated_at && (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="client" className="mt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select a client to configure their Twilio account.
                </p>
                <Select 
                  value={selectedClientId || ''} 
                  onValueChange={setSelectedClientId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientsLoading ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : (
                      clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          <div className="flex items-center gap-2">
                            <span>{client.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({(client.agencies as any)?.name || 'No Agency'})
                            </span>
                            {client.twilio_enabled && client.twilio_validated_at && (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Configuration Form */}
      {(selectedLevel === 'admin' || selectedAgencyId || selectedClientId) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedLevel === 'admin' && 'Master Twilio Configuration'}
                  {selectedLevel === 'agency' && 'Agency Twilio Configuration'}
                  {selectedLevel === 'client' && 'Client Twilio Configuration'}
                </CardTitle>
                <CardDescription>
                  {selectedLevel === 'admin' && 'Platform-wide fallback for all SMS sending'}
                  {selectedLevel === 'agency' && `Configure Twilio for ${agencies?.find(a => a.id === selectedAgencyId)?.name || 'selected agency'}`}
                  {selectedLevel === 'client' && `Configure Twilio for ${clients?.find(c => c.id === selectedClientId)?.name || 'selected client'}`}
                </CardDescription>
              </div>
              {twilioStatus && (
                <TwilioStatusBadge
                  status={getTwilioStatusType(twilioStatus.ownConfig, twilioStatus.activeConfig)}
                  fallbackName={twilioStatus.activeConfig?.entityName}
                />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Fallback Indicator for non-admin levels */}
            {selectedLevel !== 'admin' && twilioStatus && (
              <TwilioFallbackIndicator
                activeConfig={twilioStatus.activeConfig}
                fallbackChain={twilioStatus.fallbackChain}
              />
            )}

            {statusLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <TwilioConfigForm
                level={selectedLevel}
                entityId={entityId || undefined}
                initialData={twilioStatus?.ownConfig}
                onSaveSuccess={() => refetchStats()}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Kill Switch (Admin Only) */}
      {selectedLevel === 'admin' && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Emergency Kill Switch
            </CardTitle>
            <CardDescription>
              Force all SMS to use the Platform Master Twilio, bypassing all client and agency configurations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950">
              <div>
                <Label htmlFor="kill-switch" className="text-base font-medium">
                  Force Platform Twilio for All SMS
                </Label>
                <p className="text-sm text-muted-foreground">
                  Use this only in emergencies. All SMS will be sent through the platform master account.
                </p>
              </div>
              <Switch
                id="kill-switch"
                checked={killSwitchEnabled}
                onCheckedChange={setKillSwitchEnabled}
              />
            </div>
            {killSwitchEnabled && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Kill Switch Active</AlertTitle>
                <AlertDescription>
                  All client and agency Twilio configurations are being bypassed. All SMS will be sent through the platform master account.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Platform Status Dashboard */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Platform Twilio Overview</CardTitle>
              <CardDescription>
                Status of Twilio configurations across all agencies and clients
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchStats()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Total Agencies"
                  value={stats?.totalAgencies ?? 0}
                  icon={<Building2 className="h-4 w-4" />}
                />
                <StatCard
                  label="Agencies with Twilio"
                  value={stats?.agenciesWithOwnTwilio ?? 0}
                  subValue={stats?.totalAgencies ? `${Math.round((stats.agenciesWithOwnTwilio / Math.max(stats.totalAgencies, 1)) * 100)}%` : '0%'}
                  icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
                />
                <StatCard
                  label="Total Clients"
                  value={stats?.totalClients ?? 0}
                  icon={<Users className="h-4 w-4" />}
                />
                <StatCard
                  label="Clients with Twilio"
                  value={stats?.clientsWithOwnTwilio ?? 0}
                  subValue={stats?.totalClients ? `${Math.round((stats.clientsWithOwnTwilio / Math.max(stats.totalClients, 1)) * 100)}%` : '0%'}
                  icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
                />
              </div>

              {/* Fallback Distribution */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {stats?.clientsWithOwnTwilio ?? 0}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">Using Own Twilio</p>
                </div>
                <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950">
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {stats?.clientsUsingAgencyFallback ?? 0}
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">Using Agency Fallback</p>
                </div>
                <div className="p-4 rounded-lg border bg-purple-50 dark:bg-purple-950">
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {stats?.clientsUsingAdminFallback ?? 0}
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">Using Platform Fallback</p>
                </div>
              </div>

              {/* Health Warnings - only show if there are issues */}
              {stats && (stats.staleValidationCount > 0 || stats.openCircuitCount > 0) && (
                <div className="space-y-2">
                  <h4 className="font-medium text-orange-600">Attention Needed</h4>
                  {stats.staleValidationCount > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {stats.staleValidationCount} accounts need revalidation
                      </AlertDescription>
                    </Alert>
                  )}
                  {stats.openCircuitCount > 0 && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>
                        {stats.openCircuitCount} accounts have circuit breakers open due to failures
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Informational note when stats are empty/default */}
              {(!stats || (stats.totalAgencies === 0 && stats.totalClients === 0)) && (
                <div className="p-4 rounded-lg border bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground">
                    Twilio statistics will appear here once the platform has agencies and clients configured.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  subValue, 
  icon 
}: { 
  label: string; 
  value: number; 
  subValue?: string; 
  icon?: React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold">{value}</span>
        {icon}
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      {subValue && (
        <p className="text-xs text-muted-foreground">{subValue}</p>
      )}
    </div>
  );
}
