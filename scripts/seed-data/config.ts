/**
 * Configuration System for Seed Data Generation
 * Defines types, scenarios, and presets for comprehensive data generation
 */

export type ScenarioType = 'demo' | 'development' | 'analytics' | 'load_test';

export interface SeedConfig {
  scenario: ScenarioType;
  timeRange: {
    months: number;
    startDate?: Date;
  };
  scale: {
    organizations: number;
    clients: number;
    usersPerOrg: number;
    contactsPerClient: number;
    listsPerClient: number;
    campaignsPerClient: number;
    recipientsPerCampaign: number;
    giftCardBrands: number;
    giftCardInventorySize: number;
  };
  features: {
    includeCallCenter: boolean;
    includeGiftCards: boolean;
    includeAnalytics: boolean;
    includeErrors: boolean;
    includeHistoricalData: boolean;
  };
  performance: {
    batchSize: number;
    parallelBatches: number;
    checkpointInterval: number;
  };
}

export interface ProgressCheckpoint {
  stage: string;
  completedAt: Date;
  recordsCreated: number;
  data?: any;
}

export interface SeedProgress {
  startTime: Date;
  currentStage: string;
  stagesCompleted: string[];
  checkpoints: ProgressCheckpoint[];
  totalRecords: number;
  errors: Array<{ stage: string; error: string; timestamp: Date }>;
}

export interface GenerationStats {
  organizations: number;
  clients: number;
  users: number;
  contacts: number;
  contactLists: number;
  contactListMembers: number;
  campaigns: number;
  recipients: number;
  events: number;
  callSessions: number;
  smsOptIns: number;
  giftCardBrands: number;
  giftCardInventory: number;
  billingTransactions: number;
  performanceMetrics: number;
  usageAnalytics: number;
  errorLogs: number;
}

// Predefined scenarios
export const SCENARIO_PRESETS: Record<ScenarioType, SeedConfig> = {
  demo: {
    scenario: 'demo',
    timeRange: { months: 1 },
    scale: {
      organizations: 2,
      clients: 6,
      usersPerOrg: 3,
      contactsPerClient: 50,
      listsPerClient: 3,
      campaignsPerClient: 3,
      recipientsPerCampaign: 30,
      giftCardBrands: 10,
      giftCardInventorySize: 200,
    },
    features: {
      includeCallCenter: true,
      includeGiftCards: true,
      includeAnalytics: false,
      includeErrors: false,
      includeHistoricalData: false,
    },
    performance: {
      batchSize: 100,
      parallelBatches: 1,
      checkpointInterval: 1000,
    },
  },

  development: {
    scenario: 'development',
    timeRange: { months: 3 },
    scale: {
      organizations: 5,
      clients: 20,
      usersPerOrg: 5,
      contactsPerClient: 250,
      listsPerClient: 5,
      campaignsPerClient: 5,
      recipientsPerCampaign: 150,
      giftCardBrands: 15,
      giftCardInventorySize: 2000,
    },
    features: {
      includeCallCenter: true,
      includeGiftCards: true,
      includeAnalytics: true,
      includeErrors: true,
      includeHistoricalData: true,
    },
    performance: {
      batchSize: 500,
      parallelBatches: 2,
      checkpointInterval: 5000,
    },
  },

  analytics: {
    scenario: 'analytics',
    timeRange: { months: 6 },
    scale: {
      organizations: 12,
      clients: 60,
      usersPerOrg: 8,
      contactsPerClient: 1000,
      listsPerClient: 10,
      campaignsPerClient: 8,
      recipientsPerCampaign: 400,
      giftCardBrands: 25,
      giftCardInventorySize: 15000,
    },
    features: {
      includeCallCenter: true,
      includeGiftCards: true,
      includeAnalytics: true,
      includeErrors: true,
      includeHistoricalData: true,
    },
    performance: {
      batchSize: 1000,
      parallelBatches: 3,
      checkpointInterval: 10000,
    },
  },

  load_test: {
    scenario: 'load_test',
    timeRange: { months: 12 },
    scale: {
      organizations: 15,
      clients: 100,
      usersPerOrg: 10,
      contactsPerClient: 2000,
      listsPerClient: 15,
      campaignsPerClient: 10,
      recipientsPerCampaign: 600,
      giftCardBrands: 30,
      giftCardInventorySize: 25000,
    },
    features: {
      includeCallCenter: true,
      includeGiftCards: true,
      includeAnalytics: true,
      includeErrors: true,
      includeHistoricalData: true,
    },
    performance: {
      batchSize: 1000,
      parallelBatches: 5,
      checkpointInterval: 10000,
    },
  },
};

// Industry distribution weights
export const INDUSTRY_DISTRIBUTION = {
  roofing: 0.25,
  rei: 0.15,
  auto_service: 0.20,
  auto_warranty: 0.25,
  auto_buyback: 0.15,
};

// Campaign status distribution
export const CAMPAIGN_STATUS_DISTRIBUTION = {
  completed: 0.60,
  mailed: 0.15,
  in_production: 0.15,
  draft: 0.10,
};

// Lifecycle stage distribution for contacts
export const LIFECYCLE_STAGE_DISTRIBUTION = {
  lead: 0.40,
  mql: 0.20,
  sql: 0.15,
  opportunity: 0.10,
  customer: 0.10,
  evangelist: 0.05,
};

// Event type probabilities
export const EVENT_PROBABILITIES = {
  imb_injected: 0.95,      // 95% of recipients get mailed
  imb_delivered: 0.85,     // 85% of mailed get delivered
  qr_scan: 0.20,          // 20% of delivered scan QR
  purl_visit: 0.28,       // 28% of delivered visit PURL
  form_submitted: 0.12,   // 12% of visitors submit form
  lead_captured: 0.10,    // 10% of form submissions become leads
};

// Call center patterns
export const CALL_CENTER_PATTERNS = {
  businessHours: {
    start: 9,  // 9 AM
    end: 17,   // 5 PM
  },
  peakHours: [10, 11, 14, 15], // Peak call times
  weekdayWeight: 0.8, // 80% of calls on weekdays
  optInRate: 0.68,    // 68% opt-in rate
  matchRate: 0.85,    // 85% successfully matched to recipients
  avgDuration: 240,   // 4 minutes average call duration (seconds)
};

// Gift card redemption patterns
export const GIFT_CARD_PATTERNS = {
  redemptionRates: {
    within7Days: 0.60,
    within30Days: 0.25,
    never: 0.15,
  },
  costMarkup: {
    admin: 0.05,  // Platform takes 5% markup
    agency: 0.03, // Agency takes 3% markup
  },
  popularBrands: ['Amazon', 'Visa', 'Target', 'Walmart', 'Starbucks'],
};

// Time-based patterns
export const TEMPORAL_PATTERNS = {
  // Seasonal campaign trends (multiplier by month)
  seasonalTrends: {
    1: 0.8,   // January - slower post-holiday
    2: 0.9,   // February
    3: 1.0,   // March
    4: 1.1,   // April - spring boost
    5: 1.2,   // May
    6: 0.9,   // June - summer slowdown
    7: 0.8,   // July
    8: 0.9,   // August
    9: 1.1,   // September - back to business
    10: 1.3,  // October - Q4 ramp up
    11: 1.4,  // November - peak
    12: 1.2,  // December - holiday
  },
  // Day of week patterns (0 = Sunday)
  dayOfWeekActivity: {
    0: 0.3,  // Sunday
    1: 1.0,  // Monday
    2: 1.2,  // Tuesday
    3: 1.3,  // Wednesday - peak
    4: 1.2,  // Thursday
    5: 0.9,  // Friday
    6: 0.4,  // Saturday
  },
  // Hour of day patterns (0-23)
  hourOfDayActivity: {
    businessHours: [9, 10, 11, 12, 13, 14, 15, 16, 17],
    peakHours: [10, 14, 15],
    offHours: [0, 1, 2, 3, 4, 5, 6, 7, 8, 18, 19, 20, 21, 22, 23],
  },
};

// Error generation patterns
export const ERROR_PATTERNS = {
  baseErrorRate: 0.001,  // 0.1% error rate normally
  incidentSpikes: [
    { day: 15, multiplier: 10, duration: 2 }, // Spike on day 15, lasts 2 hours
    { day: 45, multiplier: 15, duration: 3 }, // Bigger spike on day 45
  ],
  errorTypes: {
    'api_error': 0.40,
    'database_error': 0.20,
    'validation_error': 0.15,
    'timeout_error': 0.10,
    'auth_error': 0.10,
    'unknown_error': 0.05,
  },
  resolutionRate: 0.95, // 95% of errors get resolved
};

// Performance metric baselines
export const PERFORMANCE_BASELINES = {
  page_load: { min: 50, max: 500, avg: 150 },
  api_response: { min: 20, max: 200, avg: 60 },
  edge_function: { min: 10, max: 100, avg: 35 },
  database_query: { min: 5, max: 50, avg: 15 },
};

// Helper function to get config for scenario
export function getConfigForScenario(scenario: ScenarioType): SeedConfig {
  return { ...SCENARIO_PRESETS[scenario] };
}

// Helper function to calculate total expected records
export function estimateRecordCounts(config: SeedConfig): GenerationStats {
  const totalClients = config.scale.clients;
  const totalCampaigns = totalClients * config.scale.campaignsPerClient;
  const totalRecipients = totalCampaigns * config.scale.recipientsPerCampaign;
  const totalContacts = totalClients * config.scale.contactsPerClient;
  
  return {
    organizations: config.scale.organizations,
    clients: totalClients,
    users: config.scale.organizations * config.scale.usersPerOrg + totalClients * 2, // 2 users per client
    contacts: totalContacts,
    contactLists: totalClients * config.scale.listsPerClient,
    contactListMembers: totalContacts * 1.5, // Average 1.5 list memberships per contact
    campaigns: totalCampaigns,
    recipients: totalRecipients,
    events: totalRecipients * 2.5, // Average 2.5 events per recipient
    callSessions: config.features.includeCallCenter ? totalRecipients * 0.4 : 0,
    smsOptIns: config.features.includeCallCenter ? totalRecipients * 0.25 : 0,
    giftCardBrands: config.scale.giftCardBrands,
    giftCardInventory: config.scale.giftCardInventorySize,
    billingTransactions: config.features.includeGiftCards ? totalRecipients * 0.15 : 0,
    performanceMetrics: config.features.includeAnalytics ? 50000 : 0,
    usageAnalytics: config.features.includeAnalytics ? 25000 : 0,
    errorLogs: config.features.includeErrors ? 1000 : 0,
  };
}

// Helper to distribute items over time range
export function distributeOverTime(
  count: number,
  startDate: Date,
  endDate: Date,
  pattern?: 'linear' | 'seasonal' | 'random'
): Date[] {
  const dates: Date[] = [];
  const timeSpan = endDate.getTime() - startDate.getTime();
  
  for (let i = 0; i < count; i++) {
    let offset: number;
    
    if (pattern === 'seasonal') {
      // Use seasonal trends
      const month = new Date(startDate.getTime() + (timeSpan * Math.random())).getMonth() + 1;
      const seasonalWeight = TEMPORAL_PATTERNS.seasonalTrends[month] || 1.0;
      offset = Math.random() * timeSpan * seasonalWeight;
    } else if (pattern === 'linear') {
      // Evenly distributed
      offset = (timeSpan / count) * i + (Math.random() * (timeSpan / count));
    } else {
      // Random distribution
      offset = Math.random() * timeSpan;
    }
    
    dates.push(new Date(startDate.getTime() + offset));
  }
  
  return dates.sort((a, b) => a.getTime() - b.getTime());
}

