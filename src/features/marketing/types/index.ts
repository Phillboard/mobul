/**
 * Marketing Feature Type Definitions
 * 
 * Types for email/SMS marketing campaigns and automations.
 */

// ============================================================================
// ENUMS / UNION TYPES
// ============================================================================

/** Marketing campaign type */
export type CampaignType = 'email' | 'sms' | 'both';

/** Marketing campaign status */
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';

/** Marketing send status */
export type SendStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'unsubscribed';

/** Audience selection type */
export type AudienceType = 'all_contacts' | 'contact_list' | 'segment' | 'manual';

/** Automation trigger type */
export type TriggerType = 
  | 'mail_campaign_sent' 
  | 'mail_campaign_delivered' 
  | 'gift_card_redeemed' 
  | 'form_submitted' 
  | 'recipient_approved' 
  | 'manual';

/** Automation step type */
export type StepType = 'send_email' | 'send_sms' | 'wait' | 'condition';

/** Automation enrollment status */
export type EnrollmentStatus = 'active' | 'completed' | 'cancelled' | 'failed';

// ============================================================================
// MARKETING CAMPAIGN TYPES
// ============================================================================

/** Audience configuration for targeting */
export interface AudienceConfig {
  /** Selected contact list IDs */
  listIds?: string[];
  /** Segment filter rules */
  segmentRules?: SegmentRule[];
  /** Manually selected contact IDs */
  contactIds?: string[];
  /** Tag filters */
  tagFilters?: string[];
}

/** Segment filter rule */
export interface SegmentRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'gt' | 'lt' | 'is_empty' | 'is_not_empty';
  value?: string | number | boolean;
}

/** Marketing campaign entity */
export interface MarketingCampaign {
  id: string;
  client_id: string;
  name: string;
  description?: string | null;
  campaign_type: CampaignType;
  status: CampaignStatus;
  linked_mail_campaign_id?: string | null;
  audience_type: AudienceType;
  audience_config: AudienceConfig;
  scheduled_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  unsubscribed_count: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

/** Marketing campaign message */
export interface MarketingMessage {
  id: string;
  campaign_id: string;
  message_type: 'email' | 'sms';
  template_id?: string | null;
  subject?: string | null;
  body_html?: string | null;
  body_text?: string | null;
  sequence_order: number;
  delay_minutes: number;
  created_at: string;
  updated_at: string;
}

/** Marketing send record */
export interface MarketingSend {
  id: string;
  campaign_id: string;
  message_id: string;
  contact_id?: string | null;
  message_type: 'email' | 'sms';
  recipient_email?: string | null;
  recipient_phone?: string | null;
  status: SendStatus;
  sent_at?: string | null;
  delivered_at?: string | null;
  opened_at?: string | null;
  clicked_at?: string | null;
  error_message?: string | null;
  provider_message_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

/** Campaign with messages */
export interface MarketingCampaignWithMessages extends MarketingCampaign {
  messages: MarketingMessage[];
}

// ============================================================================
// AUTOMATION TYPES
// ============================================================================

/** Automation trigger configuration */
export interface AutomationTriggerConfig {
  /** Campaign ID for mail campaign triggers */
  campaignId?: string;
  /** Form ID for form submission triggers */
  formId?: string;
  /** Whether to trigger for all campaigns or specific */
  allCampaigns?: boolean;
  /** Delay in days after trigger event */
  delayDays?: number;
}

/** Automation step configuration */
export interface AutomationStepConfig {
  /** Delay in minutes for wait steps */
  delayMinutes?: number;
  /** Custom subject for email (overrides template) */
  subject?: string;
  /** Custom body for messages (overrides template) */
  body?: string;
  /** Condition rules for branching */
  conditionRules?: SegmentRule[];
}

/** Marketing automation entity */
export interface MarketingAutomation {
  id: string;
  client_id: string;
  name: string;
  description?: string | null;
  trigger_type: TriggerType;
  trigger_config: AutomationTriggerConfig;
  is_active: boolean;
  total_enrolled: number;
  total_completed: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

/** Automation step entity */
export interface AutomationStep {
  id: string;
  automation_id: string;
  step_order: number;
  step_type: StepType;
  template_id?: string | null;
  config: AutomationStepConfig;
  created_at: string;
  updated_at: string;
}

/** Automation enrollment entity */
export interface AutomationEnrollment {
  id: string;
  automation_id: string;
  contact_id?: string | null;
  recipient_id?: string | null;
  current_step: number;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at?: string | null;
  next_step_at?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

/** Automation with steps */
export interface MarketingAutomationWithSteps extends MarketingAutomation {
  steps: AutomationStep[];
}

// ============================================================================
// ANALYTICS / STATS TYPES
// ============================================================================

/** Campaign statistics summary */
export interface CampaignStats {
  total_recipients: number;
  sent_count: number;
  sent_percentage: number;
  delivered_count: number;
  delivery_rate: number;
  opened_count: number;
  open_rate: number;
  clicked_count: number;
  click_rate: number;
  bounced_count: number;
  bounce_rate: number;
  unsubscribed_count: number;
  unsubscribe_rate: number;
  failed_count: number;
}

/** Automation statistics summary */
export interface AutomationStats {
  total_enrolled: number;
  active_count: number;
  completed_count: number;
  completion_rate: number;
  failed_count: number;
  cancelled_count: number;
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

/** Campaign builder form data */
export interface CampaignBuilderFormData {
  // Step 1: Type
  campaign_type: CampaignType;
  linked_mail_campaign_id?: string;
  
  // Step 2: Audience
  audience_type: AudienceType;
  audience_config: AudienceConfig;
  
  // Step 3: Messages
  name: string;
  description?: string;
  email_subject?: string;
  email_body_html?: string;
  email_template_id?: string;
  sms_body?: string;
  sms_template_id?: string;
  
  // Step 4: Schedule
  schedule_type: 'immediate' | 'scheduled' | 'follow_up';
  scheduled_at?: Date;
  follow_up_delay_days?: number;
  follow_up_trigger?: 'sent' | 'delivered';
}

/** Automation builder form data */
export interface AutomationBuilderFormData {
  name: string;
  description?: string;
  trigger_type: TriggerType;
  trigger_config: AutomationTriggerConfig;
  steps: Omit<AutomationStep, 'id' | 'automation_id' | 'created_at' | 'updated_at'>[];
}

// ============================================================================
// FILTER TYPES
// ============================================================================

/** Campaign list filters */
export interface CampaignFilters {
  status?: CampaignStatus[];
  campaign_type?: CampaignType[];
  search?: string;
  date_from?: Date;
  date_to?: Date;
}

/** Automation list filters */
export interface AutomationFilters {
  is_active?: boolean;
  trigger_type?: TriggerType[];
  search?: string;
}
