import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ApiKey {
  id: string;
  key_name: string;
  key_hash: string;
  key_prefix: string;
  client_id: string | null;
  user_id: string;
  scopes: string[];
  status: 'active' | 'revoked' | 'expired';
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  revoke_reason: string | null;
}

interface CreateApiKeyRequest {
  keyName: string;
  scopes?: string[];
  expiresInDays?: number;
  clientId?: string;
}

interface RotateApiKeyRequest {
  keyId: string;
  expiresInDays?: number;
}

export function useApiKeys(clientId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all API keys
  const {
    data: apiKeys,
    isLoading,
    error
  } = useQuery({
    queryKey: ['api-keys', clientId],
    queryFn: async () => {
      let query = supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ApiKey[];
    }
  });

  // Create new API key
  const createApiKey = useMutation({
    mutationFn: async (request: CreateApiKeyRequest) => {
      const { data, error } = await supabase.functions.invoke('generate-api-key', {
        body: {
          action: 'create',
          keyName: request.keyName,
          scopes: request.scopes || ['read'],
          expiresInDays: request.expiresInDays,
          clientId: request.clientId || clientId
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', clientId] });
      toast({
        title: 'API Key Created',
        description: `Key: ${data.key}. Save this now - it won't be shown again!`
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error Creating API Key',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Rotate API key (generates new key, revokes old one)
  const rotateApiKey = useMutation({
    mutationFn: async (request: RotateApiKeyRequest) => {
      const { data, error } = await supabase.functions.invoke('generate-api-key', {
        body: {
          action: 'rotate',
          keyId: request.keyId,
          expiresInDays: request.expiresInDays
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', clientId] });
      toast({
        title: 'API Key Rotated',
        description: `New key: ${data.key}. Save this now - it won't be shown again!`
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error Rotating API Key',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Revoke API key
  const revokeApiKey = useMutation({
    mutationFn: async ({
      keyId,
      reason
    }: {
      keyId: string;
      reason?: string;
    }) => {
      const { error } = await supabase
        .from('api_keys')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          revoked_by: (await supabase.auth.getUser()).data.user?.id,
          revoke_reason: reason
        })
        .eq('id', keyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', clientId] });
      toast({
        title: 'API Key Revoked',
        description: 'The API key has been revoked and can no longer be used.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error Revoking API Key',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Update API key metadata (name, scopes)
  const updateApiKey = useMutation({
    mutationFn: async ({
      keyId,
      keyName,
      scopes
    }: {
      keyId: string;
      keyName?: string;
      scopes?: string[];
    }) => {
      const updates: any = {};
      if (keyName) updates.key_name = keyName;
      if (scopes) updates.scopes = scopes;

      const { error } = await supabase
        .from('api_keys')
        .update(updates)
        .eq('id', keyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', clientId] });
      toast({
        title: 'API Key Updated',
        description: 'The API key has been updated successfully.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error Updating API Key',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Get API key usage stats
  const { data: usageStats } = useQuery({
    queryKey: ['api-key-usage', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_api_key_usage_stats', {
        p_client_id: clientId
      });

      if (error) throw error;
      return data;
    },
    enabled: !!clientId
  });

  // Check for expiring keys (within 30 days)
  const expiringKeys = apiKeys?.filter((key) => {
    if (!key.expires_at || key.status !== 'active') return false;
    const expiresAt = new Date(key.expires_at);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiresAt < thirtyDaysFromNow;
  });

  // Check for keys that haven't been used in 90 days
  const unusedKeys = apiKeys?.filter((key) => {
    if (!key.last_used_at || key.status !== 'active') return false;
    const lastUsed = new Date(key.last_used_at);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    return lastUsed < ninetyDaysAgo;
  });

  return {
    apiKeys,
    isLoading,
    error,
    createApiKey: createApiKey.mutateAsync,
    rotateApiKey: rotateApiKey.mutateAsync,
    revokeApiKey: revokeApiKey.mutateAsync,
    updateApiKey: updateApiKey.mutateAsync,
    usageStats,
    expiringKeys,
    unusedKeys,
    isCreating: createApiKey.isPending,
    isRotating: rotateApiKey.isPending,
    isRevoking: revokeApiKey.isPending,
    isUpdating: updateApiKey.isPending
  };
}

// Helper function to validate API key format
export function validateApiKeyFormat(key: string): boolean {
  // Expected format: ace_live_[32_random_chars] or ace_test_[32_random_chars]
  const pattern = /^ace_(live|test)_[a-zA-Z0-9]{32}$/;
  return pattern.test(key);
}

// Helper function to mask API key for display
export function maskApiKey(key: string): string {
  if (!key || key.length < 12) return '••••••••';
  return `${key.substring(0, 12)}${'•'.repeat(key.length - 12)}`;
}

// Helper function to get days until expiration
export function getDaysUntilExpiration(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const expires = new Date(expiresAt);
  const now = new Date();
  const diffTime = expires.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
