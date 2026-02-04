import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
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

      // Fetch current recipient data for change detection
      const { data: currentRecipient } = await supabase
        .from("recipients")
        .select("first_name, last_name, phone, email, address, city, state, zip, custom_fields")
        .eq("id", recipientId)
        .single();

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

      // Build enrichment log entries - only for fields that actually changed
      const enrichmentLogs: Array<{
        recipient_id: string;
        agent_user_id: string;
        field_updated: string;
        old_value: string;
        new_value: string;
        enrichment_source: string;
        is_verified: boolean;
      }> = [];

      // Log standard field changes
      const standardFields = ['first_name', 'last_name', 'phone', 'email', 'address', 'city', 'state', 'zip'] as const;
      for (const field of standardFields) {
        if (updates[field] !== undefined) {
          const oldVal = currentRecipient?.[field] || '';
          const newVal = updates[field] || '';
          if (String(oldVal) !== String(newVal)) {
            enrichmentLogs.push({
              recipient_id: recipientId,
              agent_user_id: user.id,
              field_updated: field,
              old_value: String(oldVal),
              new_value: String(newVal),
              enrichment_source: "call_center",
              is_verified: verifiedFields?.includes(field) || false,
            });
          }
        }
      }

      // Log custom field changes individually with custom_fields.{name} format
      if (updates.custom_fields) {
        const currentCustom = (currentRecipient?.custom_fields as Record<string, any>) || {};
        for (const [fieldName, newValue] of Object.entries(updates.custom_fields)) {
          const oldVal = currentCustom[fieldName];
          const newValStr = newValue != null ? JSON.stringify(newValue) : '';
          const oldValStr = oldVal != null ? JSON.stringify(oldVal) : '';
          if (oldValStr !== newValStr) {
            enrichmentLogs.push({
              recipient_id: recipientId,
              agent_user_id: user.id,
              field_updated: `custom_fields.${fieldName}`,
              old_value: oldValStr,
              new_value: newValStr,
              enrichment_source: "call_center",
              is_verified: verifiedFields?.includes(`custom_fields.${fieldName}`) || false,
            });
          }
        }
      }

      // Only log if there were actual changes
      if (enrichmentLogs.length > 0) {
        const { error: logError } = await supabase
          .from("recipient_enrichment_log")
          .insert(enrichmentLogs);

        if (logError) {
          // Non-critical - log failure shouldn't block the enrichment save
          console.error("Failed to log enrichment:", logError);
        }
      }

      return { recipientId, updates, changedFields: enrichmentLogs.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["recipient"] });
      queryClient.invalidateQueries({ queryKey: ["agent-stats-today"] });
      if (data.changedFields > 0) {
        toast.success(`Customer information updated (${data.changedFields} field${data.changedFields > 1 ? 's' : ''} changed)`);
      } else {
        toast.success("Customer information saved");
      }
    },
    onError: (error) => {
      console.error("Enrichment error:", error);
      toast.error("Failed to update customer information");
    },
  });
};
