import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { useToast } from '@shared/hooks';

export interface Webhook {
  id: string;
  client_id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  last_triggered_at: string | null;
  failure_count: number;
}

export function useWebhooks(clientId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ["webhooks", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from("webhooks")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Webhook[];
    },
    enabled: !!clientId,
  });

  const createWebhook = useMutation({
    mutationFn: async (webhook: {
      name: string;
      url: string;
      events: string[];
    }) => {
      if (!clientId) throw new Error("No client selected");

      // Generate a random secret
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const secret = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const { data, error } = await supabase
        .from("webhooks")
        .insert({
          client_id: clientId,
          name: webhook.name,
          url: webhook.url,
          events: webhook.events,
          secret,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks", clientId] });
      toast({
        title: "Webhook Created",
        description: "Your webhook has been created successfully",
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

  const updateWebhook = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Webhook>;
    }) => {
      const { error } = await supabase
        .from("webhooks")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks", clientId] });
      toast({
        title: "Webhook Updated",
        description: "Your webhook has been updated successfully",
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

  const deleteWebhook = useMutation({
    mutationFn: async (webhookId: string) => {
      const { error } = await supabase
        .from("webhooks")
        .delete()
        .eq("id", webhookId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks", clientId] });
      toast({
        title: "Webhook Deleted",
        description: "The webhook has been deleted successfully",
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
    webhooks,
    isLoading,
    createWebhook,
    updateWebhook,
    deleteWebhook,
  };
}
