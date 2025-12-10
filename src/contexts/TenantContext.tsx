import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/core/auth/AuthProvider';

/**
 * Organization entity
 * 
 * Per PLATFORM_DICTIONARY.md:
 * - 'platform' = ACE Engage itself (top-level)
 * - 'agency' = Marketing agency/reseller using ACE Engage
 * 
 * Note: 'internal' is legacy, should be 'platform'
 */
interface Organization {
  id: string;
  name: string;
  type: 'internal' | 'agency' | 'platform'; // 'internal' is legacy for 'platform'
  settings_json: any;
}

/**
 * Client entity
 * 
 * Per PLATFORM_DICTIONARY.md:
 * A business that the Agency serves. The end customer of the Agency.
 * Example: "Joe's Auto Dealership" (client of ABC Marketing Agency)
 * 
 * NOT to be confused with:
 * - Customer (person who receives mail)
 * - API client (software)
 */
interface Client {
  id: string;
  org_id: string;
  name: string;
  industry: Database['public']['Enums']['industry_type'];
  timezone: string;
  logo_url: string | null;
  brand_colors_json: any;
}

interface TenantContextType {
  organizations: Organization[];
  clients: Client[];
  currentOrg: Organization | null;
  currentClient: Client | null;
  setCurrentOrg: (org: Organization | null) => void;
  setCurrentClient: (client: Client | null) => void;
  loading: boolean;
  isAdminMode: boolean;
  setAdminMode: (mode: boolean) => void;
  impersonatedUserId: string | null;
  setImpersonatedUserId: (userId: string | null) => void;
  refetchTenantData: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, hasRole } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(() => {
    const stored = localStorage.getItem('adminMode');
    return stored === 'true';
  });
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setOrganizations([]);
      setClients([]);
      setCurrentOrg(null);
      setCurrentClient(null);
      setLoading(false);
      return;
    }

    fetchTenantData();
  }, [user]);

  const fetchTenantData = async () => {
    try {
      setLoading(true);

      // Fetch organizations based on role
      const orgsQuery = supabase.from('organizations').select('*');

      const { data: orgsData, error: orgsError } = await orgsQuery;
      if (orgsError) throw orgsError;

      setOrganizations(orgsData || []);

      // Restore or set default org
      const savedOrgId = localStorage.getItem('currentOrgId');
      if (savedOrgId && orgsData) {
        const savedOrg = orgsData.find(o => o.id === savedOrgId);
        if (savedOrg) {
          setCurrentOrg(savedOrg);
        } else if (orgsData.length > 0) {
          setCurrentOrg(orgsData[0]);
          localStorage.setItem('currentOrgId', orgsData[0].id);
        }
      } else if (orgsData && orgsData.length > 0 && !currentOrg) {
        setCurrentOrg(orgsData[0]);
        localStorage.setItem('currentOrgId', orgsData[0].id);
      }

      // Fetch clients based on role
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*');

      if (clientsError) throw clientsError;

      setClients(clientsData || []);

      // Restore or set default client
      const savedClientId = localStorage.getItem('currentClientId');
      if (savedClientId && clientsData) {
        const savedClient = clientsData.find(c => c.id === savedClientId);
        if (savedClient) {
          setCurrentClient(savedClient);
        }
      } else if (clientsData && clientsData.length > 0 && !currentClient) {
        if (hasRole('agency_owner') || hasRole('company_owner')) {
          setCurrentClient(clientsData[0]);
          localStorage.setItem('currentClientId', clientsData[0].id);
        }
      }

    } catch (error) {
      console.error('Error fetching tenant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetCurrentOrg = (org: Organization | null) => {
    setCurrentOrg(org);
    if (org) {
      localStorage.setItem('currentOrgId', org.id);
    } else {
      localStorage.removeItem('currentOrgId');
    }
    // Reset client when org changes
    if (org && clients.length > 0) {
      const orgClients = clients.filter(c => c.org_id === org.id);
      const firstClient = orgClients[0] || null;
      setCurrentClient(firstClient);
      if (firstClient) {
        localStorage.setItem('currentClientId', firstClient.id);
      } else {
        localStorage.removeItem('currentClientId');
      }
    } else {
      setCurrentClient(null);
      localStorage.removeItem('currentClientId');
    }
  };

  const handleSetCurrentClient = (client: Client | null) => {
    setCurrentClient(client);
    if (client) {
      localStorage.setItem('currentClientId', client.id);
      // When selecting a client, exit admin mode
      setIsAdminMode(false);
      localStorage.setItem('adminMode', 'false');
    } else {
      localStorage.removeItem('currentClientId');
      // When clearing client, enter admin mode
      setIsAdminMode(true);
      localStorage.setItem('adminMode', 'true');
    }
  };

  return (
    <TenantContext.Provider
      value={{
        organizations,
        clients,
        currentOrg,
        currentClient,
        setCurrentOrg: handleSetCurrentOrg,
        setCurrentClient: handleSetCurrentClient,
        loading,
        isAdminMode,
        setAdminMode: (mode) => {
          setIsAdminMode(mode);
          localStorage.setItem('adminMode', mode.toString());
          if (mode) {
            setCurrentClient(null);
          }
        },
        impersonatedUserId,
        setImpersonatedUserId,
        refetchTenantData: fetchTenantData,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
