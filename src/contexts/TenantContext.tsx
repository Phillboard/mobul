import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from './AuthContext';

interface Organization {
  id: string;
  name: string;
  type: 'internal' | 'agency';
  settings_json: any;
}

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
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, hasRole } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

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
      let orgsQuery = supabase.from('organizations').select('*');
      
      const { data: orgsData, error: orgsError } = await orgsQuery;
      if (orgsError) throw orgsError;

      setOrganizations(orgsData || []);

      // Set default org
      if (orgsData && orgsData.length > 0 && !currentOrg) {
        setCurrentOrg(orgsData[0]);
      }

      // Fetch clients based on role
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*');
      
      if (clientsError) throw clientsError;
      
      setClients(clientsData || []);

      // Set default client for agency admins and client users
      if (clientsData && clientsData.length > 0 && !currentClient) {
        if (hasRole('agency_admin') || hasRole('client_user')) {
          setCurrentClient(clientsData[0]);
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
    // Reset client when org changes
    if (org && clients.length > 0) {
      const orgClients = clients.filter(c => c.org_id === org.id);
      setCurrentClient(orgClients[0] || null);
    } else {
      setCurrentClient(null);
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
        setCurrentClient,
        loading,
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
