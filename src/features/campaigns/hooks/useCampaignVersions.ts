import { useQuery } from "@tantml:query/react-query";
import { supabase } from '@core/services/supabase';

export function useCampaignVersions(campaignId: string) {
  return useQuery({
    queryKey: ["campaign-versions", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_versions")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
  });
}

export async function saveCampaignVersion(
  campaignId: string,
  changes: Record<string, any>,
  previousState: Record<string, any>
) {
  // Get current version
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("version")
    .eq("id", campaignId)
    .single();

  const newVersion = (campaign?.version || 0) + 1;

  // Save version snapshot
  const { error: versionError } = await supabase
    .from("campaign_versions")
    .insert({
      campaign_id: campaignId,
      version_number: newVersion,
      changes,
      previous_state: previousState,
    });

  if (versionError) throw versionError;

  // Update campaign with new version
  const { error: updateError } = await supabase
    .from("campaigns")
    .update({
      ...changes,
      version: newVersion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  if (updateError) throw updateError;

  return newVersion;
}

