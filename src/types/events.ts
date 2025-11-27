/**
 * Event Tracking Type Definitions
 * 
 * Types for all event tracking and analytics
 */

import { EventData } from './json-schemas';

// Event types
export type EventType = 
  | 'purl_visit'
  | 'qr_scan'
  | 'form_submission'
  | 'form_view'
  | 'call_received'
  | 'call_completed'
  | 'gift_card_claimed'
  | 'gift_card_delivered'
  | 'gift_card_redeemed'
  | 'email_opened'
  | 'email_clicked'
  | 'sms_delivered'
  | 'campaign_created'
  | 'campaign_approved'
  | 'campaign_sent'
  | 'recipient_added'
  | 'condition_met'
  | 'webhook_triggered'
  | 'api_call'
  | 'user_login'
  | 'user_logout'
  | 'permission_changed';

// Event payload types (discriminated union)
export type EventPayload = 
  | PURLVisitEvent
  | QRScanEvent
  | FormSubmissionEvent
  | CallEvent
  | GiftCardEvent
  | EmailEvent
  | SMSEvent
  | SystemEvent;

export interface BaseEvent {
  event_type: EventType;
  timestamp: string;
  user_id?: string;
  campaign_id?: string;
  recipient_id?: string;
  session_id?: string;
}

export interface PURLVisitEvent extends BaseEvent {
  event_type: 'purl_visit';
  data: {
    url: string;
    referrer?: string;
    browser: string;
    device: 'desktop' | 'mobile' | 'tablet';
    os?: string;
    location?: string;
    duration?: number;
  };
}

export interface QRScanEvent extends BaseEvent {
  event_type: 'qr_scan';
  data: {
    qr_code_id?: string;
    device: 'mobile' | 'tablet';
    location?: string;
    scan_count?: number;
  };
}

export interface FormSubmissionEvent extends BaseEvent {
  event_type: 'form_submission';
  data: {
    form_id: string;
    form_name: string;
    fields_submitted: number;
    submission_data?: Record<string, any>;
    validation_errors?: string[];
  };
}

export interface CallEvent extends BaseEvent {
  event_type: 'call_received' | 'call_completed';
  data: {
    call_sid?: string;
    from_number: string;
    to_number: string;
    duration?: number;
    status: 'completed' | 'no-answer' | 'busy' | 'failed';
    recording_url?: string;
    disposition?: string;
  };
}

export interface GiftCardEvent extends BaseEvent {
  event_type: 'gift_card_claimed' | 'gift_card_delivered' | 'gift_card_redeemed';
  data: {
    gift_card_id: string;
    card_value: number;
    brand_name: string;
    delivery_method?: 'sms' | 'email';
    delivery_status?: string;
  };
}

export interface EmailEvent extends BaseEvent {
  event_type: 'email_opened' | 'email_clicked';
  data: {
    email_id?: string;
    link_clicked?: string;
    device: string;
    location?: string;
  };
}

export interface SMSEvent extends BaseEvent {
  event_type: 'sms_delivered';
  data: {
    message_sid: string;
    to_number: string;
    status: 'sent' | 'delivered' | 'failed';
    error_code?: string;
  };
}

export interface SystemEvent extends BaseEvent {
  event_type: 'user_login' | 'user_logout' | 'permission_changed' | 'api_call';
  data: {
    action: string;
    resource?: string;
    details?: Record<string, any>;
  };
}

// Analytics aggregation types
export interface EventAggregation {
  event_type: EventType;
  count: number;
  unique_users?: number;
  unique_campaigns?: number;
  time_period: string;
}

export interface ConversionFunnel {
  stage: string;
  count: number;
  conversion_rate: number;
  drop_off_rate: number;
}

export interface EventTimeSeries {
  date: string;
  events_by_type: Record<EventType, number>;
  total_events: number;
}

