import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useAPIKeys(clientId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ["api-keys", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const createAPIKey = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      if (!clientId) throw new Error("No client selected");

      const { data, error } = await supabase.functions.invoke("generate-api-key", {
        body: { client_id: clientId, name },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys", clientId] });
      toast({
        title: "API Key Created",
        description: "Save this key securely - it won't be shown again",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const revokeAPIKey = useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await supabase
        .from("api_keys")
        .update({ revoked: true, revoked_at: new Date().toISOString() })
        .eq("id", keyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys", clientId] });
      toast({
        title: "API Key Revoked",
        description: "The API key has been revoked successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    apiKeys,
    isLoading,
    createAPIKey,
    revokeAPIKey,
  };
}
