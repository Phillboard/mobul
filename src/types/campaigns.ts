/**
 * Campaign Type Definitions
 * 
 * Centralized types for campaigns, related entities, and business logic.
 * Used throughout the application for type safety and consistency.
 */

import { Database } from "@/integrations/supabase/types";

// Base table types
type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

/**
 * Campaign Status
 * Represents the lifecycle state of a campaign
 */
export type CampaignStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Landing Page Mode
 * Defines how the landing page is presented to recipients
 */
export type LandingPageMode = 'bridge' | 'purl' | 'direct';

/**
 * Postage Class
 * Mailing delivery speed and cost tier
 */
export type PostageClass = 'first_class' | 'standard';

/**
 * Mail Size
 * Physical dimensions of the mail piece
 */
export type MailSize = '4x6' | '6x9' | '6x11' | 'letter' | 'trifold';

/**
 * Base Campaign
 * Core campaign entity from database
 */
export type Campaign = Tables<'campaigns'>;

/**
 * Campaign with Relations
 * Campaign with commonly joined related data
 */
export interface CampaignWithRelations extends Campaign {
  template?: Tables<'templates'>;
  audience?: Tables<'audiences'>;
  landing_page?: Tables<'landing_pages'>;
  client?: Tables<'clients'>;
  conditions?: CampaignCondition[];
  reward_configs?: CampaignRewardConfig[];
}

/**
 * Campaign Condition
 * Trigger conditions for automated actions (e.g., gift card delivery)
 */
export type CampaignCondition = Tables<'campaign_conditions'>;

/**
 * Campaign Reward Config
 * Configuration for gift card rewards tied to conditions
 */
export type CampaignRewardConfig = Tables<'campaign_reward_configs'>;

/**
 * Campaign Approval
 * Approval/rejection records for campaigns
 */
export type CampaignApproval = Tables<'campaign_approvals'>;

/**
 * Campaign Comment
 * Collaboration comments on campaigns
 */
export type CampaignComment = Tables<'campaign_comments'>;

/**
 * Campaign Version
 * Version history snapshot for campaigns
 */
export type CampaignVersion = Tables<'campaign_versions'>;

/**
 * Campaign Draft
 * Saved progress in campaign creation wizard
 */
export type CampaignDraft = Tables<'campaign_drafts'>;

/**
 * Campaign Prototype
 * Preview configuration for campaign prototypes
 */
export type CampaignPrototype = Tables<'campaign_prototypes'>;

/**
 * Campaign Form Data
 * Shape of data in campaign creation wizard
 */
export interface CampaignFormData {
  // Step 1: Details
  name: string;
  size: MailSize;
  template_id?: string;
  mail_date?: string;
  postage?: PostageClass;
  vendor?: string;
  
  // Step 2: PURL Settings
  lp_mode?: LandingPageMode;
  landing_page_id?: string;
  base_lp_url?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  
  // Step 3: Conditions
  conditions?: Partial<CampaignCondition>[];
  reward_configs?: Partial<CampaignRewardConfig>[];
  
  // Step 4: Audience (set when launching)
  audience_id?: string;
}

/**
 * Campaign Metrics
 * Aggregated statistics for a campaign
 */
export interface CampaignMetrics {
  total_recipients: number;
  mail_delivered: number;
  landing_page_visits: number;
  form_submissions: number;
  calls_received: number;
  gift_cards_delivered: number;
  conversion_rate: number;
}
