/**
 * Recipients and Events Generator
 * Creates recipients with complete event sequences and audit trails
 */

import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import {
  generateRecipientJourney,
  addJitter,
} from './time-simulator';
import { generateRedemptionCode, generatePhoneNumber, generateEmail } from './generators';

export interface RecipientRecord {
  id: string;
  audience_id: string;
  campaign_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  redemption_code: string;
  token: string;
  approval_status: string;
  created_at: string;
}

export interface EventRecord {
  id: string;
  campaign_id: string;
  recipient_id: string;
  event_type: string;
  source: string;
  event_data_json?: any;
  occurred_at: string;
  created_at: string;
}

export interface RecipientAuditLogRecord {
  id: string;
  recipient_id: string;
  changed_by_user_id?: string;
  change_type: string;
  old_status?: string;
  new_status: string;
  notes?: string;
  changed_at: string;
}

export interface ContactCampaignParticipationRecord {
  id: string;
  contact_id: string;
  campaign_id: string;
  recipient_id: string;
  participation_status: string;
  redemption_code: string;
  participated_at: string;
  delivered_at?: string;
  redeemed_at?: string;
}

const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
];

const CITIES = [
  { city: 'Phoenix', state: 'AZ', zip: '85001' },
  { city: 'Los Angeles', state: 'CA', zip: '90001' },
  { city: 'San Diego', state: 'CA', zip: '92101' },
  { city: 'Denver', state: 'CO', zip: '80201' },
  { city: 'Miami', state: 'FL', zip: '33101' },
  { city: 'Atlanta', state: 'GA', zip: '30301' },
  { city: 'Chicago', state: 'IL', zip: '60601' },
  { city: 'Boston', state: 'MA', zip: '02101' },
  { city: 'Detroit', state: 'MI', zip: '48201' },
  { city: 'Las Vegas', state: 'NV', zip: '89101' },
  { city: 'New York', state: 'NY', zip: '10001' },
  { city: 'Charlotte', state: 'NC', zip: '28201' },
  { city: 'Portland', state: 'OR', zip: '97201' },
  { city: 'Philadelphia', state: 'PA', zip: '19101' },
  { city: 'Dallas', state: 'TX', zip: '75201' },
  { city: 'Houston', state: 'TX', zip: '77001' },
  { city: 'Austin', state: 'TX', zip: '78701' },
  { city: 'Seattle', state: 'WA', zip: '98101' },
];

/**
 * Generate a recipient record
 */
function generateRecipient(
  audienceId: string,
  campaignId: string,
  createdAt: Date
): RecipientRecord {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const location = CITIES[Math.floor(Math.random() * CITIES.length)];
  const streetNumber = faker.number.int({ min: 100, max: 9999 });
  const streetName = faker.location.street();
  
  return {
    id: faker.string.uuid(),
    audience_id: audienceId,
    campaign_id: campaignId,
    first_name: firstName,
    last_name: lastName,
    email: generateEmail(firstName, lastName),
    phone: generatePhoneNumber(),
    address1: `${streetNumber} ${streetName}`,
    address2: Math.random() < 0.2 ? `Apt ${faker.number.int({ min: 1, max: 999 })}` : undefined,
    city: location.city,
    state: location.state,
    zip: location.zip,
    redemption_code: generateRedemptionCode(),
    token: faker.string.alphanumeric(32),
    approval_status: Math.random() < 0.98 ? 'approved' : 'pending',
    created_at: createdAt.toISOString(),
  };
}

/**
 * Generate events based on recipient journey
 */
function generateEventsFromJourney(
  campaignId: string,
  recipientId: string,
  journey: ReturnType<typeof generateRecipientJourney>
): EventRecord[] {
  const events: EventRecord[] = [];
  
  if (journey.mailedAt) {
    events.push({
      id: faker.string.uuid(),
      campaign_id: campaignId,
      recipient_id: recipientId,
      event_type: 'imb_injected',
      source: 'usps',
      event_data_json: { tracking: faker.string.alphanumeric(20) },
      occurred_at: journey.mailedAt.toISOString(),
      created_at: journey.mailedAt.toISOString(),
    });
  }
  
  if (journey.deliveredAt) {
    events.push({
      id: faker.string.uuid(),
      campaign_id: campaignId,
      recipient_id: recipientId,
      event_type: 'imb_delivered',
      source: 'usps',
      event_data_json: { delivery_confirmed: true },
      occurred_at: journey.deliveredAt.toISOString(),
      created_at: journey.deliveredAt.toISOString(),
    });
  }
  
  if (journey.qrScannedAt) {
    events.push({
      id: faker.string.uuid(),
      campaign_id: campaignId,
      recipient_id: recipientId,
      event_type: 'qr_scan',
      source: 'mobile',
      event_data_json: { 
        device: faker.helpers.arrayElement(['iOS', 'Android']),
        location: 'app'
      },
      occurred_at: journey.qrScannedAt.toISOString(),
      created_at: journey.qrScannedAt.toISOString(),
    });
  }
  
  if (journey.purlVisitedAt) {
    events.push({
      id: faker.string.uuid(),
      campaign_id: campaignId,
      recipient_id: recipientId,
      event_type: 'purl_visit',
      source: 'web',
      event_data_json: { 
        browser: faker.helpers.arrayElement(['Chrome', 'Firefox', 'Safari', 'Edge']),
        duration_seconds: faker.number.int({ min: 10, max: 600 })
      },
      occurred_at: journey.purlVisitedAt.toISOString(),
      created_at: journey.purlVisitedAt.toISOString(),
    });
  }
  
  if (journey.formSubmittedAt) {
    events.push({
      id: faker.string.uuid(),
      campaign_id: campaignId,
      recipient_id: recipientId,
      event_type: 'form_submitted',
      source: 'web',
      event_data_json: { 
        form_id: faker.string.uuid(),
        fields_completed: faker.number.int({ min: 3, max: 10 })
      },
      occurred_at: journey.formSubmittedAt.toISOString(),
      created_at: journey.formSubmittedAt.toISOString(),
    });
  }
  
  if (journey.leadCapturedAt) {
    events.push({
      id: faker.string.uuid(),
      campaign_id: campaignId,
      recipient_id: recipientId,
      event_type: 'lead_captured',
      source: 'crm',
      event_data_json: { 
        lead_score: faker.number.int({ min: 50, max: 100 }),
        qualified: true
      },
      occurred_at: journey.leadCapturedAt.toISOString(),
      created_at: journey.leadCapturedAt.toISOString(),
    });
  }
  
  return events;
}

/**
 * Generate audit log entries for recipient
 */
function generateAuditLogEntries(
  recipientId: string,
  journey: ReturnType<typeof generateRecipientJourney>,
  createdAt: Date
): RecipientAuditLogRecord[] {
  const logs: RecipientAuditLogRecord[] = [];
  
  // Initial approval
  logs.push({
    id: faker.string.uuid(),
    recipient_id: recipientId,
    change_type: 'status_change',
    new_status: 'approved',
    notes: 'Recipient approved for mailing',
    changed_at: createdAt.toISOString(),
  });
  
  if (journey.mailedAt) {
    logs.push({
      id: faker.string.uuid(),
      recipient_id: recipientId,
      change_type: 'status_change',
      old_status: 'approved',
      new_status: 'mailed',
      notes: 'Mail piece sent',
      changed_at: journey.mailedAt.toISOString(),
    });
  }
  
  if (journey.deliveredAt) {
    logs.push({
      id: faker.string.uuid(),
      recipient_id: recipientId,
      change_type: 'status_change',
      old_status: 'mailed',
      new_status: 'delivered',
      notes: 'USPS delivery confirmed',
      changed_at: journey.deliveredAt.toISOString(),
    });
  }
  
  if (journey.leadCapturedAt) {
    logs.push({
      id: faker.string.uuid(),
      recipient_id: recipientId,
      change_type: 'status_change',
      old_status: 'delivered',
      new_status: 'converted',
      notes: 'Lead successfully captured',
      changed_at: journey.leadCapturedAt.toISOString(),
    });
  }
  
  return logs;
}

/**
 * Generate recipients and events for a campaign
 */
export async function generateRecipientsForCampaign(
  supabase: ReturnType<typeof createClient>,
  campaignId: string,
  audienceId: string,
  campaignDropDate: Date,
  recipientCount: number,
  options: {
    includeCallCenter: boolean;
    includeGiftCards: boolean;
  }
): Promise<{ recipients: RecipientRecord[]; events: EventRecord[] }> {
  const recipients: RecipientRecord[] = [];
  const allEvents: EventRecord[] = [];
  const allAuditLogs: RecipientAuditLogRecord[] = [];
  
  // Generate recipients
  const recipientCreationDate = new Date(campaignDropDate.getTime() - 14 * 24 * 60 * 60 * 1000); // 2 weeks before drop
  
  for (let i = 0; i < recipientCount; i++) {
    const recipient = generateRecipient(
      audienceId,
      campaignId,
      addJitter(recipientCreationDate, 60)
    );
    recipients.push(recipient);
  }
  
  // Insert recipients in batches
  const batchSize = 500;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    const { error } = await supabase
      .from('recipients')
      .insert(batch);
    
    if (error) throw new Error(`Failed to insert recipients: ${error.message}`);
  }
  
  // Generate journeys and events for each recipient
  for (const recipient of recipients) {
    const journey = generateRecipientJourney(
      campaignDropDate,
      options.includeCallCenter,
      options.includeGiftCards
    );
    
    const events = generateEventsFromJourney(campaignId, recipient.id, journey);
    allEvents.push(...events);
    
    const auditLogs = generateAuditLogEntries(
      recipient.id,
      journey,
      new Date(recipient.created_at)
    );
    allAuditLogs.push(...auditLogs);
  }
  
  // Insert events in batches
  if (allEvents.length > 0) {
    for (let i = 0; i < allEvents.length; i += batchSize) {
      const batch = allEvents.slice(i, i + batchSize);
      const { error } = await supabase
        .from('events')
        .insert(batch);
      
      if (error) throw new Error(`Failed to insert events: ${error.message}`);
    }
  }
  
  // Insert audit logs in batches
  if (allAuditLogs.length > 0) {
    for (let i = 0; i < allAuditLogs.length; i += batchSize) {
      const batch = allAuditLogs.slice(i, i + batchSize);
      const { error } = await supabase
        .from('recipient_audit_log')
        .insert(batch);
      
      if (error) console.warn(`Warning: Failed to insert audit logs: ${error.message}`);
    }
  }
  
  return { recipients, events: allEvents };
}

/**
 * Generate recipients and events for all campaigns
 */
export async function generateAllRecipientsAndEvents(
  supabase: ReturnType<typeof createClient>,
  campaigns: Array<{ id: string; audience_id: string; drop_date: string; status: string }>,
  recipientsPerCampaign: number,
  options: {
    includeCallCenter: boolean;
    includeGiftCards: boolean;
  },
  onProgress?: (current: number, total: number) => void
): Promise<{ totalRecipients: number; totalEvents: number }> {
  let totalRecipients = 0;
  let totalEvents = 0;
  
  // Only generate recipients for campaigns that have been mailed or completed
  const activeCampaigns = campaigns.filter(c => 
    c.status === 'mailed' || c.status === 'completed'
  );
  
  for (let i = 0; i < activeCampaigns.length; i++) {
    const campaign = activeCampaigns[i];
    
    // Vary recipient count slightly
    const count = Math.floor(recipientsPerCampaign * (0.8 + Math.random() * 0.4));
    
    const result = await generateRecipientsForCampaign(
      supabase,
      campaign.id,
      campaign.audience_id,
      new Date(campaign.drop_date),
      count,
      options
    );
    
    totalRecipients += result.recipients.length;
    totalEvents += result.events.length;
    
    if (onProgress) {
      onProgress(i + 1, activeCampaigns.length);
    }
  }
  
  return { totalRecipients, totalEvents };
}

