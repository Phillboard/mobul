/**
 * Call Center Data Generator
 * Generates call sessions, SMS opt-ins, and related data with realistic patterns
 */

import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import { 
  generateCallTiming,
  getBusinessHoursDate,
  isBusinessHours 
} from './time-simulator';
import { CALL_CENTER_PATTERNS } from './config';

export interface TrackedPhoneNumberRecord {
  id: string;
  client_id: string;
  phone_number: string;
  twilio_sid?: string;
  campaign_id?: string;
  status: 'available' | 'assigned' | 'decommissioned';
  assigned_at?: string;
  created_at: string;
}

export interface CallSessionRecord {
  id: string;
  campaign_id: string;
  recipient_id?: string;
  tracked_number_id: string;
  caller_phone: string;
  twilio_call_sid?: string;
  call_status: 'ringing' | 'in-progress' | 'completed' | 'no-answer' | 'busy' | 'failed';
  match_status: 'matched' | 'unmatched' | 'manual_override';
  agent_user_id?: string;
  call_started_at: string;
  call_answered_at?: string;
  call_ended_at?: string;
  call_duration_seconds?: number;
  recording_url?: string;
  notes?: string;
  created_at: string;
}

export interface CallConditionsMetRecord {
  id: string;
  call_session_id: string;
  condition_number: number;
  met: boolean;
  met_at?: string;
  notes?: string;
}

export interface SmsOptInRecord {
  id: string;
  recipient_id: string;
  campaign_id: string;
  phone: string;
  status: 'opted_in' | 'opted_out' | 'pending';
  opted_in_at?: string;
  opted_out_at?: string;
  verification_code?: string;
  created_at: string;
}

/**
 * Generate tracked phone numbers for campaigns
 */
export async function generateTrackedPhoneNumbers(
  supabase: ReturnType<typeof createClient>,
  campaigns: Array<{ id: string; client_id: string; created_at: string }>,
  numbersPerCampaign: number = 1
): Promise<TrackedPhoneNumberRecord[]> {
  const phoneNumbers: TrackedPhoneNumberRecord[] = [];
  
  for (const campaign of campaigns) {
    for (let i = 0; i < numbersPerCampaign; i++) {
      const areaCode = faker.number.int({ min: 200, max: 999 });
      const exchange = faker.number.int({ min: 200, max: 999 });
      const number = faker.number.int({ min: 1000, max: 9999 });
      
      phoneNumbers.push({
        id: faker.string.uuid(),
        client_id: campaign.client_id,
        phone_number: `+1${areaCode}${exchange}${number}`,
        twilio_sid: `PN${faker.string.alphanumeric(32)}`,
        campaign_id: campaign.id,
        status: 'assigned',
        assigned_at: campaign.created_at,
        created_at: campaign.created_at,
      });
    }
  }
  
  // Insert in batches
  const batchSize = 500;
  for (let i = 0; i < phoneNumbers.length; i += batchSize) {
    const batch = phoneNumbers.slice(i, i + batchSize);
    const { error } = await supabase
      .from('tracked_phone_numbers')
      .insert(batch);
    
    if (error) throw new Error(`Failed to insert tracked phone numbers: ${error.message}`);
  }
  
  return phoneNumbers;
}

/**
 * Generate call sessions for recipients
 */
export async function generateCallSessions(
  supabase: ReturnType<typeof createClient>,
  recipients: Array<{ 
    id: string; 
    campaign_id: string; 
    phone: string;
    created_at: string;
  }>,
  trackedNumbers: Map<string, string>, // campaign_id -> tracked_number_id
  campaignDropDates: Map<string, Date>,
  agentUserIds: string[],
  callPercentage: number = 0.35 // 35% of recipients get calls
): Promise<{ sessions: CallSessionRecord[]; conditions: CallConditionsMetRecord[]; smsOptIns: SmsOptInRecord[] }> {
  const sessions: CallSessionRecord[] = [];
  const conditions: CallConditionsMetRecord[] = [];
  const smsOptIns: SmsOptInRecord[] = [];
  
  // Select recipients who will receive calls
  const recipientsWithCalls = recipients
    .filter(() => Math.random() < callPercentage)
    .sort(() => Math.random() - 0.5); // Shuffle
  
  for (const recipient of recipientsWithCalls) {
    const trackedNumberId = trackedNumbers.get(recipient.campaign_id);
    if (!trackedNumberId) continue;
    
    const dropDate = campaignDropDates.get(recipient.campaign_id);
    if (!dropDate) continue;
    
    // Calls happen 1-7 days after mail delivery (delivery is ~3-5 days after drop)
    const earliestCallDate = new Date(dropDate.getTime() + (4 + Math.random() * 3) * 24 * 60 * 60 * 1000);
    const latestCallDate = new Date(earliestCallDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const callBaseDate = new Date(
      earliestCallDate.getTime() + Math.random() * (latestCallDate.getTime() - earliestCallDate.getTime())
    );
    
    const { startTime, duration } = generateCallTiming(callBaseDate);
    
    // Determine call outcome
    const callAnswered = Math.random() < 0.85; // 85% answer rate
    const callMatched = callAnswered && Math.random() < CALL_CENTER_PATTERNS.matchRate;
    
    let callStatus: CallSessionRecord['call_status'] = 'completed';
    if (!callAnswered) {
      const outcomes: Array<'no-answer' | 'busy' | 'failed'> = ['no-answer', 'no-answer', 'no-answer', 'busy', 'failed'];
      callStatus = outcomes[Math.floor(Math.random() * outcomes.length)];
    }
    
    const answeredAt = callAnswered 
      ? new Date(startTime.getTime() + faker.number.int({ min: 2, max: 8 }) * 1000)
      : undefined;
    
    const endedAt = callAnswered
      ? new Date(answeredAt!.getTime() + duration * 1000)
      : new Date(startTime.getTime() + faker.number.int({ min: 10, max: 30 }) * 1000);
    
    const session: CallSessionRecord = {
      id: faker.string.uuid(),
      campaign_id: recipient.campaign_id,
      recipient_id: callMatched ? recipient.id : undefined,
      tracked_number_id: trackedNumberId,
      caller_phone: recipient.phone,
      twilio_call_sid: `CA${faker.string.alphanumeric(32)}`,
      call_status: callStatus,
      match_status: callMatched ? 'matched' : 'unmatched',
      agent_user_id: callAnswered && agentUserIds.length > 0
        ? agentUserIds[Math.floor(Math.random() * agentUserIds.length)]
        : undefined,
      call_started_at: startTime.toISOString(),
      call_answered_at: answeredAt?.toISOString(),
      call_ended_at: endedAt.toISOString(),
      call_duration_seconds: callAnswered ? duration : undefined,
      recording_url: callAnswered && Math.random() < 0.9
        ? `https://api.twilio.com/recordings/${faker.string.alphanumeric(34)}`
        : undefined,
      notes: callMatched && Math.random() < 0.3
        ? faker.helpers.arrayElement([
            'Customer interested in service',
            'Requested callback',
            'Questions about pricing',
            'Ready to schedule',
            'Needs more information',
          ])
        : undefined,
      created_at: startTime.toISOString(),
    };
    
    sessions.push(session);
    
    // Generate conditions met for matched calls
    if (callMatched && callAnswered) {
      // Condition 1: Call received (always met)
      conditions.push({
        id: faker.string.uuid(),
        call_session_id: session.id,
        condition_number: 1,
        met: true,
        met_at: answeredAt!.toISOString(),
        notes: 'Call answered by recipient',
      });
      
      // Condition 2: Call verified (met based on opt-in rate)
      const callVerified = Math.random() < CALL_CENTER_PATTERNS.optInRate;
      if (callVerified) {
        conditions.push({
          id: faker.string.uuid(),
          call_session_id: session.id,
          condition_number: 2,
          met: true,
          met_at: new Date(answeredAt!.getTime() + duration * 0.7 * 1000).toISOString(),
          notes: 'Customer verified and qualified',
        });
        
        // Generate SMS opt-in
        const optInAt = new Date(answeredAt!.getTime() + (5 + Math.random() * 55) * 60 * 1000);
        smsOptIns.push({
          id: faker.string.uuid(),
          recipient_id: recipient.id,
          campaign_id: recipient.campaign_id,
          phone: recipient.phone,
          status: 'opted_in',
          opted_in_at: optInAt.toISOString(),
          verification_code: faker.string.numeric(6),
          created_at: optInAt.toISOString(),
        });
      }
    }
  }
  
  // Insert sessions in batches
  const batchSize = 500;
  for (let i = 0; i < sessions.length; i += batchSize) {
    const batch = sessions.slice(i, i + batchSize);
    const { error } = await supabase
      .from('call_sessions')
      .insert(batch);
    
    if (error) throw new Error(`Failed to insert call sessions: ${error.message}`);
  }
  
  // Insert conditions met
  if (conditions.length > 0) {
    for (let i = 0; i < conditions.length; i += batchSize) {
      const batch = conditions.slice(i, i + batchSize);
      const { error } = await supabase
        .from('call_conditions_met')
        .insert(batch);
      
      if (error) console.warn(`Warning: Failed to insert call conditions: ${error.message}`);
    }
  }
  
  // Insert SMS opt-ins
  if (smsOptIns.length > 0) {
    for (let i = 0; i < smsOptIns.length; i += batchSize) {
      const batch = smsOptIns.slice(i, i + batchSize);
      const { error } = await supabase
        .from('sms_opt_ins')
        .insert(batch);
      
      if (error) console.warn(`Warning: Failed to insert SMS opt-ins: ${error.message}`);
    }
  }
  
  return { sessions, conditions, smsOptIns };
}

/**
 * Generate all call center data
 */
export async function generateAllCallCenterData(
  supabase: ReturnType<typeof createClient>,
  campaigns: Array<{ id: string; client_id: string; drop_date: string; created_at: string }>,
  recipients: Array<{ id: string; campaign_id: string; phone: string; created_at: string }>,
  agentUserIds: string[],
  onProgress?: (stage: string, current: number, total: number) => void
): Promise<{ 
  trackedNumbers: number; 
  callSessions: number; 
  conditionsMet: number; 
  smsOptIns: number;
}> {
  console.log('📞 Generating call center data...');
  
  // Generate tracked phone numbers
  if (onProgress) onProgress('tracked_numbers', 0, campaigns.length);
  const trackedNumbers = await generateTrackedPhoneNumbers(supabase, campaigns, 1);
  if (onProgress) onProgress('tracked_numbers', campaigns.length, campaigns.length);
  
  // Build lookup maps
  const trackedNumberMap = new Map<string, string>();
  for (const tn of trackedNumbers) {
    if (tn.campaign_id) {
      trackedNumberMap.set(tn.campaign_id, tn.id);
    }
  }
  
  const campaignDropDates = new Map<string, Date>();
  for (const campaign of campaigns) {
    campaignDropDates.set(campaign.id, new Date(campaign.drop_date));
  }
  
  // Generate call sessions
  if (onProgress) onProgress('call_sessions', 0, recipients.length);
  const callData = await generateCallSessions(
    supabase,
    recipients,
    trackedNumberMap,
    campaignDropDates,
    agentUserIds,
    0.35
  );
  if (onProgress) onProgress('call_sessions', recipients.length, recipients.length);
  
  return {
    trackedNumbers: trackedNumbers.length,
    callSessions: callData.sessions.length,
    conditionsMet: callData.conditions.length,
    smsOptIns: callData.smsOptIns.length,
  };
}

