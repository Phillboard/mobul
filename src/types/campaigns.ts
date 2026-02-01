/**
 * Campaign Type Definitions
 * 
 * Centralized types for campaigns, related entities, and business logic.
 * 
 * **Campaign per PLATFORM_DICTIONARY.md:**
 * A single direct mail marketing initiative with defined audience, design, and rewards.
 * Contains: Recipients (Customers who receive mail), mail design, gift card configuration, conditions.
 * 
 * **Lifecycle:** Draft → Scheduled → In Progress → Completed
 * 
 * **Recipient:** A Customer who is part of a specific Campaign with a unique_code for tracking.
 * 
 * **Condition:** A trigger rule that determines when rewards are given
 * (form submission, QR scan, call completed, time delay).
 * 
 * @see PLATFORM_DICTIONARY.md for complete definitions
 * @see src/lib/terminology.ts for constants
 */

import { Database } from "@core/services/supabase/types";

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
 * Mailing Method
 * Determines how the campaign's mail fulfillment is handled
 */
export type MailingMethod = 'self' | 'ace_fulfillment';

/**
 * Campaign Form Data
 * Shape of data in campaign creation wizard
 * 
 * New Step Order:
 * Step 0: Mailing Method
 * Step 1: Setup (name, template, size)
 * Step 2: Audiences/Contacts (NEW dedicated step)
 * Step 3: Design/Codes/Conditions
 * Step 4: Delivery (Mobul only)
 * Step 5: Review
 */
export interface CampaignFormData {
  // Step 0: Mailing Method
  mailing_method?: MailingMethod;
  design_image_url?: string; // For self-mailers who upload their design
  
  // Step 1: Setup
  name: string;
  size: MailSize;
  template_id?: string | null;
  
  // Step 2: Audiences/Contacts (NEW dedicated step)
  contact_list_id?: string;
  recipient_source?: 'list' | 'segment';
  tag_filters?: string[];
  audience_id?: string; // DEPRECATED: Legacy audience system
  recipient_count?: number;
  audience_selection_complete?: boolean; // NEW: Track if audience step completed
  selected_audience_type?: 'list' | 'segment' | 'csv'; // NEW: Track selection method
  
  // Step 3: Codes & Conditions
  codes_uploaded?: boolean;
  requires_codes?: boolean; // For test campaigns
  selected_form_ids?: string[]; // Forms selected
  
  // Step 3/4: Tracking & Rewards
  enableCallTracking?: boolean;
  trackedNumberId?: string;
  lp_mode?: LandingPageMode;
  landing_page_id?: string;
  base_lp_url?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  condition1PoolId?: string;
  condition1SmsTemplate?: string;
  
  // Step 4/5: Delivery (Mobul fulfillment only)
  postage?: PostageClass;
  mail_date_mode?: 'asap' | 'scheduled';
  mail_date?: Date | null;
  vendor?: string;
  
  // Conditions and rewards
  conditions?: Partial<CampaignCondition>[];
  reward_configs?: Partial<CampaignRewardConfig>[];
  
  // SMS Message Templates
  sms_opt_in_message?: string; // Campaign-level opt-in message template
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
