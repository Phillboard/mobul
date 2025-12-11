/**
 * Demo Data Generation Validators
 * Pre-flight checks and validation logic for safe data generation
 */

import { supabase } from '@core/services/supabase';
import type { DemoConfig, ValidationResult, ExistingDataCheck } from '@/types/demo';

/**
 * Validate environment is safe for demo data generation
 */
export async function validateEnvironment(): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check 1: Database connection
  try {
    const { error } = await supabase.from('clients').select('count').limit(1);
    if (error) {
      errors.push('Database connection failed. Please check your Supabase connection.');
    }
  } catch (err) {
    errors.push('Cannot connect to database.');
  }

  // Check 2: User authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    errors.push('User not authenticated. Please log in.');
  }

  // Check 3: User permissions (check if user has admin role)
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile?.role !== 'admin') {
      errors.push('Only administrators can generate demo data.');
    }
  }

  // Check 4: Production environment warning
  const hostname = window.location.hostname;
  if (hostname.includes('production') || hostname.includes('app.')) {
    warnings.push('⚠️ This appears to be a production environment. Demo data generation is not recommended.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate demo configuration before generation
 */
export function validateConfig(config: DemoConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Client validation
  if (!config.clientName || config.clientName.trim().length === 0) {
    errors.push('Client name is required.');
  }
  if (config.clientName.length > 100) {
    errors.push('Client name is too long (max 100 characters).');
  }

  if (!config.industry || config.industry.trim().length === 0) {
    errors.push('Industry is required.');
  }

  // Campaign validation
  if (!config.campaignName || config.campaignName.trim().length === 0) {
    errors.push('Campaign name is required.');
  }
  if (!config.campaignType) {
    errors.push('Campaign type is required.');
  }
  if (!config.mailDate) {
    errors.push('Mail date is required.');
  } else {
    const mailDate = new Date(config.mailDate);
    const today = new Date();
    if (mailDate < new Date(today.setDate(today.getDate() - 365))) {
      warnings.push('Mail date is more than a year in the past.');
    }
  }

  // Recipient validation
  if (!config.recipientCount || config.recipientCount < 1) {
    errors.push('Recipient count must be at least 1.');
  }
  if (config.recipientCount > 100) {
    warnings.push('Generating more than 100 recipients may take several minutes.');
  }

  // Code prefix validation
  if (!config.codePrefix) {
    errors.push('Code prefix is required.');
  } else if (config.codePrefix.length > 10) {
    errors.push('Code prefix is too long (max 10 characters).');
  } else if (!/^[A-Z0-9]+$/.test(config.codePrefix)) {
    errors.push('Code prefix must contain only uppercase letters and numbers.');
  }

  // Outcomes validation
  const totalOutcomes = Object.values(config.outcomes).reduce((sum, val) => sum + val, 0);
  if (totalOutcomes !== config.recipientCount) {
    errors.push(`Call outcomes distribution (${totalOutcomes}) doesn't match recipient count (${config.recipientCount}).`);
  }

  if (config.outcomes.notCalled < 0 || config.outcomes.smsSent < 0 || 
      config.outcomes.smsOptedIn < 0 || config.outcomes.redeemed < 0) {
    errors.push('Call outcome counts cannot be negative.');
  }

  // Gift card validation
  if (!config.giftCardBrand) {
    errors.push('Gift card brand is required.');
  }
  if (!config.giftCardValue || config.giftCardValue <= 0) {
    errors.push('Gift card value must be greater than 0.');
  }
  if (config.giftCardValue > 1000) {
    warnings.push('Gift card value over $1000 is unusually high.');
  }
  if (!config.inventorySize || config.inventorySize < config.recipientCount) {
    errors.push(`Inventory size (${config.inventorySize}) must be at least equal to recipient count (${config.recipientCount}).`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Check for existing data that might conflict
 */
export async function checkExistingData(clientName: string): Promise<ExistingDataCheck> {
  // Check for existing client with same name
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('name', clientName)
    .maybeSingle();

  if (existingClient) {
    throw new Error(`A client named "${clientName}" already exists. Please choose a different name or delete the existing client first.`);
  }

  // Check organization
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id')
    .limit(1);

  // Get counts
  const { count: clientCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true });

  const { count: campaignCount } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true });

  return {
    hasOrganization: (orgs?.length || 0) > 0,
    hasClients: (clientCount || 0) > 0,
    hasCampaigns: (campaignCount || 0) > 0,
    hasGiftCardPools: false, // Will check during generation
    organizationId: orgs?.[0]?.id,
    clientCount: clientCount || 0,
    campaignCount: campaignCount || 0
  };
}

/**
 * Validate data integrity after generation
 */
export async function validateGeneratedData(
  clientId: string,
  campaignId: string,
  expectedCounts: {
    recipients: number;
    callSessions: number;
    smsOptIns: number;
  }
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Verify client exists
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', clientId)
    .single();

  if (clientError || !client) {
    errors.push('Client not found after generation.');
  }

  // Verify campaign exists and is linked correctly
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, name, client_id')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) {
    errors.push('Campaign not found after generation.');
  } else if (campaign.client_id !== clientId) {
    errors.push('Campaign is not properly linked to client.');
  }

  // Verify recipients count
  const { count: recipientCount } = await supabase
    .from('recipients')
    .select('*', { count: 'exact', head: true })
    .eq('audiences.campaigns.id', campaignId);

  if (recipientCount !== expectedCounts.recipients) {
    errors.push(`Expected ${expectedCounts.recipients} recipients, found ${recipientCount || 0}.`);
  }

  // Verify call sessions
  const { count: sessionCount } = await supabase
    .from('call_sessions')
    .select('*', { count: 'exact', head: true });

  if (sessionCount !== expectedCounts.callSessions) {
    warnings.push(`Expected ${expectedCounts.callSessions} call sessions, found ${sessionCount || 0}.`);
  }

  // Verify SMS opt-ins
  const { count: smsCount } = await supabase
    .from('sms_opt_ins')
    .select('*', { count: 'exact', head: true });

  if (smsCount !== expectedCounts.smsOptIns) {
    warnings.push(`Expected ${expectedCounts.smsOptIns} SMS opt-ins, found ${smsCount || 0}.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

