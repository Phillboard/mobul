/**
 * Centralized Configuration for Gift Card Redemption System
 * 
 * All support contacts and company info sourced from environment variables.
 * Configure these in Lovable Cloud → Settings → Secrets
 */

export const config = {
  // Company Information
  companyName: Deno.env.get('COMPANY_NAME') || 'Our Company',
  
  // Customer Support Contacts
  supportPhone: Deno.env.get('SUPPORT_PHONE_NUMBER') || '1-800-SUPPORT',
  supportEmail: Deno.env.get('SUPPORT_EMAIL') || 'support@company.com',
  
  // Alert Configuration
  alerts: {
    slackWebhook: Deno.env.get('ALERT_SLACK_WEBHOOK_URL'),
    emailRecipients: Deno.env.get('ALERT_EMAIL_RECIPIENTS')?.split(',') || [],
  },
  
  // External Service Contacts (for runbooks)
  externalSupport: {
    twilioPhone: '1-888-843-9377', // Real Twilio support number
  }
};

/**
 * User-facing error messages with support contact info
 */
export const ERROR_MESSAGES = {
  INVALID_CODE: "We couldn't find that code. Please double-check and try again.",
  ALREADY_REDEEMED: "Good news! You already claimed this card. Your details are shown below.",
  PENDING_APPROVAL: `Your code is being reviewed. You'll receive a call within 24 hours. Questions? Call ${config.supportPhone}`,
  REJECTED: `This code has been declined. Please contact support at ${config.supportPhone} for assistance.`,
  POOL_EMPTY: `We're temporarily out of gift cards. Our team has been notified. Please try again in 30 minutes or call ${config.supportPhone}`,
  RATE_LIMIT: "Too many attempts. Please wait a few minutes and try again.",
  NETWORK_ERROR: "Connection issue. Your request is being processed - please wait...",
  SMS_FAILED: `Your gift card is ready, but we couldn't send it via text. We'll resend it shortly. Need help? Call ${config.supportPhone}`,
  CAMPAIGN_MISMATCH: "This code is not valid for this campaign.",
  NO_DELIVERY: `No gift card has been approved for this code yet. Please contact ${config.supportPhone}`,
};
