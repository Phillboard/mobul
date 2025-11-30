/**
 * Demo Data Generation System Types
 * Comprehensive type definitions for bulletproof demo data generation
 */

export type GenerationStatus = 'pending' | 'in_progress' | 'completed' | 'error' | 'rolling_back';
export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'error' | 'skipped';

export interface GenerationStep {
  id: string;
  label: string;
  status: StepStatus;
  progress: number; // 0-100
  details?: string;
  errorMessage?: string;
  startTime?: Date;
  endTime?: Date;
  recordsCreated?: number;
  recordsExpected?: number;
}

export interface GenerationProgress {
  steps: GenerationStep[];
  currentStep: number;
  overallProgress: number;
  timeElapsed: number;
  estimatedTimeRemaining: number;
  status: GenerationStatus;
}

export type ProgressCallback = (progress: GenerationProgress) => void;

export interface CallOutcomeDistribution {
  notCalled: number;
  smsSent: number;
  smsOptedIn: number;
  redeemed: number;
  declined?: number;
}

export interface DemoScenarioDefaults {
  clientName: string;
  campaignName: string;
  campaignType: string;
  recipientCount: number;
  giftCardBrand: string;
  giftCardValue: number;
  inventorySize: number;
  outcomes: CallOutcomeDistribution;
  codePrefix: string;
}

export interface DemoTemplate {
  id: string;
  name: string;
  description: string;
  industry: string;
  icon?: string;
  defaults: DemoScenarioDefaults;
}

export interface DemoConfig {
  // Client Configuration
  clientName: string;
  industry: string;
  organizationId?: string; // Use existing org or create new
  
  // Campaign Configuration
  campaignName: string;
  campaignType: string;
  mailDate: string;
  
  // Recipient Configuration
  recipientCount: number;
  codePrefix: string;
  outcomes: CallOutcomeDistribution;
  
  // Gift Card Configuration
  giftCardBrand: string;
  giftCardValue: number;
  inventorySize: number;
  useExistingPool?: boolean;
  existingPoolId?: string;
  
  // Template Selection
  templateId?: string;
}

export interface CreatedRecord {
  type: string;
  id: string;
  name?: string;
  data?: any;
}

export interface RecipientTestCode {
  code: string;
  firstName: string;
  lastName: string;
  status: string;
  smsStatus?: 'not_sent' | 'sent' | 'opted_in';
  isRedeemed?: boolean;
}

export interface DemoGenerationResult {
  success: boolean;
  clientId: string;
  clientName: string;
  campaignId: string;
  campaignName: string;
  records: {
    organizations: number;
    clients: number;
    giftCardPools: number;
    giftCards: number;
    campaigns: number;
    campaignConditions: number;
    rewardConfigs: number;
    audiences: number;
    recipients: number;
    callSessions: number;
    smsOptIns: number;
    events: number;
  };
  testCodes: RecipientTestCode[];
  createdRecords: CreatedRecord[];
  timeElapsed: number;
  errors?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ExistingDataCheck {
  hasOrganization: boolean;
  hasClients: boolean;
  hasCampaigns: boolean;
  hasGiftCardPools: boolean;
  organizationId?: string;
  clientCount: number;
  campaignCount: number;
}

export interface RollbackLog {
  timestamp: Date;
  recordType: string;
  recordId: string;
  action: 'deleted' | 'reverted' | 'failed';
  error?: string;
}

export interface DemoGeneratorState {
  config: DemoConfig | null;
  progress: GenerationProgress;
  result: DemoGenerationResult | null;
  error: Error | null;
  isGenerating: boolean;
  isRollingBack: boolean;
}

