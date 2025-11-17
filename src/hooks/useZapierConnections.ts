import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ZapierConnection {
  id: string;
  client_id: string;
  connection_name: string;
  zap_webhook_url: string;
  description: string | null;
  trigger_events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  success_count: number;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

export interface ZapierTriggerLog {
  id: string;
  zapier_connection_id: string;
  event_type: string;
  payload: any;
  response_status: number | null;
  response_body: string | null;
  error: string | null;
  triggered_at: string;
}

export function useZapierConnections(clientId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: connections, isLoading } = useQuery({
    queryKey: ["zapier-connections", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from("zapier_connections")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ZapierConnection[];
    },
    enabled: !!clientId,
  });

  const createConnection = useMutation({
    mutationFn: async (connection: {
      connection_name: string;
      zap_webhook_url: string;
      description?: string;
      trigger_events: string[];
    }) => {
      if (!clientId) throw new Error("No client selected");

      const { data, error } = await supabase
        .from("zapier_connections")
        .insert({
          client_id: clientId,
          connection_name: connection.connection_name,
          zap_webhook_url: connection.zap_webhook_url,
          description: connection.description,
          trigger_events: connection.trigger_events,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zapier-connections", clientId] });
      toast({
        title: "Zapier Connection Created",
        description: "Your Zap has been connected successfully",
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

  const updateConnection = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<ZapierConnection>;
    }) => {
      const { error } = await supabase
        .from("zapier_connections")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zapier-connections", clientId] });
      toast({
        title: "Connection Updated",
        description: "Your Zapier connection has been updated",
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

  const deleteConnection = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from("zapier_connections")
        .delete()
        .eq("id", connectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zapier-connections", clientId] });
      toast({
        title: "Connection Deleted",
        description: "The Zapier connection has been removed",
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

  const testConnection = useMutation({
    mutationFn: async (connectionId: string) => {
      const connection = connections?.find(c => c.id === connectionId);
      if (!connection) throw new Error("Connection not found");

      const testPayload = {
        event_id: crypto.randomUUID(),
        event_type: "test.connection",
        timestamp: new Date().toISOString(),
        client: { id: clientId },
        data: {
          message: "This is a test event from ACE Engage",
          connection_name: connection.connection_name,
        },
        meta: {
          triggered_by: "user_test",
        },
      };

      const response = await fetch(connection.zap_webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testPayload),
      });

      if (!response.ok) {
        throw new Error(`Test failed: ${response.status} ${response.statusText}`);
      }

      return response;
    },
    onSuccess: () => {
      toast({
        title: "Test Successful",
        description: "Test event sent to Zapier successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    connections,
    isLoading,
    createConnection,
    updateConnection,
    deleteConnection,
    testConnection,
  };
}

export function useZapierLogs(connectionId: string | null) {
  return useQuery({
    queryKey: ["zapier-logs", connectionId],
    queryFn: async () => {
      if (!connectionId) return [];
      
      const { data, error } = await supabase
        .from("zapier_trigger_logs")
        .select("*")
        .eq("zapier_connection_id", connectionId)
        .order("triggered_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ZapierTriggerLog[];
    },
    enabled: !!connectionId,
  });
}
