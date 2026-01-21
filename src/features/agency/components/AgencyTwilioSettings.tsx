/**
 * AgencyTwilioSettings Component
 * 
 * Allows agency owners to configure Twilio at two levels:
 * 1. Their own agency's Twilio account (fallback for all clients)
 * 2. Individual client's Twilio accounts
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Separator } from '@/shared/components/ui/separator';
import { Building2, Users, CheckCircle2 } from 'lucide-react';
import { supabase } from '@core/services/supabase';
import { useTenant } from '@/contexts/TenantContext';
import { 
  TwilioConfigForm, 
  TwilioStatusBadge, 
  TwilioFallbackIndicator 
} from '@/features/settings/components/twilio';
import { useTwilioStatus } from '@/features/settings/hooks/useTwilioConfig';
import { getTwilioStatusType } from '@/features/settings/types/twilio';

export function AgencyTwilioSettings() {
  const { currentOrg } = useTenant();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Get agency ID from current organization
  const agencyId = currentOrg?.id;

  // Fetch agency Twilio status
  const { 
    data: agencyStatus, 
    isLoading: agencyStatusLoading,
    refetch: refetchAgencyStatus
  } = useTwilioStatus(agencyId || null, 'agency');

  // Fetch clients under this agency
  // Note: twilio_enabled and twilio_validated_at columns may not exist yet
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['agency-clients-for-twilio', agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      try {
        // Try fetching with Twilio columns
        const { data, error } = await supabase
          .from('clients')
          .select('id, name, twilio_enabled, twilio_validated_at')
          .eq('agency_id', agencyId)
          .order('name');
        
        if (error) {
          // If columns don't exist, fall back to basic query
          console.warn('Twilio columns may not exist yet, falling back:', error);
          const { data: basicData, error: basicError } = await supabase
            .from('clients')
            .select('id, name')
            .eq('agency_id', agencyId)
            .order('name');
          
          if (basicError) throw basicError;
          // Return with default Twilio values
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

  // Fetch selected client's Twilio status
  const { 
    data: clientStatus, 
    isLoading: clientStatusLoading,
    refetch: refetchClientStatus
  } = useTwilioStatus(selectedClientId, 'client');

  // Count clients by Twilio config status
  const clientStats = {
    ownTwilio: clients?.filter(c => c.twilio_enabled && c.twilio_validated_at).length || 0,
    usingAgency: clients?.filter(c => !c.twilio_enabled || !c.twilio_validated_at).length || 0,
    total: clients?.length || 0,
  };

  if (!agencyId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No agency selected. Please select an organization to configure Twilio.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agency Twilio Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <div>
                <CardTitle>Your Agency Twilio</CardTitle>
                <CardDescription>
                  Configure your agency's Twilio account. This serves as the fallback for all your clients.
                </CardDescription>
              </div>
            </div>
            {agencyStatus && (
              <TwilioStatusBadge
                status={getTwilioStatusType(agencyStatus.ownConfig, agencyStatus.activeConfig)}
                fallbackName={agencyStatus.activeConfig?.entityName}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show fallback info - always show when not using own config */}
          {agencyStatus && (!agencyStatus.ownConfig?.configured || !agencyStatus.ownConfig?.enabled) && (
            <TwilioFallbackIndicator
              activeConfig={agencyStatus.activeConfig}
              fallbackChain={agencyStatus.fallbackChain}
            />
          )}

          {agencyStatusLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <TwilioConfigForm
              level="agency"
              entityId={agencyId}
              initialData={agencyStatus?.ownConfig}
              onSaveSuccess={() => refetchAgencyStatus()}
            />
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Client Twilio Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <div>
              <CardTitle>Client Twilio Configuration</CardTitle>
              <CardDescription>
                Configure Twilio for individual clients. Clients with their own Twilio will use it instead of your agency's.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Client Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-3 rounded-lg border bg-green-50 dark:bg-green-950">
              <p className="text-xl font-bold text-green-700 dark:text-green-300">
                {clientStats.ownTwilio}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">Own Twilio</p>
            </div>
            <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950">
              <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                {clientStats.usingAgency}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Using Agency</p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="text-xl font-bold">{clientStats.total}</p>
              <p className="text-xs text-muted-foreground">Total Clients</p>
            </div>
          </div>

          {/* Client Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Client</label>
            <Select
              value={selectedClientId || ''}
              onValueChange={setSelectedClientId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a client to configure..." />
              </SelectTrigger>
              <SelectContent>
                {clientsLoading ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : clients?.length === 0 ? (
                  <SelectItem value="none" disabled>No clients found</SelectItem>
                ) : (
                  clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center gap-2">
                        <span>{client.name}</span>
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

          {/* Client Twilio Form */}
          {selectedClientId && (
            <div className="mt-4 pt-4 border-t space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  {clients?.find(c => c.id === selectedClientId)?.name} Twilio Configuration
                </h4>
                {clientStatus && (
                  <TwilioStatusBadge
                    status={getTwilioStatusType(clientStatus.ownConfig, clientStatus.activeConfig)}
                    fallbackName={clientStatus.activeConfig?.entityName}
                  />
                )}
              </div>

              {clientStatus && (
                <TwilioFallbackIndicator
                  activeConfig={clientStatus.activeConfig}
                  fallbackChain={clientStatus.fallbackChain}
                />
              )}

              {clientStatusLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <TwilioConfigForm
                  level="client"
                  entityId={selectedClientId}
                  initialData={clientStatus?.ownConfig}
                  onSaveSuccess={() => refetchClientStatus()}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
