/**
 * Zapier Trigger Service
 * 
 * Provides utilities for dispatching events to Zapier integrations.
 * Extended trigger types for comprehensive automation support.
 */

import { supabase } from '@core/services/supabase';

/**
 * All supported Zapier trigger event types
 */
export type ZapierTriggerEvent = 
  // Original events
  | 'form_submitted'
  | 'gift_card_redeemed'
  | 'log_activity'
  
  // Campaign events
  | 'campaign_created'
  | 'campaign_launched'
  | 'campaign_completed'
  | 'campaign_paused'
  
  // Recipient events
  | 'recipient_responded'
  | 'recipient_qualified'
  | 'recipient_opted_in'
  | 'recipient_opted_out'
  
  // Call center events
  | 'call_started'
  | 'call_completed'
  | 'condition_completed'
  
  // Inventory events
  | 'low_inventory_alert'
  | 'inventory_depleted'
  | 'cards_purchased'
  
  // Mail events
  | 'mail_delivered'
  | 'mail_returned'
  | 'qr_scanned'
  | 'purl_viewed'
  
  // Contact events
  | 'contact_created'
  | 'contact_updated'
  | 'contact_enriched';

/**
 * Dispatch an event to all configured Zapier connections
 */
export async function dispatchZapierEvent(
  clientId: string,
  eventType: ZapierTriggerEvent,
  data: Record<string, any>,
  options?: {
    triggeredBy?: string;
    meta?: Record<string, any>;
  }
): Promise<{ success: boolean; triggered: number; error?: string }> {
  try {
    const { data: result, error } = await supabase.functions.invoke('dispatch-zapier-event', {
      body: {
        event_type: eventType,
        client_id: clientId,
        data,
        triggered_by: options?.triggeredBy || 'system',
        meta: options?.meta,
      },
    });

    if (error) throw error;

    return {
      success: true,
      triggered: result?.triggered || 0,
    };
  } catch (error: any) {
    console.error(`[ZapierTrigger] Failed to dispatch ${eventType}:`, error);
    return {
      success: false,
      triggered: 0,
      error: error.message,
    };
  }
}

/**
 * Campaign event helpers
 */
export const campaignEvents = {
  created: (clientId: string, campaign: { id: string; name: string; [key: string]: any }) =>
    dispatchZapierEvent(clientId, 'campaign_created', { campaign }),

  launched: (clientId: string, campaign: { id: string; name: string; mailDate: string; recipientCount: number }) =>
    dispatchZapierEvent(clientId, 'campaign_launched', { campaign }),

  completed: (clientId: string, campaign: { id: string; name: string; stats: Record<string, number> }) =>
    dispatchZapierEvent(clientId, 'campaign_completed', { campaign }),

  paused: (clientId: string, campaign: { id: string; name: string; reason?: string }) =>
    dispatchZapierEvent(clientId, 'campaign_paused', { campaign }),
};

/**
 * Recipient event helpers
 */
export const recipientEvents = {
  responded: (clientId: string, data: { recipientId: string; campaignId: string; responseType: string }) =>
    dispatchZapierEvent(clientId, 'recipient_responded', data),

  qualified: (clientId: string, data: { recipientId: string; campaignId: string; conditionId: string }) =>
    dispatchZapierEvent(clientId, 'recipient_qualified', data),

  optedIn: (clientId: string, data: { recipientId: string; phone: string; campaignId: string }) =>
    dispatchZapierEvent(clientId, 'recipient_opted_in', data),

  optedOut: (clientId: string, data: { recipientId: string; phone: string; reason?: string }) =>
    dispatchZapierEvent(clientId, 'recipient_opted_out', data),
};

/**
 * Inventory event helpers
 */
export const inventoryEvents = {
  lowAlert: (clientId: string, data: { 
    poolId: string; 
    brandName: string; 
    cardValue: number; 
    availableCards: number; 
    threshold: number;
  }) =>
    dispatchZapierEvent(clientId, 'low_inventory_alert', data),

  depleted: (clientId: string, data: { poolId: string; brandName: string; cardValue: number }) =>
    dispatchZapierEvent(clientId, 'inventory_depleted', data),

  purchased: (clientId: string, data: { 
    brandName: string; 
    cardValue: number; 
    quantity: number; 
    totalCost: number;
  }) =>
    dispatchZapierEvent(clientId, 'cards_purchased', data),
};

/**
 * Call center event helpers
 */
export const callCenterEvents = {
  callStarted: (clientId: string, data: { 
    recipientId: string; 
    agentId: string; 
    campaignId: string;
  }) =>
    dispatchZapierEvent(clientId, 'call_started', data),

  callCompleted: (clientId: string, data: { 
    recipientId: string; 
    agentId: string; 
    campaignId: string;
    duration: number;
    outcome: string;
  }) =>
    dispatchZapierEvent(clientId, 'call_completed', data),

  conditionCompleted: (clientId: string, data: {
    recipientId: string;
    campaignId: string;
    conditionId: string;
    giftCardId?: string;
  }) =>
    dispatchZapierEvent(clientId, 'condition_completed', data),
};

/**
 * Mail tracking event helpers
 */
export const mailEvents = {
  delivered: (clientId: string, data: { recipientId: string; campaignId: string; deliveredAt: string }) =>
    dispatchZapierEvent(clientId, 'mail_delivered', data),

  returned: (clientId: string, data: { recipientId: string; campaignId: string; returnReason: string }) =>
    dispatchZapierEvent(clientId, 'mail_returned', data),

  qrScanned: (clientId: string, data: { recipientId: string; campaignId: string; scannedAt: string }) =>
    dispatchZapierEvent(clientId, 'qr_scanned', data),

  purlViewed: (clientId: string, data: { recipientId: string; campaignId: string; viewedAt: string }) =>
    dispatchZapierEvent(clientId, 'purl_viewed', data),
};

/**
 * Contact event helpers
 */
export const contactEvents = {
  created: (clientId: string, data: { contactId: string; email: string; source: string }) =>
    dispatchZapierEvent(clientId, 'contact_created', data),

  updated: (clientId: string, data: { contactId: string; updatedFields: string[] }) =>
    dispatchZapierEvent(clientId, 'contact_updated', data),

  enriched: (clientId: string, data: { contactId: string; enrichedFields: string[] }) =>
    dispatchZapierEvent(clientId, 'contact_enriched', data),
};

/**
 * Get all available trigger event types with descriptions
 */
export function getAvailableTriggerEvents(): Array<{ type: ZapierTriggerEvent; description: string; category: string }> {
  return [
    // Campaign events
    { type: 'campaign_created', description: 'When a new campaign is created', category: 'Campaigns' },
    { type: 'campaign_launched', description: 'When a campaign goes live', category: 'Campaigns' },
    { type: 'campaign_completed', description: 'When a campaign finishes', category: 'Campaigns' },
    { type: 'campaign_paused', description: 'When a campaign is paused', category: 'Campaigns' },
    
    // Recipient events
    { type: 'recipient_responded', description: 'When a recipient scans QR or visits PURL', category: 'Recipients' },
    { type: 'recipient_qualified', description: 'When a recipient qualifies for reward', category: 'Recipients' },
    { type: 'recipient_opted_in', description: 'When a recipient opts in to SMS', category: 'Recipients' },
    { type: 'recipient_opted_out', description: 'When a recipient opts out', category: 'Recipients' },
    
    // Gift Card events
    { type: 'gift_card_redeemed', description: 'When a gift card is redeemed', category: 'Gift Cards' },
    { type: 'low_inventory_alert', description: 'When inventory drops below threshold', category: 'Gift Cards' },
    { type: 'inventory_depleted', description: 'When a pool runs out of cards', category: 'Gift Cards' },
    { type: 'cards_purchased', description: 'When gift cards are purchased', category: 'Gift Cards' },
    
    // Call Center events
    { type: 'call_started', description: 'When an agent starts a call', category: 'Call Center' },
    { type: 'call_completed', description: 'When a call is completed', category: 'Call Center' },
    { type: 'condition_completed', description: 'When a reward condition is met', category: 'Call Center' },
    
    // Mail events
    { type: 'mail_delivered', description: 'When mail is delivered (IMb tracking)', category: 'Mail Tracking' },
    { type: 'mail_returned', description: 'When mail is returned', category: 'Mail Tracking' },
    { type: 'qr_scanned', description: 'When a QR code is scanned', category: 'Mail Tracking' },
    { type: 'purl_viewed', description: 'When a PURL is visited', category: 'Mail Tracking' },
    
    // Form events
    { type: 'form_submitted', description: 'When a form is submitted', category: 'Forms' },
    
    // Contact events
    { type: 'contact_created', description: 'When a new contact is added', category: 'Contacts' },
    { type: 'contact_updated', description: 'When a contact is updated', category: 'Contacts' },
    { type: 'contact_enriched', description: 'When contact data is enriched', category: 'Contacts' },
    
    // Activity events
    { type: 'log_activity', description: 'Custom activity logged', category: 'Activities' },
  ];
}

