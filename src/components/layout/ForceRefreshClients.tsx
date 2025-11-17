import { useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';

/**
 * Component to force refresh tenant data - mount this temporarily to clear cache
 * This is a development helper component
 */
export function ForceRefreshClients() {
  const { clients } = useTenant();
  
  useEffect(() => {
    console.log('Current clients loaded:', clients.length, clients.map(c => c.name));
  }, [clients]);
  
  return null;
}
