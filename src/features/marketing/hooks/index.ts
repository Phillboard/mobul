/**
 * Marketing Hooks Index
 * 
 * Central export point for all marketing-related React hooks.
 * 
 * NOTE: "Campaigns" are called "Broadcasts" in the UI for clarity,
 * but the underlying hooks/tables still use "campaign" terminology.
 * "Automations" remain "Automations" in both UI and code.
 */

export * from './useMarketingCampaigns';
export * from './useMarketingSends';
export * from './useMarketingAutomations';
export * from './useContentLibrary';

// Convenience re-exports with UI-friendly names
export {
  useMarketingCampaigns as useMarketingBroadcasts,
  useMarketingCampaign as useMarketingBroadcast,
  useCreateMarketingCampaign as useCreateMarketingBroadcast,
  useUpdateMarketingCampaign as useUpdateMarketingBroadcast,
  useDeleteMarketingCampaign as useDeleteMarketingBroadcast,
  useSendMarketingCampaign as useSendMarketingBroadcast,
} from './useMarketingCampaigns';
