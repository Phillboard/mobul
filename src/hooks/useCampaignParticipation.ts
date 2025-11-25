import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CampaignParticipation {
  id: string;
  contact_id: string;
  campaign_id: string;
  recipient_id: string | null;
  participation_status: string;
  redemption_code: string | null;
  participated_at: string;
  delivered_at: string | null;
  redeemed_at: string | null;
  gift_card_id: string | null;
  campaign: {
    id: string;
    name: string;
    status: string;
    mail_date: string | null;
    size: string;
  };
}

export function useCampaignsByContact(contactId?: string) {
  return useQuery({
    queryKey: ["contact-campaigns", contactId],
    queryFn: async () => {
      if (!contactId) throw new Error("No contact ID");

      const { data, error } = await supabase
        .from("contact_campaign_participation")
        .select(`
          *,
          campaign:campaigns(
            id,
            name,
            status,
            mail_date,
            size
          )
        `)
        .eq("contact_id", contactId)
        .order("participated_at", { ascending: false });

      if (error) throw error;
      return data as unknown as CampaignParticipation[];
    },
    enabled: !!contactId,
  });
}

export function useCampaignParticipationStats(contactId?: string) {
  return useQuery({
    queryKey: ["contact-campaign-stats", contactId],
    queryFn: async () => {
      if (!contactId) throw new Error("No contact ID");

      const { data, error } = await supabase
        .from("contact_campaign_participation")
        .select("participation_status")
        .eq("contact_id", contactId);

      if (error) throw error;

      const stats = {
        total: data.length,
        sent: data.filter(p => p.participation_status === "sent").length,
        delivered: data.filter(p => p.participation_status === "delivered").length,
        redeemed: data.filter(p => p.participation_status === "redeemed").length,
      };

      return stats;
    },
    enabled: !!contactId,
  });
}
