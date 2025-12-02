/**
 * Time-Based Historical Data Simulator
 * Creates realistic temporal patterns for campaign lifecycles, events, and activities
 */

import { 
  TEMPORAL_PATTERNS, 
  CALL_CENTER_PATTERNS,
  GIFT_CARD_PATTERNS,
  EVENT_PROBABILITIES 
} from './config';

export interface TimelineEvent {
  date: Date;
  type: string;
  data?: any;
}

export interface CampaignTimeline {
  createdAt: Date;
  mailDate: Date;
  dropDate: Date;
  completedAt?: Date;
  events: TimelineEvent[];
}

export interface RecipientJourney {
  mailedAt?: Date;
  deliveredAt?: Date;
  qrScannedAt?: Date;
  purlVisitedAt?: Date;
  formSubmittedAt?: Date;
  leadCapturedAt?: Date;
  callReceivedAt?: Date;
  smsOptInAt?: Date;
  giftCardRedeemedAt?: Date;
}

/**
 * Calculate a date within business hours on a weekday
 */
export function getBusinessHoursDate(baseDate: Date): Date {
  const date = new Date(baseDate);
  
  // If weekend, move to Monday
  const day = date.getDay();
  if (day === 0) {
    date.setDate(date.getDate() + 1); // Sunday -> Monday
  } else if (day === 6) {
    date.setDate(date.getDate() + 2); // Saturday -> Monday
  }
  
  // Set to random business hour
  const businessHours = CALL_CENTER_PATTERNS.businessHours;
  const hour = businessHours.start + Math.floor(Math.random() * (businessHours.end - businessHours.start));
  date.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
  
  return date;
}

/**
 * Get a random date weighted by day of week activity
 */
export function getWeightedDateByDayOfWeek(startDate: Date, endDate: Date): Date {
  const timeSpan = endDate.getTime() - startDate.getTime();
  let selectedDate: Date;
  
  // Try up to 10 times to get a weighted date
  for (let attempt = 0; attempt < 10; attempt++) {
    const randomDate = new Date(startDate.getTime() + Math.random() * timeSpan);
    const dayOfWeek = randomDate.getDay();
    const weight = TEMPORAL_PATTERNS.dayOfWeekActivity[dayOfWeek] || 0.5;
    
    if (Math.random() < weight) {
      selectedDate = randomDate;
      break;
    }
  }
  
  return selectedDate || new Date(startDate.getTime() + Math.random() * timeSpan);
}

/**
 * Apply seasonal trends to campaign creation
 */
export function getSeasonallyWeightedDate(startDate: Date, endDate: Date): Date {
  const timeSpan = endDate.getTime() - startDate.getTime();
  
  for (let attempt = 0; attempt < 10; attempt++) {
    const randomDate = new Date(startDate.getTime() + Math.random() * timeSpan);
    const month = randomDate.getMonth() + 1;
    const seasonalWeight = TEMPORAL_PATTERNS.seasonalTrends[month] || 1.0;
    const normalizedWeight = seasonalWeight / 1.4; // Normalize to 0-1 range
    
    if (Math.random() < normalizedWeight) {
      return randomDate;
    }
  }
  
  return new Date(startDate.getTime() + Math.random() * timeSpan);
}

/**
 * Generate a complete campaign timeline
 */
export function generateCampaignTimeline(
  createdAt: Date,
  status: 'draft' | 'in_production' | 'mailed' | 'completed'
): CampaignTimeline {
  const timeline: CampaignTimeline = {
    createdAt,
    mailDate: new Date(createdAt.getTime() + (7 + Math.random() * 14) * 24 * 60 * 60 * 1000), // 7-21 days after creation
    dropDate: new Date(createdAt.getTime() + (10 + Math.random() * 17) * 24 * 60 * 60 * 1000), // 10-27 days after creation
    events: [],
  };
  
  // Adjust based on status
  if (status === 'draft') {
    // Draft campaigns have future mail dates
    timeline.mailDate = new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000);
    timeline.dropDate = new Date(timeline.mailDate.getTime() + (3 + Math.random() * 4) * 24 * 60 * 60 * 1000);
  } else if (status === 'in_production') {
    // In production: mail date is soon
    timeline.mailDate = new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000);
    timeline.dropDate = new Date(timeline.mailDate.getTime() + (3 + Math.random() * 4) * 24 * 60 * 60 * 1000);
  } else if (status === 'mailed') {
    // Recently mailed
    timeline.mailDate = new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000);
    timeline.dropDate = new Date(timeline.mailDate.getTime() + (3 + Math.random() * 4) * 24 * 60 * 60 * 1000);
  } else if (status === 'completed') {
    // Completed in the past
    timeline.completedAt = new Date(timeline.dropDate.getTime() + (30 + Math.random() * 30) * 24 * 60 * 60 * 1000);
  }
  
  return timeline;
}

/**
 * Generate a realistic recipient journey with event sequence
 */
export function generateRecipientJourney(
  campaignDropDate: Date,
  includeCallCenter: boolean = true,
  includeGiftCard: boolean = true
): RecipientJourney {
  const journey: RecipientJourney = {};
  
  // 95% get mailed
  if (Math.random() < EVENT_PROBABILITIES.imb_injected) {
    journey.mailedAt = new Date(campaignDropDate.getTime() - Math.random() * 2 * 24 * 60 * 60 * 1000);
    
    // 85% of mailed get delivered (2-5 days after mail)
    if (Math.random() < EVENT_PROBABILITIES.imb_delivered) {
      journey.deliveredAt = new Date(
        journey.mailedAt.getTime() + (2 + Math.random() * 3) * 24 * 60 * 60 * 1000
      );
      
      // 20% scan QR (within 2-7 days of delivery)
      if (Math.random() < EVENT_PROBABILITIES.qr_scan) {
        journey.qrScannedAt = new Date(
          journey.deliveredAt.getTime() + (Math.random() * 7) * 24 * 60 * 60 * 1000
        );
      }
      
      // 28% visit PURL (within 1-14 days of delivery)
      if (Math.random() < EVENT_PROBABILITIES.purl_visit) {
        journey.purlVisitedAt = new Date(
          journey.deliveredAt.getTime() + (Math.random() * 14) * 24 * 60 * 60 * 1000
        );
        
        // 12% of visitors submit form
        if (Math.random() < EVENT_PROBABILITIES.form_submitted) {
          const visitDate = journey.purlVisitedAt || journey.deliveredAt;
          journey.formSubmittedAt = new Date(
            visitDate.getTime() + Math.random() * 30 * 60 * 1000 // Within 30 minutes of visit
          );
          
          // 10% of form submissions become leads
          if (Math.random() < EVENT_PROBABILITIES.lead_captured) {
            journey.leadCapturedAt = new Date(
              journey.formSubmittedAt.getTime() + Math.random() * 60 * 1000 // Within 1 minute
            );
          }
        }
      }
      
      // Call center flow
      if (includeCallCenter && Math.random() < 0.35) { // 35% receive calls
        journey.callReceivedAt = getBusinessHoursDate(
          new Date(journey.deliveredAt.getTime() + (1 + Math.random() * 5) * 24 * 60 * 60 * 1000)
        );
        
        // 68% opt-in rate
        if (Math.random() < CALL_CENTER_PATTERNS.optInRate) {
          journey.smsOptInAt = new Date(
            journey.callReceivedAt.getTime() + (5 + Math.random() * 55) * 60 * 1000 // 5-60 minutes after call
          );
          
          // Gift card redemption
          if (includeGiftCard && journey.smsOptInAt) {
            const redemptionChance = Math.random();
            if (redemptionChance < GIFT_CARD_PATTERNS.redemptionRates.within7Days) {
              // 60% redeem within 7 days
              journey.giftCardRedeemedAt = new Date(
                journey.smsOptInAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000
              );
            } else if (redemptionChance < GIFT_CARD_PATTERNS.redemptionRates.within7Days + GIFT_CARD_PATTERNS.redemptionRates.within30Days) {
              // 25% redeem within 30 days
              journey.giftCardRedeemedAt = new Date(
                journey.smsOptInAt.getTime() + (7 + Math.random() * 23) * 24 * 60 * 60 * 1000
              );
            }
            // 15% never redeem (journey.giftCardRedeemedAt remains undefined)
          }
        }
      }
    }
  }
  
  return journey;
}

/**
 * Generate call timing based on business hours and patterns
 */
export function generateCallTiming(baseDate: Date): { startTime: Date; duration: number } {
  const callDate = getBusinessHoursDate(baseDate);
  
  // Check if it's a peak hour
  const hour = callDate.getHours();
  const isPeakHour = CALL_CENTER_PATTERNS.peakHours.includes(hour);
  
  // Peak hours have slightly longer calls
  const avgDuration = CALL_CENTER_PATTERNS.avgDuration;
  const variance = isPeakHour ? 0.3 : 0.4;
  const duration = Math.max(
    30, // Minimum 30 seconds
    Math.floor(avgDuration * (1 + (Math.random() - 0.5) * 2 * variance))
  );
  
  return {
    startTime: callDate,
    duration,
  };
}

/**
 * Distribute campaigns over time period with seasonal weighting
 */
export function distributeCampaignsOverTime(
  count: number,
  startDate: Date,
  endDate: Date
): Date[] {
  const dates: Date[] = [];
  
  for (let i = 0; i < count; i++) {
    dates.push(getSeasonallyWeightedDate(startDate, endDate));
  }
  
  return dates.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Add random jitter to a timestamp (for realistic variation)
 */
export function addJitter(date: Date, maxMinutes: number = 30): Date {
  const jitter = (Math.random() - 0.5) * 2 * maxMinutes * 60 * 1000;
  return new Date(date.getTime() + jitter);
}

/**
 * Get a date offset by business days
 */
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not weekend
      addedDays++;
    }
  }
  
  return result;
}

/**
 * Generate time for performance metric (slower during peak hours)
 */
export function generatePerformanceTime(
  baseline: { min: number; max: number; avg: number },
  timestamp: Date
): number {
  const hour = timestamp.getHours();
  const isPeakHour = TEMPORAL_PATTERNS.hourOfDayActivity.peakHours.includes(hour);
  const isBusinessHour = TEMPORAL_PATTERNS.hourOfDayActivity.businessHours.includes(hour);
  
  let multiplier = 1.0;
  if (isPeakHour) {
    multiplier = 1.3; // 30% slower during peak
  } else if (!isBusinessHour) {
    multiplier = 0.8; // 20% faster off-hours
  }
  
  // Generate with normal distribution around average
  const range = baseline.max - baseline.min;
  const normalValue = (Math.random() + Math.random() + Math.random()) / 3; // Approximate normal
  const value = baseline.min + (normalValue * range);
  
  return Math.floor(value * multiplier);
}

/**
 * Check if date is during business hours
 */
export function isBusinessHours(date: Date): boolean {
  const hour = date.getHours();
  const dayOfWeek = date.getDay();
  
  return (
    dayOfWeek >= 1 && dayOfWeek <= 5 && // Monday-Friday
    hour >= CALL_CENTER_PATTERNS.businessHours.start &&
    hour < CALL_CENTER_PATTERNS.businessHours.end
  );
}

/**
 * Generate realistic activity timestamp based on user behavior
 */
export function generateActivityTimestamp(
  startDate: Date,
  endDate: Date,
  preferBusinessHours: boolean = true
): Date {
  let date: Date;
  
  if (preferBusinessHours) {
    date = getWeightedDateByDayOfWeek(startDate, endDate);
    const hour = 9 + Math.floor(Math.random() * 8); // 9 AM - 5 PM
    date.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
  } else {
    const timeSpan = endDate.getTime() - startDate.getTime();
    date = new Date(startDate.getTime() + Math.random() * timeSpan);
  }
  
  return date;
}

/**
 * Create event sequence timestamps ensuring causal order
 */
export function createEventSequence(
  baseDate: Date,
  events: string[]
): Map<string, Date> {
  const sequence = new Map<string, Date>();
  let currentDate = new Date(baseDate);
  
  for (const eventType of events) {
    sequence.set(eventType, new Date(currentDate));
    
    // Add realistic delay between events
    switch (eventType) {
      case 'imb_injected':
        currentDate = new Date(currentDate.getTime() + (2 + Math.random() * 3) * 24 * 60 * 60 * 1000);
        break;
      case 'imb_delivered':
        currentDate = new Date(currentDate.getTime() + (1 + Math.random() * 5) * 24 * 60 * 60 * 1000);
        break;
      case 'qr_scan':
      case 'purl_visit':
        currentDate = new Date(currentDate.getTime() + Math.random() * 24 * 60 * 60 * 1000);
        break;
      case 'form_submitted':
        currentDate = new Date(currentDate.getTime() + (5 + Math.random() * 25) * 60 * 1000);
        break;
      case 'lead_captured':
        currentDate = new Date(currentDate.getTime() + Math.random() * 5 * 60 * 1000);
        break;
      default:
        currentDate = new Date(currentDate.getTime() + Math.random() * 60 * 60 * 1000);
    }
  }
  
  return sequence;
}

