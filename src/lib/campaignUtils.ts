/**
 * Campaign Utility Functions
 * 
 * Shared business logic and helper functions for campaign operations.
 */

import { Campaign, CampaignStatus, PostageClass, MailSize } from "@/types/campaigns";

/**
 * Calculate estimated cost for mailing a campaign
 * 
 * @param campaign - Campaign configuration
 * @param recipientCount - Number of recipients
 * @returns Total estimated cost in cents
 */
export function calculateCampaignCost(
  campaign: Pick<Campaign, 'size' | 'postage'>,
  recipientCount: number
): number {
  // Base postage costs (in cents)
  const postageCosts: Record<PostageClass, number> = {
    first_class: 68, // $0.68
    standard: 42,    // $0.42
  };

  // Size multipliers
  const sizeMultipliers: Record<MailSize, number> = {
    '4x6': 1.0,
    '6x9': 1.3,
    '6x11': 1.5,
    letter: 1.2,
    trifold: 1.4,
  };

  const basePostage = postageCosts[campaign.postage || 'standard'];
  const sizeMultiplier = sizeMultipliers[campaign.size];
  const costPerPiece = Math.round(basePostage * sizeMultiplier);

  return costPerPiece * recipientCount;
}

/**
 * Format campaign cost as currency
 * 
 * @param costInCents - Cost in cents
 * @returns Formatted currency string
 */
export function formatCampaignCost(costInCents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(costInCents / 100);
}

/**
 * Validate if a campaign can be launched
 * 
 * @param campaign - Campaign to validate
 * @returns Validation result with error messages
 */
export function validateCampaignLaunch(campaign: Partial<Campaign>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!campaign.name || campaign.name.trim() === '') {
    errors.push('Campaign name is required');
  }

  if (!campaign.template_id) {
    errors.push('Template must be selected');
  }

  if (!campaign.audience_id) {
    errors.push('Audience must be selected');
  }

  if (!campaign.mail_date) {
    errors.push('Mail date must be set');
  } else {
    const mailDate = new Date(campaign.mail_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (mailDate < today) {
      errors.push('Mail date cannot be in the past');
    }
  }

  if (campaign.lp_mode === 'bridge' && !campaign.landing_page_id && !campaign.base_lp_url) {
    errors.push('Landing page or base URL required for bridge mode');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get status badge variant for a campaign status
 * 
 * @param status - Campaign status
 * @returns Badge variant name
 */
export function getCampaignStatusBadgeVariant(status: CampaignStatus): 
  'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'draft':
      return 'outline';
    case 'scheduled':
      return 'secondary';
    case 'in_progress':
      return 'default';
    case 'completed':
      return 'secondary';
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
}

/**
 * Get human-readable status label
 * 
 * @param status - Campaign status
 * @returns Display label
 */
export function getCampaignStatusLabel(status: CampaignStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'scheduled':
      return 'Scheduled';
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

/**
 * Calculate days until mail date
 * 
 * @param mailDate - Mail date string
 * @returns Number of days (negative if past)
 */
export function getDaysUntilMailDate(mailDate: string): number {
  const mail = new Date(mailDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  mail.setHours(0, 0, 0, 0);
  
  const diffTime = mail.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Format mail date with relative time
 * 
 * @param mailDate - Mail date string
 * @returns Formatted date with relative context
 */
export function formatMailDate(mailDate: string): string {
  const date = new Date(mailDate);
  const days = getDaysUntilMailDate(mailDate);
  
  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (days === 0) {
    return `${formatted} (Today)`;
  } else if (days === 1) {
    return `${formatted} (Tomorrow)`;
  } else if (days > 0 && days <= 7) {
    return `${formatted} (In ${days} days)`;
  } else if (days < 0 && days >= -7) {
    return `${formatted} (${Math.abs(days)} days ago)`;
  }

  return formatted;
}

/**
 * Generate unique campaign name
 * 
 * @param baseName - Base name for campaign
 * @param existingNames - Array of existing campaign names
 * @returns Unique campaign name
 */
export function generateUniqueCampaignName(baseName: string, existingNames: string[]): string {
  let name = baseName;
  let counter = 1;

  while (existingNames.includes(name)) {
    name = `${baseName} (${counter})`;
    counter++;
  }

  return name;
}
