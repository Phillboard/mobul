import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EnrichmentData {
  recipientId: string;
  updates: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    custom_fields?: Record<string, any>;
  };
  verifiedFields?: string[];
}

export const useRecipientEnrichment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recipientId, updates, verifiedFields }: EnrichmentData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update recipient
      const { error: updateError } = await supabase
        .from("recipients")
        .update({
          ...updates,
          last_enriched_at: new Date().toISOString(),
          enriched_by_user_id: user.id,
        })
        .eq("id", recipientId);

      if (updateError) throw updateError;

      // Log each enrichment
      const enrichmentLogs = Object.entries(updates).map(([field, newValue]) => ({
        recipient_id: recipientId,
        agent_user_id: user.id,
        field_updated: field,
        new_value: String(newValue),
        enrichment_source: "call_center",
        is_verified: verifiedFields?.includes(field) || false,
      }));

      const { error: logError } = await supabase
        .from("recipient_enrichment_log")
        .insert(enrichmentLogs);

      if (logError) throw logError;

      return { recipientId, updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipient"] });
      queryClient.invalidateQueries({ queryKey: ["agent-stats-today"] });
      toast.success("Customer information updated");
    },
    onError: (error) => {
      console.error("Enrichment error:", error);
      toast.error("Failed to update customer information");
    },
  });
};
